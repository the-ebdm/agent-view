import type { AgentSession, AgentMessage, AgentStatus, AgentHistoryItem, ToolPermission, AgentMetrics, AgentLifecycleState, PendingApproval, ToolName } from '@/types/agent';
import { generateAgentName, validateAgentName, ensureUniqueName } from './agent-names';
import { getDefaultToolPermission, validateToolPermission } from './tool-permissions';
import { getAgentsRepository, isPersistenceEnabled } from './database';
import { discoverProject } from './services/project-discovery';
import { executionManager } from './agent-execution-manager';

class AgentSessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private history: AgentHistoryItem[] = [];
  // Phase 2: Remove single-agent enforcement
  private activeAgents: Map<string, AgentSession> = new Map(); // Track concurrent agents
  private readonly MAX_HISTORY = 10;

  /**
   * Phase 2: Create session with multi-agent support
   * No longer terminates existing agents
   * Now includes automatic project and worktree discovery
   */
  async createSession(
    id: string,
    prompt: string,
    directory: string,
    name?: string,
    toolPermissions?: ToolPermission
  ): Promise<AgentSession> {
    // Phase 2: Generate or validate agent name
    let agentName = name || generateAgentName();

    if (name) {
      const validation = validateAgentName(name);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    // Ensure name uniqueness
    const existingNames = new Set(
      Array.from(this.activeAgents.values()).map(s => s.name)
    );
    agentName = ensureUniqueName(agentName, existingNames);

    // Phase 2: Validate and apply tool permissions
    const permissions = toolPermissions || getDefaultToolPermission();
    const permValidation = validateToolPermission(permissions);
    if (!permValidation.valid) {
      throw new Error(permValidation.error);
    }

    // Auto-discover project and worktree
    let projectId: string | undefined;
    let worktreeId: string | undefined;

    if (isPersistenceEnabled()) {
      try {
        const discovery = await discoverProject(directory);
        projectId = discovery.project.id;
        worktreeId = discovery.worktree?.id;

        console.log(`[AgentSessionManager] Discovered project: ${discovery.project.name} (${projectId})`);
        if (discovery.worktree) {
          console.log(`[AgentSessionManager] Discovered worktree: ${discovery.worktree.name} (${worktreeId})`);
        }
      } catch (error) {
        console.error('[AgentSessionManager] Failed to discover project:', error);
        // Continue without project association
      }
    }

    const session: AgentSession = {
      id,
      name: agentName,
      prompt,
      directory,
      status: 'running',
      lifecycleState: 'running', // Phase 2
      toolPermissions: permissions, // Phase 2
      projectId,
      worktreeId,
      startTime: Date.now(),
      messages: [],
    };

    this.sessions.set(id, session);
    this.activeAgents.set(id, session); // Phase 2: Track in active agents

    // Persist to database
    if (isPersistenceEnabled()) {
      try {
        const agentsRepo = getAgentsRepository();
        agentsRepo.create(session);
      } catch (error) {
        console.error('[AgentSessionManager] Failed to persist session to database:', error);
        // Continue - graceful degradation
      }
    }

    return session;
  }

  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Phase 2: Get all active agents (running or paused)
   */
  getAllActiveAgents(): AgentSession[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Phase 2: Get agent metrics
   */
  getAgentMetrics(id: string): AgentMetrics | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const now = Date.now();
    const elapsedTime = session.endTime
      ? session.endTime - session.startTime
      : now - session.startTime;

    return {
      elapsedTime,
      messageCount: session.messages.length,
      lastActivityTime: session.messages.length > 0
        ? session.messages[session.messages.length - 1].timestamp
        : session.startTime
    };
  }

  /**
   * Phase 2: Pause agent execution
   */
  pauseAgent(id: string): void {
    const session = this.activeAgents.get(id);
    if (!session) {
      throw new Error('Agent not found or not active');
    }

    if (session.lifecycleState !== 'running') {
      throw new Error(`Cannot pause agent in state: ${session.lifecycleState}`);
    }

    session.lifecycleState = 'paused';
    session.pausedTime = Date.now();

    // Persist to database
    if (isPersistenceEnabled()) {
      try {
        const agentsRepo = getAgentsRepository();
        agentsRepo.update(id, {
          lifecycleState: 'paused',
          pausedTime: session.pausedTime,
        } as Partial<AgentSession>);
      } catch (error) {
        console.error('[AgentSessionManager] Failed to persist pause to database:', error);
      }
    }
  }

  /**
   * Phase 2: Resume paused agent
   */
  resumeAgent(id: string): void {
    const session = this.activeAgents.get(id);
    if (!session) {
      throw new Error('Agent not found or not active');
    }

    if (session.lifecycleState !== 'paused') {
      throw new Error(`Cannot resume agent in state: ${session.lifecycleState}`);
    }

    session.lifecycleState = 'running';
    session.pausedTime = undefined;

    // Persist to database
    if (isPersistenceEnabled()) {
      try {
        const agentsRepo = getAgentsRepository();
        agentsRepo.update(id, {
          lifecycleState: 'running',
          pausedTime: null,
        } as Partial<AgentSession>);
      } catch (error) {
        console.error('[AgentSessionManager] Failed to persist resume to database:', error);
      }
    }
  }

  /**
   * Phase 2: Stop agent (graceful shutdown)
   */
  stopAgent(id: string): void {
    const session = this.activeAgents.get(id);
    if (!session) {
      throw new Error('Agent not found or not active');
    }

    // Auto-deny all pending approvals for this agent
    if (session.pendingApprovals && session.pendingApprovals.length > 0) {
      console.log(`[SessionManager] Auto-denying ${session.pendingApprovals.length} pending approvals for agent ${id}`);
      session.pendingApprovals.forEach(approval => {
        executionManager.resolveApproval(approval.id, false);
      });
      session.pendingApprovals = [];
    }

    session.lifecycleState = 'stopped';
    session.status = 'interrupted';
    session.endTime = Date.now();
    this.moveToHistory(id);

    // Persist to database
    if (isPersistenceEnabled()) {
      try {
        const agentsRepo = getAgentsRepository();
        agentsRepo.update(id, {
          lifecycleState: 'stopped',
          status: 'interrupted',
          endTime: session.endTime,
        } as Partial<AgentSession>);
      } catch (error) {
        console.error('[AgentSessionManager] Failed to persist stop to database:', error);
      }
    }
  }

  /**
   * Phase 2: Rename agent
   */
  renameAgent(id: string, newName: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error('Agent not found');
    }

    const validation = validateAgentName(newName);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check uniqueness among active agents (excluding current agent)
    const existingNames = new Set(
      Array.from(this.activeAgents.values())
        .filter(s => s.id !== id)
        .map(s => s.name)
    );

    if (existingNames.has(newName)) {
      throw new Error('Agent name already in use');
    }

    session.name = newName;

    // Persist to database
    if (isPersistenceEnabled()) {
      try {
        const agentsRepo = getAgentsRepository();
        agentsRepo.update(id, { name: newName } as Partial<AgentSession>);
      } catch (error) {
        console.error('[AgentSessionManager] Failed to persist rename to database:', error);
      }
    }
  }

  // Deprecated: Kept for backward compatibility but no longer enforces single agent
  getCurrentSession(): AgentSession | null {
    // Return the most recently created active agent
    const activeAgentsList = this.getAllActiveAgents();
    if (activeAgentsList.length === 0) return null;
    return activeAgentsList[activeAgentsList.length - 1];
  }

  addMessage(id: string, message: AgentMessage): void {
    const session = this.sessions.get(id);
    if (session) {
      session.messages.push(message);

      // Update status based on message type
      if (message.type === 'error') {
        session.status = 'error';
        session.lifecycleState = 'error'; // Phase 2
        session.endTime = Date.now();
        this.moveToHistory(id);
      } else if (message.type === 'result') {
        session.status = 'completed';
        session.lifecycleState = 'stopped'; // Phase 2
        session.endTime = Date.now();
        this.moveToHistory(id);
      }

      // Persist status changes to database
      if (isPersistenceEnabled() && (message.type === 'error' || message.type === 'result')) {
        try {
          const agentsRepo = getAgentsRepository();
          agentsRepo.update(id, {
            status: session.status,
            lifecycleState: session.lifecycleState,
            endTime: session.endTime,
          } as Partial<AgentSession>);
        } catch (error) {
          console.error('[AgentSessionManager] Failed to persist status change to database:', error);
        }
      }
    }
  }

  updateStatus(id: string, status: AgentStatus): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'error' || status === 'interrupted') {
        session.endTime = Date.now();
        this.moveToHistory(id);
      }
    }
  }

  // Deprecated in Phase 2: Use stopAgent instead
  terminateSession(id: string): void {
    this.stopAgent(id);
  }

  private moveToHistory(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    // Phase 2: Remove from active agents
    this.activeAgents.delete(id);

    // Check if already in history to prevent duplicates
    const existingIndex = this.history.findIndex(item => item.id === id);
    if (existingIndex !== -1) {
      // Update existing history item
      this.history[existingIndex] = {
        id: session.id,
        name: session.name, // Phase 2
        prompt: session.prompt,
        directory: session.directory,
        status: session.status,
        toolPermissions: session.toolPermissions, // Phase 2
        startTime: session.startTime,
        endTime: session.endTime,
        messageCount: session.messages.length,
      };
      return;
    }

    const historyItem: AgentHistoryItem = {
      id: session.id,
      name: session.name, // Phase 2
      prompt: session.prompt,
      directory: session.directory,
      status: session.status,
      toolPermissions: session.toolPermissions, // Phase 2
      startTime: session.startTime,
      endTime: session.endTime,
      messageCount: session.messages.length,
    };

    // Add to beginning of history
    this.history.unshift(historyItem);

    // Keep only last 10
    if (this.history.length > this.MAX_HISTORY) {
      const removedItem = this.history.pop();
      // Remove the session from memory if it's no longer in history
      if (removedItem) {
        this.sessions.delete(removedItem.id);
      }
    }
  }

  getHistory(): AgentHistoryItem[] {
    return [...this.history];
  }

  getHistoricalSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Add a pending approval request for an agent
   */
  addPendingApproval(
    agentId: string,
    toolName: ToolName,
    description: string,
    params: Record<string, unknown>
  ): string {
    const session = this.sessions.get(agentId);
    if (!session) {
      throw new Error('Agent not found');
    }

    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const approval: PendingApproval = {
      id: approvalId,
      toolName,
      description,
      params,
      timestamp: Date.now(),
    };

    if (!session.pendingApprovals) {
      session.pendingApprovals = [];
    }

    session.pendingApprovals.push(approval);
    console.log(`[SessionManager] Added approval request for ${toolName} on agent ${agentId}`);

    return approvalId;
  }

  /**
   * Get all pending approvals for an agent
   */
  getPendingApprovals(agentId: string): PendingApproval[] {
    const session = this.sessions.get(agentId);
    return session?.pendingApprovals || [];
  }

  /**
   * Approve a pending approval request
   */
  approveRequest(agentId: string, approvalId: string): void {
    const session = this.sessions.get(agentId);
    if (!session || !session.pendingApprovals) {
      throw new Error('Agent or approval not found');
    }

    const approvalIndex = session.pendingApprovals.findIndex(a => a.id === approvalId);
    if (approvalIndex === -1) {
      throw new Error('Approval not found');
    }

    // Remove from pending
    session.pendingApprovals.splice(approvalIndex, 1);
    console.log(`[SessionManager] Approved request ${approvalId} for agent ${agentId}`);

    // Signal to execution manager to continue agent execution
    executionManager.resolveApproval(approvalId, true);
  }

  /**
   * Deny a pending approval request
   */
  denyRequest(agentId: string, approvalId: string): void {
    const session = this.sessions.get(agentId);
    if (!session || !session.pendingApprovals) {
      throw new Error('Agent or approval not found');
    }

    const approvalIndex = session.pendingApprovals.findIndex(a => a.id === approvalId);
    if (approvalIndex === -1) {
      throw new Error('Approval not found');
    }

    // Remove from pending
    session.pendingApprovals.splice(approvalIndex, 1);
    console.log(`[SessionManager] Denied request ${approvalId} for agent ${agentId}`);

    // Signal to execution manager to abort this tool use
    executionManager.resolveApproval(approvalId, false);
  }
}

// Singleton instance that persists across hot reloads in development
const globalForSessionManager = globalThis as unknown as {
  sessionManager: AgentSessionManager | undefined;
};

export const sessionManager = globalForSessionManager.sessionManager ?? new AgentSessionManager();

// Preserve singleton across hot reloads in development
if (process.env.NODE_ENV !== 'production') {
  globalForSessionManager.sessionManager = sessionManager;
}
