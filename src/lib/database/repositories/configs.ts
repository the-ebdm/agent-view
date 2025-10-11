/**
 * Configs Repository
 *
 * Data access layer for saved agent configurations.
 * Provides CRUD operations with prepared statements for performance.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';
import type { SavedAgentConfig } from '@/lib/agent-templates';

export class ConfigsRepository {
  private db: Database.Database | null;

  // Prepared statements (cached for performance)
  private createStmt: Database.Statement | null = null;
  private findByIdStmt: Database.Statement | null = null;
  private findAllStmt: Database.Statement | null = null;
  private findRecentStmt: Database.Statement | null = null;
  private updateLastUsedStmt: Database.Statement | null = null;
  private toggleFavoriteStmt: Database.Statement | null = null;
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
      INSERT INTO agent_configs (
        id, name, prompt, directory, tool_preset, custom_tools,
        created_at, last_used, is_favorite, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.findByIdStmt = this.db.prepare(`
      SELECT * FROM agent_configs WHERE id = ?
    `);

    this.findAllStmt = this.db.prepare(`
      SELECT * FROM agent_configs
      ORDER BY is_favorite DESC, last_used DESC, created_at DESC
    `);

    this.findRecentStmt = this.db.prepare(`
      SELECT * FROM agent_configs
      ORDER BY last_used DESC
      LIMIT ?
    `);

    this.updateLastUsedStmt = this.db.prepare(`
      UPDATE agent_configs SET last_used = ? WHERE id = ?
    `);

    this.toggleFavoriteStmt = this.db.prepare(`
      UPDATE agent_configs
      SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM agent_configs WHERE id = ?
    `);
  }

  /**
   * Create a new config record
   * Throws error if name+directory already exists (unique constraint)
   */
  create(config: SavedAgentConfig): SavedAgentConfig {
    if (!this.db || !this.createStmt) {
      console.warn('[ConfigsRepository] Database not available, returning config as-is');
      return config;
    }

    try {
      this.createStmt.run(
        config.id,
        config.name,
        config.prompt,
        config.directory,
        config.toolPreset,
        config.customTools ? JSON.stringify(config.customTools) : null,
        config.createdAt,
        config.lastUsed || null,
        0, // is_favorite defaults to 0
        null // tags defaults to null
      );
      return config;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Configuration with this name and directory already exists');
      }
      console.error('[ConfigsRepository] Error creating config:', error);
      throw error;
    }
  }

  /**
   * Find config by ID
   */
  findById(id: string): SavedAgentConfig | undefined {
    if (!this.db || !this.findByIdStmt) {
      console.warn('[ConfigsRepository] Database not available, skipping findById');
      return undefined;
    }

    try {
      const row = this.findByIdStmt.get(id) as any;
      return row ? this.mapRowToConfig(row) : undefined;
    } catch (error) {
      console.error('[ConfigsRepository] Error finding config:', error);
      return undefined;
    }
  }

  /**
   * Find all configs
   * Sorted by favorite DESC, last_used DESC, created_at DESC
   */
  findAll(): SavedAgentConfig[] {
    if (!this.db || !this.findAllStmt) {
      console.warn('[ConfigsRepository] Database not available, skipping findAll');
      return [];
    }

    try {
      const rows = this.findAllStmt.all() as any[];
      return rows.map(row => this.mapRowToConfig(row));
    } catch (error) {
      console.error('[ConfigsRepository] Error finding all configs:', error);
      return [];
    }
  }

  /**
   * Find recent configs (most recently used)
   */
  findRecent(limit: number = 10): SavedAgentConfig[] {
    if (!this.db || !this.findRecentStmt) {
      console.warn('[ConfigsRepository] Database not available, skipping findRecent');
      return [];
    }

    try {
      const rows = this.findRecentStmt.all(limit) as any[];
      return rows.map(row => this.mapRowToConfig(row));
    } catch (error) {
      console.error('[ConfigsRepository] Error finding recent configs:', error);
      return [];
    }
  }

  /**
   * Update last_used timestamp
   */
  updateLastUsed(id: string): void {
    if (!this.db || !this.updateLastUsedStmt) {
      console.warn('[ConfigsRepository] Database not available, skipping updateLastUsed');
      return;
    }

    try {
      this.updateLastUsedStmt.run(Date.now(), id);
    } catch (error) {
      console.error('[ConfigsRepository] Error updating last_used:', error);
    }
  }

  /**
   * Toggle favorite status (0 → 1 or 1 → 0)
   */
  toggleFavorite(id: string): void {
    if (!this.db || !this.toggleFavoriteStmt) {
      console.warn('[ConfigsRepository] Database not available, skipping toggleFavorite');
      return;
    }

    try {
      this.toggleFavoriteStmt.run(id);
    } catch (error) {
      console.error('[ConfigsRepository] Error toggling favorite:', error);
    }
  }

  /**
   * Delete config
   */
  delete(id: string): void {
    if (!this.db || !this.deleteStmt) {
      console.warn('[ConfigsRepository] Database not available, skipping delete');
      return;
    }

    try {
      this.deleteStmt.run(id);
    } catch (error) {
      console.error('[ConfigsRepository] Error deleting config:', error);
    }
  }

  /**
   * Map database row to SavedAgentConfig
   */
  private mapRowToConfig(row: any): SavedAgentConfig {
    return {
      id: row.id,
      name: row.name,
      prompt: row.prompt,
      directory: row.directory,
      toolPreset: row.tool_preset,
      customTools: row.custom_tools ? JSON.parse(row.custom_tools) : undefined,
      createdAt: row.created_at,
      lastUsed: row.last_used,
    };
  }
}

// Singleton instance
let repositoryInstance: ConfigsRepository | null = null;

/**
 * Get ConfigsRepository instance
 */
export function getConfigsRepository(): ConfigsRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ConfigsRepository();
  }
  return repositoryInstance;
}
