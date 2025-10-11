/**
 * Agents Repository
 *
 * Data access layer for agent sessions.
 * Provides CRUD operations with prepared statements for performance.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';
import type { AgentSession } from '@/types/agent';

export class AgentsRepository {
  private db: Database.Database | null;

  // Prepared statements (cached for performance)
  private createStmt: Database.Statement | null = null;
  private findByIdStmt: Database.Statement | null = null;
  private findAllStmt: Database.Statement | null = null;
  private findActiveStmt: Database.Statement | null = null;
  private updateStmt: Database.Statement | null = null;
  private deleteStmt: Database.Statement | null = null;

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
      INSERT INTO agents (
        id, name, prompt, directory, status, lifecycle_state,
        tool_permissions, start_time, end_time, paused_time,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.findByIdStmt = this.db.prepare(`
      SELECT * FROM agents WHERE id = ?
    `);

    this.findAllStmt = this.db.prepare(`
      SELECT * FROM agents ORDER BY start_time DESC
    `);

    this.findActiveStmt = this.db.prepare(`
      SELECT * FROM agents
      WHERE lifecycle_state IN ('running', 'paused')
      ORDER BY start_time DESC
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE agents
      SET
        name = ?,
        status = ?,
        lifecycle_state = ?,
        end_time = ?,
        paused_time = ?,
        updated_at = ?
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM agents WHERE id = ?
    `);
  }

  /**
   * Create a new agent record
   */
  create(agent: AgentSession): void {
    if (!this.db || !this.createStmt) {
      console.warn('[AgentsRepository] Database not available, skipping create');
      return;
    }

    try {
      const now = Date.now();
      this.createStmt.run(
        agent.id,
        agent.name,
        agent.prompt,
        agent.directory,
        agent.status,
        agent.lifecycleState,
        JSON.stringify(agent.toolPermissions),
        agent.startTime,
        agent.endTime || null,
        agent.pausedTime || null,
        now,
        now
      );
    } catch (error) {
      console.error('[AgentsRepository] Error creating agent:', error);
      throw error;
    }
  }

  /**
   * Find agent by ID
   */
  findById(id: string): AgentSession | undefined {
    if (!this.db || !this.findByIdStmt) {
      console.warn('[AgentsRepository] Database not available, skipping findById');
      return undefined;
    }

    try {
      const row = this.findByIdStmt.get(id) as any;
      return row ? this.mapRowToSession(row) : undefined;
    } catch (error) {
      console.error('[AgentsRepository] Error finding agent:', error);
      return undefined;
    }
  }

  /**
   * Find all agents
   */
  findAll(): AgentSession[] {
    if (!this.db || !this.findAllStmt) {
      console.warn('[AgentsRepository] Database not available, skipping findAll');
      return [];
    }

    try {
      const rows = this.findAllStmt.all() as any[];
      return rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      console.error('[AgentsRepository] Error finding all agents:', error);
      return [];
    }
  }

  /**
   * Find active agents (running or paused)
   */
  findActive(): AgentSession[] {
    if (!this.db || !this.findActiveStmt) {
      console.warn('[AgentsRepository] Database not available, skipping findActive');
      return [];
    }

    try {
      const rows = this.findActiveStmt.all() as any[];
      return rows.map(row => this.mapRowToSession(row));
    } catch (error) {
      console.error('[AgentsRepository] Error finding active agents:', error);
      return [];
    }
  }

  /**
   * Update agent
   * Only updates mutable fields (status, lifecycle_state, end_time, paused_time)
   */
  update(id: string, updates: Partial<AgentSession>): void {
    if (!this.db || !this.updateStmt) {
      console.warn('[AgentsRepository] Database not available, skipping update');
      return;
    }

    try {
      // Get current agent to merge updates
      const current = this.findById(id);
      if (!current) {
        console.warn(`[AgentsRepository] Agent ${id} not found for update`);
        return;
      }

      const updated = { ...current, ...updates };

      this.updateStmt.run(
        updated.name,
        updated.status,
        updated.lifecycleState,
        updated.endTime || null,
        updated.pausedTime || null,
        Date.now(),
        id
      );
    } catch (error) {
      console.error('[AgentsRepository] Error updating agent:', error);
      throw error;
    }
  }

  /**
   * Delete agent
   * Also cascade deletes messages via foreign key
   */
  delete(id: string): void {
    if (!this.db || !this.deleteStmt) {
      console.warn('[AgentsRepository] Database not available, skipping delete');
      return;
    }

    try {
      this.deleteStmt.run(id);
    } catch (error) {
      console.error('[AgentsRepository] Error deleting agent:', error);
      throw error;
    }
  }

  /**
   * Map database row to AgentSession
   */
  private mapRowToSession(row: any): AgentSession {
    return {
      id: row.id,
      name: row.name,
      prompt: row.prompt,
      directory: row.directory,
      status: row.status,
      lifecycleState: row.lifecycle_state,
      toolPermissions: JSON.parse(row.tool_permissions),
      startTime: row.start_time,
      endTime: row.end_time,
      pausedTime: row.paused_time,
      messages: [], // Messages loaded separately via MessagesRepository
    };
  }
}

// Singleton instance
let repositoryInstance: AgentsRepository | null = null;

/**
 * Get AgentsRepository instance
 */
export function getAgentsRepository(): AgentsRepository {
  if (!repositoryInstance) {
    repositoryInstance = new AgentsRepository();
  }
  return repositoryInstance;
}
