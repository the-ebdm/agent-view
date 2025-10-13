/**
 * Projects Repository
 *
 * Data access layer for projects.
 * Provides CRUD operations with prepared statements for performance.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types/project';
import { randomUUID } from 'crypto';

export class ProjectsRepository {
  private db: Database.Database | null;

  // Prepared statements (cached for performance)
  private createStmt: Database.Statement | null = null;
  private findByIdStmt: Database.Statement | null = null;
  private findByDirectoryStmt: Database.Statement | null = null;
  private findAllStmt: Database.Statement | null = null;
  private findActiveStmt: Database.Statement | null = null;
  private findFavoritesStmt: Database.Statement | null = null;
  private updateStmt: Database.Statement | null = null;
  private updateCountsStmt: Database.Statement | null = null;
  private updateLastUsedStmt: Database.Statement | null = null;
  private deleteStmt: Database.Statement | null = null;
  private archiveStmt: Database.Statement | null = null;

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
      INSERT INTO projects (
        id, name, directory, description, openspec_path,
        default_tool_permissions, is_favorite, tags,
        agent_count, active_agent_count, worktree_count,
        last_used, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.findByIdStmt = this.db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `);

    this.findByDirectoryStmt = this.db.prepare(`
      SELECT * FROM projects WHERE directory = ?
    `);

    this.findAllStmt = this.db.prepare(`
      SELECT * FROM projects
      WHERE archived_at IS NULL
      ORDER BY last_used DESC, created_at DESC
    `);

    this.findActiveStmt = this.db.prepare(`
      SELECT * FROM projects
      WHERE archived_at IS NULL AND active_agent_count > 0
      ORDER BY last_used DESC
    `);

    this.findFavoritesStmt = this.db.prepare(`
      SELECT * FROM projects
      WHERE archived_at IS NULL AND is_favorite = 1
      ORDER BY last_used DESC, created_at DESC
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE projects
      SET
        name = ?,
        description = ?,
        openspec_path = ?,
        default_tool_permissions = ?,
        is_favorite = ?,
        tags = ?,
        archived_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    this.updateCountsStmt = this.db.prepare(`
      UPDATE projects
      SET
        agent_count = ?,
        active_agent_count = ?,
        worktree_count = ?,
        updated_at = ?
      WHERE id = ?
    `);

    this.updateLastUsedStmt = this.db.prepare(`
      UPDATE projects
      SET last_used = ?, updated_at = ?
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM projects WHERE id = ?
    `);

    this.archiveStmt = this.db.prepare(`
      UPDATE projects
      SET archived_at = ?, updated_at = ?
      WHERE id = ?
    `);
  }

  /**
   * Create a new project record
   */
  create(input: CreateProjectInput): Project {
    if (!this.db || !this.createStmt) {
      throw new Error('Database not available');
    }

    try {
      const now = Date.now();
      const id = randomUUID();

      this.createStmt.run(
        id,
        input.name,
        input.directory,
        input.description || null,
        input.openspecPath || null,
        input.defaultToolPermissions ? JSON.stringify(input.defaultToolPermissions) : null,
        input.isFavorite ? 1 : 0,
        input.tags ? JSON.stringify(input.tags) : null,
        0, // agent_count
        0, // active_agent_count
        0, // worktree_count
        now, // last_used
        now, // created_at
        now  // updated_at
      );

      const project = this.findById(id);
      if (!project) {
        throw new Error('Failed to create project');
      }

      return project;
    } catch (error) {
      console.error('[ProjectsRepository] Error creating project:', error);
      throw error;
    }
  }

  /**
   * Find project by ID
   */
  findById(id: string): Project | undefined {
    if (!this.db || !this.findByIdStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping findById');
      return undefined;
    }

    try {
      const row = this.findByIdStmt.get(id) as unknown;
      return row ? this.mapRowToProject(row) : undefined;
    } catch (error) {
      console.error('[ProjectsRepository] Error finding project:', error);
      return undefined;
    }
  }

  /**
   * Find project by directory path
   */
  findByDirectory(directory: string): Project | undefined {
    if (!this.db || !this.findByDirectoryStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping findByDirectory');
      return undefined;
    }

    try {
      const row = this.findByDirectoryStmt.get(directory) as unknown;
      return row ? this.mapRowToProject(row) : undefined;
    } catch (error) {
      console.error('[ProjectsRepository] Error finding project by directory:', error);
      return undefined;
    }
  }

  /**
   * Find all non-archived projects
   */
  findAll(): Project[] {
    if (!this.db || !this.findAllStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping findAll');
      return [];
    }

    try {
      const rows = this.findAllStmt.all() as unknown[];
      return rows.map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('[ProjectsRepository] Error finding all projects:', error);
      return [];
    }
  }

  /**
   * Find projects with active agents
   */
  findActive(): Project[] {
    if (!this.db || !this.findActiveStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping findActive');
      return [];
    }

    try {
      const rows = this.findActiveStmt.all() as unknown[];
      return rows.map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('[ProjectsRepository] Error finding active projects:', error);
      return [];
    }
  }

  /**
   * Find favorite projects
   */
  findFavorites(): Project[] {
    if (!this.db || !this.findFavoritesStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping findFavorites');
      return [];
    }

    try {
      const rows = this.findFavoritesStmt.all() as unknown[];
      return rows.map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('[ProjectsRepository] Error finding favorite projects:', error);
      return [];
    }
  }

  /**
   * Update project
   */
  update(id: string, updates: UpdateProjectInput): void {
    if (!this.db || !this.updateStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping update');
      return;
    }

    try {
      // Get current project to merge updates
      const current = this.findById(id);
      if (!current) {
        console.warn(`[ProjectsRepository] Project ${id} not found for update`);
        return;
      }

      const updated = { ...current, ...updates };

      this.updateStmt.run(
        updated.name,
        updated.description || null,
        updated.openspecPath || null,
        updated.defaultToolPermissions ? JSON.stringify(updated.defaultToolPermissions) : null,
        updated.isFavorite ? 1 : 0,
        updated.tags ? JSON.stringify(updated.tags) : null,
        updated.archivedAt || null,
        Date.now(),
        id
      );
    } catch (error) {
      console.error('[ProjectsRepository] Error updating project:', error);
      throw error;
    }
  }

  /**
   * Update project counts (agent_count, active_agent_count, worktree_count)
   */
  updateCounts(id: string, agentCount: number, activeAgentCount: number, worktreeCount: number): void {
    if (!this.db || !this.updateCountsStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping updateCounts');
      return;
    }

    try {
      this.updateCountsStmt.run(
        agentCount,
        activeAgentCount,
        worktreeCount,
        Date.now(),
        id
      );
    } catch (error) {
      console.error('[ProjectsRepository] Error updating counts:', error);
      throw error;
    }
  }

  /**
   * Update project last_used timestamp
   */
  updateLastUsed(id: string): void {
    if (!this.db || !this.updateLastUsedStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping updateLastUsed');
      return;
    }

    try {
      const now = Date.now();
      this.updateLastUsedStmt.run(now, now, id);
    } catch (error) {
      console.error('[ProjectsRepository] Error updating last_used:', error);
      throw error;
    }
  }

  /**
   * Archive project (soft delete)
   */
  archive(id: string): void {
    if (!this.db || !this.archiveStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping archive');
      return;
    }

    try {
      const now = Date.now();
      this.archiveStmt.run(now, now, id);
    } catch (error) {
      console.error('[ProjectsRepository] Error archiving project:', error);
      throw error;
    }
  }

  /**
   * Delete project permanently
   * WARNING: This will cascade delete worktrees and orphan agents
   */
  delete(id: string): void {
    if (!this.db || !this.deleteStmt) {
      console.warn('[ProjectsRepository] Database not available, skipping delete');
      return;
    }

    try {
      this.deleteStmt.run(id);
    } catch (error) {
      console.error('[ProjectsRepository] Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Map database row to Project
   */
  private mapRowToProject(row: unknown): Project {
    const r = row as {
      id: string;
      name: string;
      directory: string;
      description: string | null;
      openspec_path: string | null;
      default_tool_permissions: string | null;
      is_favorite: number;
      tags: string | null;
      agent_count: number;
      active_agent_count: number;
      worktree_count: number;
      last_used: number | null;
      created_at: number;
      updated_at: number;
      archived_at: number | null;
    };
    return {
      id: r.id,
      name: r.name,
      directory: r.directory,
      description: r.description || undefined,
      openspecPath: r.openspec_path || undefined,
      defaultToolPermissions: r.default_tool_permissions ? JSON.parse(r.default_tool_permissions) : undefined,
      isFavorite: r.is_favorite === 1,
      tags: r.tags ? JSON.parse(r.tags) : undefined,
      agentCount: r.agent_count,
      activeAgentCount: r.active_agent_count,
      worktreeCount: r.worktree_count,
      lastUsed: r.last_used || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      archivedAt: r.archived_at || undefined,
    };
  }
}

// Singleton instance
let repositoryInstance: ProjectsRepository | null = null;

/**
 * Get ProjectsRepository instance
 */
export function getProjectsRepository(): ProjectsRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ProjectsRepository();
  }
  return repositoryInstance;
}
