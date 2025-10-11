/**
 * Messages Repository
 *
 * Data access layer for agent messages.
 * Provides CRUD operations with prepared statements for performance.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';
import type { AgentMessage } from '@/types/agent';

export interface MessageRow extends AgentMessage {
  agentId: string;
}

export class MessagesRepository {
  private db: Database.Database | null;

  // Prepared statements (cached for performance)
  private createStmt: Database.Statement | null = null;
  private findByAgentIdStmt: Database.Statement | null = null;
  private findRecentByAgentIdStmt: Database.Statement | null = null;
  private countByAgentIdStmt: Database.Statement | null = null;
  private deleteOlderThanStmt: Database.Statement | null = null;

  constructor() {
    this.db = getDatabase();
    if (this.db) {
      this.prepareStatements();
    }
  }

  /**
   * Prepare all SQL statements for reuse
   */
  private prepareStatements(): void {
    if (!this.db) return;

    this.createStmt = this.db.prepare(`
      INSERT INTO messages (
        agent_id, type, content, timestamp, tool_name, tool_params, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.findByAgentIdStmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE agent_id = ?
      ORDER BY timestamp ASC
      LIMIT ? OFFSET ?
    `);

    this.findRecentByAgentIdStmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE agent_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    this.countByAgentIdStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE agent_id = ?
    `);

    this.deleteOlderThanStmt = this.db.prepare(`
      DELETE FROM messages WHERE timestamp < ?
    `);
  }

  /**
   * Create a new message record
   * Returns the auto-generated message ID
   */
  create(message: MessageRow): number | null {
    if (!this.db || !this.createStmt) {
      console.warn('[MessagesRepository] Database not available, skipping create');
      return null;
    }

    try {
      const result = this.createStmt.run(
        message.agentId,
        message.type,
        message.content,
        message.timestamp,
        message.toolName || null,
        message.toolParams ? JSON.stringify(message.toolParams) : null,
        Date.now()
      );
      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('[MessagesRepository] Error creating message:', error);
      return null;
    }
  }

  /**
   * Find messages by agent ID
   * Supports pagination with limit and offset
   */
  findByAgentId(
    agentId: string,
    options?: { limit?: number; offset?: number }
  ): AgentMessage[] {
    if (!this.db || !this.findByAgentIdStmt) {
      console.warn('[MessagesRepository] Database not available, skipping findByAgentId');
      return [];
    }

    try {
      const limit = options?.limit || 1000; // Default limit
      const offset = options?.offset || 0;

      const rows = this.findByAgentIdStmt.all(agentId, limit, offset) as any[];
      return rows.map(row => this.mapRowToMessage(row));
    } catch (error) {
      console.error('[MessagesRepository] Error finding messages:', error);
      return [];
    }
  }

  /**
   * Find recent messages by agent ID (for buffer)
   * Returns most recent N messages in descending order
   */
  findRecentByAgentId(agentId: string, limit: number = 100): AgentMessage[] {
    if (!this.db || !this.findRecentByAgentIdStmt) {
      console.warn('[MessagesRepository] Database not available, skipping findRecentByAgentId');
      return [];
    }

    try {
      const rows = this.findRecentByAgentIdStmt.all(agentId, limit) as any[];
      // Reverse to get chronological order (oldest first)
      return rows.reverse().map(row => this.mapRowToMessage(row));
    } catch (error) {
      console.error('[MessagesRepository] Error finding recent messages:', error);
      return [];
    }
  }

  /**
   * Count messages by agent ID
   */
  countByAgentId(agentId: string): number {
    if (!this.db || !this.countByAgentIdStmt) {
      console.warn('[MessagesRepository] Database not available, skipping countByAgentId');
      return 0;
    }

    try {
      const result = this.countByAgentIdStmt.get(agentId) as { count: number };
      return result.count;
    } catch (error) {
      console.error('[MessagesRepository] Error counting messages:', error);
      return 0;
    }
  }

  /**
   * Delete messages older than specified timestamp
   * Used for retention policy enforcement
   * Returns number of deleted rows
   */
  deleteOlderThan(timestamp: number): number {
    if (!this.db || !this.deleteOlderThanStmt) {
      console.warn('[MessagesRepository] Database not available, skipping deleteOlderThan');
      return 0;
    }

    try {
      const result = this.deleteOlderThanStmt.run(timestamp);
      return result.changes;
    } catch (error) {
      console.error('[MessagesRepository] Error deleting old messages:', error);
      return 0;
    }
  }

  /**
   * Map database row to AgentMessage
   */
  private mapRowToMessage(row: any): AgentMessage {
    return {
      type: row.type,
      content: row.content,
      timestamp: row.timestamp,
      toolName: row.tool_name,
      toolParams: row.tool_params ? JSON.parse(row.tool_params) : undefined,
    };
  }
}

// Singleton instance
let repositoryInstance: MessagesRepository | null = null;

/**
 * Get MessagesRepository instance
 */
export function getMessagesRepository(): MessagesRepository {
  if (!repositoryInstance) {
    repositoryInstance = new MessagesRepository();
  }
  return repositoryInstance;
}
