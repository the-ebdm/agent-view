/**
 * Agent Execution Manager
 *
 * Manages background agent execution and message broadcasting to multiple subscribers.
 * Implements pub/sub pattern for agent output streaming.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { streamAgentMessages } from './agent-sdk/stream-handler';
import { getToolsForPreset } from './tool-permissions';
import { sessionManager } from './agent-session-manager';
import type { AgentMessage, ToolPermission } from '@/types/agent';

interface SpawnParams {
  prompt: string;
  directory: string;
  toolPermissions?: ToolPermission;
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

  // Configuration
  private readonly MAX_BUFFER_SIZE = 100; // messages per agent
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
      // Gracefully close generator
      if (generator.return) {
        await generator.return();
      }

      // Broadcast stop message to subscribers
      this.broadcastMessage(id, {
        type: 'system',
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

      // Create query generator
      const generator = query({
        prompt: params.prompt,
        options: {
          cwd: params.directory,
          allowedTools,
        },
      });

      // Store generator
      this.activeExecutions.set(id, generator);

      // Stream messages
      for await (const message of streamAgentMessages(generator)) {
        // Broadcast to subscribers
        this.broadcastMessage(id, message);

        // Add to session manager for persistence
        sessionManager.addMessage(id, message);

        // Check for completion
        if (message.type === 'error' || message.type === 'result') {
          break;
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
