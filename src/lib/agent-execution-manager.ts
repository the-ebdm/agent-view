/**
 * Agent Execution Manager
 *
 * Manages background agent execution and message broadcasting to multiple subscribers.
 * Implements pub/sub pattern for agent output streaming.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { streamAgentMessages } from './agent-sdk/stream-handler';
import { resumeAgent, forkAgent } from './agent-sdk/client';
import { getToolsForPreset } from './tool-permissions';
import { sessionManager } from './agent-session-manager';
import { getMessagesRepository, isPersistenceEnabled } from './database';
import type { AgentMessage, ToolPermission } from '@/types/agent';

interface SpawnParams {
  prompt: string;
  directory: string;
  toolPermissions?: ToolPermission;
  resumeFromSessionId?: string; // SDK session ID to resume from
  forkFromSessionId?: string; // SDK session ID to fork from
}

/**
 * Agent Execution Manager
 *
 * Centralized registry for running agent executions. Handles:
 * - Starting agent query generators in background
 * - Broadcasting messages to multiple stream subscribers
 * - Buffering messages for late subscribers
 * - Cleanup on agent completion
 */
class AgentExecutionManager {
  // Running query generators (one per agent)
  private activeExecutions: Map<string, AsyncGenerator> = new Map();

  // Message buffers for late subscribers (last N messages per agent)
  private messageBuffers: Map<string, AgentMessage[]> = new Map();

  // Active stream subscriptions (agent ID → Set of controllers)
  private subscribers: Map<string, Set<ReadableStreamDefaultController>> = new Map();

  // Execution promises for cleanup tracking
  private executionPromises: Map<string, Promise<void>> = new Map();

  // Approval callbacks for permission requests
  private approvalCallbacks: Map<string, {
    resolve: (approved: boolean) => void;
    timestamp: number;
  }> = new Map();

  // Configuration
  private readonly MAX_BUFFER_SIZE = 1000; // messages per agent (both in-memory and DB queries)
  private readonly MAX_CONCURRENT_AGENTS = 20;
  private readonly CLEANUP_DELAY = 5 * 60 * 1000; // 5 minutes

  /**
   * Start agent execution in background
   *
   * @param id - Agent ID
   * @param params - Spawn parameters (prompt, directory, permissions)
   */
  async startAgent(id: string, params: SpawnParams): Promise<void> {
    // Enforce concurrent agent limit
    if (this.activeExecutions.size >= this.MAX_CONCURRENT_AGENTS) {
      throw new Error('Maximum concurrent agents reached (limit: 20)');
    }

    // Prevent duplicate starts
    if (this.activeExecutions.has(id)) {
      console.warn(`[ExecutionManager] Agent ${id} already running`);
      return;
    }

    console.log(`[ExecutionManager] Starting agent ${id}`);

    // Start background execution (don't await)
    const executionPromise = this.runAgent(id, params);
    this.executionPromises.set(id, executionPromise);

    // Handle execution completion/errors in background
    executionPromise
      .catch((error) => {
        console.error(`[ExecutionManager] Agent ${id} execution error:`, error);
      })
      .finally(() => {
        console.log(`[ExecutionManager] Agent ${id} execution completed`);
      });
  }

  /**
   * Subscribe stream controller to agent's message broadcast
   *
   * @param id - Agent ID
   * @param controller - ReadableStream controller
   */
  subscribe(id: string, controller: ReadableStreamDefaultController): void {
    let subs = this.subscribers.get(id);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(id, subs);
    }

