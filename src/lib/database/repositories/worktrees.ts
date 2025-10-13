/**
 * Worktrees Repository
 *
 * Data access layer for worktrees.
 * Provides CRUD operations with prepared statements for performance.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';
import type { Worktree, CreateWorktreeInput, UpdateWorktreeInput } from '@/types/project';
import { randomUUID } from 'crypto';

export class WorktreesRepository {
  private db: Database.Database | null;

  // Prepared statements (cached for performance)
  private createStmt: Database.Statement | null = null;
  private findByIdStmt: Database.Statement | null = null;
  private findByDirectoryStmt: Database.Statement | null = null;
  private findByProjectIdStmt: Database.Statement | null = null;
  private findMainWorktreeStmt: Database.Statement | null = null;
  private findAllStmt: Database.Statement | null = null;
  private updateStmt: Database.Statement | null = null;
  private updateCountsStmt: Database.Statement | null = null;
  private updateLastUsedStmt: Database.Statement | null = null;
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
      INSERT INTO worktrees (
        id, project_id, name, directory, branch, is_main,
        agent_count, active_agent_count, last_used, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.findByIdStmt = this.db.prepare(`
      SELECT * FROM worktrees WHERE id = ?
    `);

    this.findByDirectoryStmt = this.db.prepare(`
      SELECT * FROM worktrees WHERE directory = ?
    `);

    this.findByProjectIdStmt = this.db.prepare(`
      SELECT * FROM worktrees
      WHERE project_id = ?
      ORDER BY is_main DESC, last_used DESC, created_at DESC
    `);

    this.findMainWorktreeStmt = this.db.prepare(`
      SELECT * FROM worktrees
      WHERE project_id = ? AND is_main = 1
      LIMIT 1
    `);

    this.findAllStmt = this.db.prepare(`
      SELECT * FROM worktrees
      ORDER BY last_used DESC, created_at DESC
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE worktrees
      SET
        name = ?,
        branch = ?,
        is_main = ?,
        updated_at = ?
      WHERE id = ?
    `);

    this.updateCountsStmt = this.db.prepare(`
      UPDATE worktrees
      SET
        agent_count = ?,
        active_agent_count = ?,
        updated_at = ?
      WHERE id = ?
    `);

    this.updateLastUsedStmt = this.db.prepare(`
      UPDATE worktrees
      SET last_used = ?, updated_at = ?
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM worktrees WHERE id = ?
    `);
  }

  /**
   * Create a new worktree record
   */
  create(input: CreateWorktreeInput): Worktree {
    if (!this.db || !this.createStmt) {
      throw new Error('Database not available');
    }

    try {
      const now = Date.now();
      const id = randomUUID();

      this.createStmt.run(
        id,
        input.projectId,
        input.name,
        input.directory,
        input.branch || null,
        input.isMain ? 1 : 0,
        0, // agent_count
        0, // active_agent_count
        now, // last_used
        now, // created_at
        now  // updated_at
      );

      const worktree = this.findById(id);
      if (!worktree) {
        throw new Error('Failed to create worktree');
      }

      return worktree;
    } catch (error) {
      console.error('[WorktreesRepository] Error creating worktree:', error);
      throw error;
    }
  }

  /**
   * Find worktree by ID
   */
  findById(id: string): Worktree | undefined {
    if (!this.db || !this.findByIdStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping findById');
      return undefined;
    }

    try {
      const row = this.findByIdStmt.get(id) as any;
      return row ? this.mapRowToWorktree(row) : undefined;
    } catch (error) {
      console.error('[WorktreesRepository] Error finding worktree:', error);
      return undefined;
    }
  }

  /**
   * Find worktree by directory path
   */
  findByDirectory(directory: string): Worktree | undefined {
    if (!this.db || !this.findByDirectoryStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping findByDirectory');
      return undefined;
    }

    try {
      const row = this.findByDirectoryStmt.get(directory) as any;
      return row ? this.mapRowToWorktree(row) : undefined;
    } catch (error) {
      console.error('[WorktreesRepository] Error finding worktree by directory:', error);
      return undefined;
    }
  }

  /**
   * Find all worktrees for a project
   */
  findByProjectId(projectId: string): Worktree[] {
    if (!this.db || !this.findByProjectIdStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping findByProjectId');
      return [];
    }

    try {
      const rows = this.findByProjectIdStmt.all(projectId) as any[];
      return rows.map(row => this.mapRowToWorktree(row));
    } catch (error) {
      console.error('[WorktreesRepository] Error finding worktrees by project:', error);
      return [];
    }
  }

  /**
   * Find the main worktree for a project
   */
  findMainWorktree(projectId: string): Worktree | undefined {
    if (!this.db || !this.findMainWorktreeStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping findMainWorktree');
      return undefined;
    }

    try {
      const row = this.findMainWorktreeStmt.get(projectId) as any;
      return row ? this.mapRowToWorktree(row) : undefined;
    } catch (error) {
      console.error('[WorktreesRepository] Error finding main worktree:', error);
      return undefined;
    }
  }

  /**
   * Find all worktrees
   */
  findAll(): Worktree[] {
    if (!this.db || !this.findAllStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping findAll');
      return [];
    }

    try {
      const rows = this.findAllStmt.all() as any[];
      return rows.map(row => this.mapRowToWorktree(row));
    } catch (error) {
      console.error('[WorktreesRepository] Error finding all worktrees:', error);
      return [];
    }
  }

  /**
   * Update worktree
   */
  update(id: string, updates: UpdateWorktreeInput): void {
    if (!this.db || !this.updateStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping update');
      return;
    }

    try {
      // Get current worktree to merge updates
      const current = this.findById(id);
      if (!current) {
        console.warn(`[WorktreesRepository] Worktree ${id} not found for update`);
        return;
      }

      const updated = { ...current, ...updates };

      this.updateStmt.run(
        updated.name,
        updated.branch || null,
        updated.isMain ? 1 : 0,
        Date.now(),
        id
      );
    } catch (error) {
      console.error('[WorktreesRepository] Error updating worktree:', error);
      throw error;
    }
  }

  /**
   * Update worktree counts (agent_count, active_agent_count)
   */
  updateCounts(id: string, agentCount: number, activeAgentCount: number): void {
    if (!this.db || !this.updateCountsStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping updateCounts');
      return;
    }

    try {
      this.updateCountsStmt.run(
        agentCount,
        activeAgentCount,
        Date.now(),
        id
      );
    } catch (error) {
      console.error('[WorktreesRepository] Error updating counts:', error);
      throw error;
    }
  }

  /**
   * Update worktree last_used timestamp
   */
  updateLastUsed(id: string): void {
    if (!this.db || !this.updateLastUsedStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping updateLastUsed');
      return;
    }

    try {
      const now = Date.now();
      this.updateLastUsedStmt.run(now, now, id);
    } catch (error) {
      console.error('[WorktreesRepository] Error updating last_used:', error);
      throw error;
    }
  }

  /**
   * Delete worktree permanently
   * WARNING: This will orphan agents referencing this worktree
   */
  delete(id: string): void {
    if (!this.db || !this.deleteStmt) {
      console.warn('[WorktreesRepository] Database not available, skipping delete');
      return;
    }

    try {
      this.deleteStmt.run(id);
    } catch (error) {
      console.error('[WorktreesRepository] Error deleting worktree:', error);
      throw error;
    }
  }

  /**
   * Map database row to Worktree
   */
  private mapRowToWorktree(row: any): Worktree {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      directory: row.directory,
      branch: row.branch || undefined,
      isMain: row.is_main === 1,
      agentCount: row.agent_count,
      activeAgentCount: row.active_agent_count,
      lastUsed: row.last_used || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let repositoryInstance: WorktreesRepository | null = null;

/**
 * Get WorktreesRepository instance
 */
export function getWorktreesRepository(): WorktreesRepository {
  if (!repositoryInstance) {
    repositoryInstance = new WorktreesRepository();
  }
  return repositoryInstance;
}
