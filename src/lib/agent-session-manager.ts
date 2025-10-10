import type { AgentSession, AgentMessage, AgentStatus, AgentHistoryItem } from '@/types/agent';

class AgentSessionManager {
  private sessions: Map<string, AgentSession> = new Map();
  private history: AgentHistoryItem[] = [];
  private currentAgentId: string | null = null;
  private readonly MAX_HISTORY = 10;

  createSession(id: string, prompt: string, directory: string): AgentSession {
    // Terminate current agent if one is running
    if (this.currentAgentId) {
      this.terminateSession(this.currentAgentId);
    }

    const session: AgentSession = {
      id,
      prompt,
      directory,
      status: 'running',
      startTime: Date.now(),
      messages: [],
    };

    this.sessions.set(id, session);
    this.currentAgentId = id;
    return session;
  }

  getSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }

  getCurrentSession(): AgentSession | null {
    if (!this.currentAgentId) return null;
    return this.sessions.get(this.currentAgentId) || null;
  }

  addMessage(id: string, message: AgentMessage): void {
    const session = this.sessions.get(id);
    if (session) {
      session.messages.push(message);

      // Update status based on message type
      if (message.type === 'error') {
        session.status = 'error';
        session.endTime = Date.now();
        this.moveToHistory(id);
      } else if (message.type === 'result') {
        session.status = 'completed';
        session.endTime = Date.now();
        this.moveToHistory(id);
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

  terminateSession(id: string): void {
    const session = this.sessions.get(id);
    if (session && session.status === 'running') {
      session.status = 'interrupted';
      session.endTime = Date.now();
      this.moveToHistory(id);
    }
    if (this.currentAgentId === id) {
      this.currentAgentId = null;
    }
  }

  private moveToHistory(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    const historyItem: AgentHistoryItem = {
      id: session.id,
      prompt: session.prompt,
      directory: session.directory,
      status: session.status,
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

    if (this.currentAgentId === id) {
      this.currentAgentId = null;
    }
  }

  getHistory(): AgentHistoryItem[] {
    return [...this.history];
  }

  getHistoricalSession(id: string): AgentSession | undefined {
    return this.sessions.get(id);
  }
}

// Singleton instance
export const sessionManager = new AgentSessionManager();