    subs.add(controller);
    console.log(`[ExecutionManager] Subscriber added for agent ${id} (total: ${subs.size})`);
  }

  /**
   * Unsubscribe stream controller from agent's broadcast
   *
   * @param id - Agent ID
   * @param controller - ReadableStream controller
   */
  unsubscribe(id: string, controller: ReadableStreamDefaultController): void {
    const subs = this.subscribers.get(id);
    if (subs) {
      subs.delete(controller);
      console.log(`[ExecutionManager] Subscriber removed for agent ${id} (remaining: ${subs.size})`);

      // Clean up empty subscriber sets
      if (subs.size === 0) {
        this.subscribers.delete(id);
      }
    }
  }

  /**
   * Get buffered messages for late subscribers
   *
   * @param id - Agent ID
   * @returns Array of buffered messages
   */
  getBufferedMessages(id: string): AgentMessage[] {
    // Try loading from database first if persistence is enabled
    if (isPersistenceEnabled()) {
      try {
        const messagesRepo = getMessagesRepository();
        const messages = messagesRepo.findRecentByAgentId(id, this.MAX_BUFFER_SIZE);
        if (messages.length > 0) {
          return messages;
        }
      } catch (error) {
        console.error('[ExecutionManager] Failed to load messages from database:', error);
        // Fall through to in-memory buffer
      }
    }

    // Fall back to in-memory buffer
    return this.messageBuffers.get(id) || [];
  }

  /**
   * Check if agent execution exists
   *
   * @param id - Agent ID
   * @returns True if agent is running
   */
  hasAgent(id: string): boolean {
    return this.activeExecutions.has(id);
  }

  /**
   * Stop agent execution gracefully
   *
   * @param id - Agent ID
   */
  async stopAgent(id: string): Promise<void> {
    const generator = this.activeExecutions.get(id);
    if (!generator) {
      console.warn(`[ExecutionManager] Cannot stop agent ${id}: not found`);
      return;
    }

    console.log(`[ExecutionManager] Stopping agent ${id}`);

    try {
      // Auto-deny all pending approvals for this agent
      const pendingApprovals = Array.from(this.approvalCallbacks.entries())
        .filter(([approvalId]) => approvalId.startsWith(`approval_`));

      if (pendingApprovals.length > 0) {
        console.log(`[ExecutionManager] Auto-denying ${pendingApprovals.length} pending approval callbacks for agent ${id}`);
        pendingApprovals.forEach(([approvalId]) => {
          this.resolveApproval(approvalId, false);
        });
      }

      // Gracefully close generator
      if (generator.return) {
        await generator.return();
      }

      // Broadcast stop message to subscribers
      this.broadcastMessage(id, {
        type: 'result',
        content: 'Agent stopped by user',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[ExecutionManager] Error stopping agent ${id}:`, error);
    } finally {
      // Clean up immediately
      this.activeExecutions.delete(id);
      this.executionPromises.delete(id);

      // Clean up subscribers and buffer after delay
      setTimeout(() => {
        this.messageBuffers.delete(id);
        this.subscribers.delete(id);
        console.log(`[ExecutionManager] Cleaned up resources for stopped agent ${id}`);
      }, this.CLEANUP_DELAY);
    }
  }

  /**
   * Run agent execution in background
   *
   * @param id - Agent ID
   * @param params - Spawn parameters
   */
  private async runAgent(id: string, params: SpawnParams): Promise<void> {
    try {
      // Get allowed tools from permissions
      let allowedTools: string[] | undefined;
      if (params.toolPermissions) {
        allowedTools = params.toolPermissions.preset === 'custom'
          ? params.toolPermissions.tools
          : getToolsForPreset(params.toolPermissions.preset);
      }

      // Create canUseTool callback for approval handling
      const canUseTool = async (toolName: string, input: Record<string, unknown>) => {
        // Check if tool is in allowed list
        const isAllowed = !allowedTools || allowedTools.includes(toolName);

        if (isAllowed) {
          // Tool is allowed, no approval needed
          return { behavior: "allow" as const, updatedInput: input };
        }

        // Tool requires approval - create pending approval
        const description = this.generateDescription(toolName, input);
        const approvalId = sessionManager.addPendingApproval(
          id,
          toolName as any, // ToolName type from types/agent.ts
          description,
          input
        );

        console.log(`[ExecutionManager] Tool ${toolName} requires approval for agent ${id}`);

        // Wait for user approval
        const approved = await this.waitForApproval(approvalId);

        if (approved) {
          console.log(`[ExecutionManager] Tool ${toolName} approved for agent ${id}`);
          return { behavior: "allow" as const, updatedInput: input };
        } else {
          console.log(`[ExecutionManager] Tool ${toolName} denied for agent ${id}`);
          return {
            behavior: "deny" as const,
            message: `User denied permission to use ${toolName}`
          };
        }
      };

      // Create query generator based on session resumption mode
      let generator: AsyncGenerator;

      if (params.forkFromSessionId) {
        // Fork from existing session
        console.log(`[ExecutionManager] Forking agent ${id} from session ${params.forkFromSessionId}`);
        generator = forkAgent(
          params.forkFromSessionId,
          params.prompt,
          params.directory,
          params.toolPermissions,
          canUseTool // Pass approval callback
        );
      } else if (params.resumeFromSessionId) {
        // Resume existing session
        console.log(`[ExecutionManager] Resuming agent ${id} from session ${params.resumeFromSessionId}`);
        generator = resumeAgent(
          params.resumeFromSessionId,
          params.prompt,
          params.directory,
          params.toolPermissions,
          canUseTool // Pass approval callback
        );
      } else {
        // Create new session
        generator = query({
          prompt: params.prompt,
          options: {
            cwd: params.directory,
            allowedTools,
            canUseTool,
          },
        });
      }

      // Store generator
      this.activeExecutions.set(id, generator);

      // Stream messages
      for await (const streamYield of streamAgentMessages(generator)) {
        if (streamYield.type === 'metadata') {
          // Extract and store session_id
          const { sessionId } = streamYield.data;
          if (sessionId) {
            console.log(`[ExecutionManager] Captured session_id for agent ${id}:`, sessionId);
            sessionManager.updateSessionId(id, sessionId);
          }
        } else if (streamYield.type === 'message') {
          const message = streamYield.data;

          // Broadcast to subscribers
          this.broadcastMessage(id, message);

          // Add to session manager for persistence
          sessionManager.addMessage(id, message);

          // Check for completion
          if (message.type === 'error' || message.type === 'result') {
            break;
          }
        }
      }

      console.log(`[ExecutionManager] Agent ${id} completed successfully`);
    } catch (error) {
      console.error(`[ExecutionManager] Agent ${id} execution error:`, error);

      // Broadcast error message
      const errorMessage: AgentMessage = {
        type: 'error',
        content: error instanceof Error ? error.message : 'Execution error',
        timestamp: Date.now(),
      };

      this.broadcastMessage(id, errorMessage);
      sessionManager.addMessage(id, errorMessage);
    } finally {
      // Clean up
      this.activeExecutions.delete(id);
      this.executionPromises.delete(id);

      // Keep buffer for late subscribers (delay cleanup)
      setTimeout(() => {
        this.messageBuffers.delete(id);
        this.subscribers.delete(id);
        console.log(`[ExecutionManager] Cleaned up resources for completed agent ${id}`);
      }, this.CLEANUP_DELAY);
    }
  }

  /**
   * Broadcast message to all active subscribers
   *
   * @param id - Agent ID
   * @param message - Message to broadcast
   */
  private broadcastMessage(id: string, message: AgentMessage): void {
    // Add to buffer (ring buffer, FIFO)
    this.addToBuffer(id, message);

    // Persist to database
    if (isPersistenceEnabled()) {
      try {
        const messagesRepo = getMessagesRepository();
        messagesRepo.create({
          agentId: id,
          ...message,
        });
      } catch (error) {
        console.error('[ExecutionManager] Failed to persist message to database:', error);
        // Continue - graceful degradation
      }
    }

    // Send to all subscribers
    const subs = this.subscribers.get(id);
    if (!subs || subs.size === 0) {
      return; // No subscribers, message buffered only
    }

    const encoder = new TextEncoder();
    const data = `data: ${JSON.stringify(message)}\n\n`;
    const encoded = encoder.encode(data);

    const failedControllers: Set<ReadableStreamDefaultController> = new Set();

    subs.forEach((controller) => {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        // Controller closed or errored
        console.warn(`[ExecutionManager] Failed to send to subscriber for agent ${id}`, error);
        failedControllers.add(controller);
      }
    });

    // Remove failed subscribers
    failedControllers.forEach((controller) => {
      subs.delete(controller);
    });

    if (failedControllers.size > 0) {
      console.log(`[ExecutionManager] Removed ${failedControllers.size} failed subscribers for agent ${id}`);
    }
  }

  /**
   * Add message to buffer (ring buffer, max size)
   *
   * @param id - Agent ID
   * @param message - Message to buffer
   */
  private addToBuffer(id: string, message: AgentMessage): void {
    let buffer = this.messageBuffers.get(id);
    if (!buffer) {
      buffer = [];
      this.messageBuffers.set(id, buffer);
    }

    buffer.push(message);

    // Ring buffer: remove oldest if over limit
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.shift();
    }
  }

  /**
   * Wait for user approval of a tool permission request
   *
   * @param approvalId - Approval request ID
   * @returns Promise that resolves to true (approved) or false (denied)
   */
  private waitForApproval(approvalId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.approvalCallbacks.set(approvalId, {
        resolve,
        timestamp: Date.now(),
      });

      console.log(`[ExecutionManager] Waiting for approval ${approvalId}`);
    });
  }

  /**
   * Resolve a pending approval request
   *
   * @param approvalId - Approval request ID
   * @param approved - Whether the request was approved
   */
  resolveApproval(approvalId: string, approved: boolean): void {
    const callback = this.approvalCallbacks.get(approvalId);
    if (!callback) {
      console.warn(`[ExecutionManager] No callback found for approval ${approvalId}`);
      return;
    }

    console.log(`[ExecutionManager] Resolving approval ${approvalId}: ${approved ? 'approved' : 'denied'}`);

    callback.resolve(approved);
    this.approvalCallbacks.delete(approvalId);
  }

  /**
   * Generate human-readable description for tool approval request
   *
   * @param toolName - Name of the tool being requested
   * @param input - Tool input parameters
   * @returns Description string
   */
  private generateDescription(toolName: string, input: Record<string, unknown>): string {
    switch (toolName) {
      case 'Write':
        return `Write to file: ${input.file_path || 'unknown'}`;
      case 'Edit':
        return `Edit file: ${input.file_path || 'unknown'}`;
      case 'Bash':
        return `Execute command: ${input.command || 'unknown'}`;
      case 'Task':
        return `Launch agent task: ${input.description || 'unknown'}`;
      case 'SlashCommand':
        return `Run slash command: ${input.command || 'unknown'}`;
      default:
        return `Use tool: ${toolName}`;
    }
  }
}

// Singleton instance with hot-reload preservation
const globalForExecutionManager = globalThis as unknown as {
  executionManager: AgentExecutionManager | undefined;
};

export const executionManager = globalForExecutionManager.executionManager ?? new AgentExecutionManager();

// Preserve singleton across hot reloads in development
if (process.env.NODE_ENV !== 'production') {
  globalForExecutionManager.executionManager = executionManager;
}
