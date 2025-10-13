/**
 * OpenSpec Repository
 *
 * Data access layer for OpenSpec entities (specs, changes, archives).
 * Provides CRUD operations with prepared statements for performance.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';
import type { CapabilitySpec, ChangeProposal, ArchivedChange, ValidationStatus, ChangeStatus } from '@/types/openspec';

/**
 * Database row types (snake_case from database)
 */
interface SpecRow {
  id: string;
  name: string;
  path: string;
  content: string;
  requirement_count: number;
  scenario_count: number;
  git_sha: string | null;
  created_at: number;
  updated_at: number;
  last_synced_at: number;
}

interface ChangeRow {
  id: string;
  name: string;
  path: string;
  status: ChangeStatus;
  validation_status: ValidationStatus;
  validation_errors: string | null;
  task_count: number;
  completed_task_count: number;
  progress_percentage: number;
  proposal_content: string | null;
  design_content: string | null;
  tasks_content: string | null;
  git_sha: string | null;
  created_at: number;
  updated_at: number;
  last_synced_at: number;
  is_favorite: number;
  tags: string | null;
}

interface ArchiveRow {
  id: string;
  name: string;
  path: string;
  archived_at: number;
  git_sha: string | null;
  created_at: number;
  updated_at: number;
  last_synced_at: number;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  lastSyncedAt: Date | null;
  isStale: boolean;
  specsCount: number;
  changesCount: number;
  archivesCount: number;
}

export class OpenSpecRepository {
  private db: Database.Database | null;

  // Prepared statements for specs
  private createSpecStmt: Database.Statement | null = null;
  private findSpecByIdStmt: Database.Statement | null = null;
  private findAllSpecsStmt: Database.Statement | null = null;
  private updateSpecStmt: Database.Statement | null = null;
  private deleteSpecStmt: Database.Statement | null = null;

  // Prepared statements for changes
  private createChangeStmt: Database.Statement | null = null;
  private findChangeByIdStmt: Database.Statement | null = null;
  private findAllChangesStmt: Database.Statement | null = null;
  private findChangesByStatusStmt: Database.Statement | null = null;
  private findFavoriteChangesStmt: Database.Statement | null = null;
  private updateChangeStmt: Database.Statement | null = null;
  private updateChangeValidationStmt: Database.Statement | null = null;
  private deleteChangeStmt: Database.Statement | null = null;

  // Prepared statements for archives
  private createArchiveStmt: Database.Statement | null = null;
  private findArchiveByIdStmt: Database.Statement | null = null;
  private findAllArchivesStmt: Database.Statement | null = null;
  private deleteArchiveStmt: Database.Statement | null = null;

  // Prepared statements for sync status
  private countSpecsStmt: Database.Statement | null = null;
  private countChangesStmt: Database.Statement | null = null;
  private countArchivesStmt: Database.Statement | null = null;
  private getLastSyncStmt: Database.Statement | null = null;

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

    // Specs statements
    this.createSpecStmt = this.db.prepare(`
      INSERT INTO openspec_specs (
        id, name, path, content, requirement_count, scenario_count,
        git_sha, created_at, updated_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        path = excluded.path,
        content = excluded.content,
        requirement_count = excluded.requirement_count,
        scenario_count = excluded.scenario_count,
        git_sha = excluded.git_sha,
        updated_at = excluded.updated_at,
        last_synced_at = excluded.last_synced_at
    `);

    this.findSpecByIdStmt = this.db.prepare(`
      SELECT * FROM openspec_specs WHERE id = ?
    `);

    this.findAllSpecsStmt = this.db.prepare(`
      SELECT * FROM openspec_specs ORDER BY updated_at DESC
    `);

    this.updateSpecStmt = this.db.prepare(`
      UPDATE openspec_specs
      SET content = ?, requirement_count = ?, scenario_count = ?,
          git_sha = ?, updated_at = ?, last_synced_at = ?
      WHERE id = ?
    `);

    this.deleteSpecStmt = this.db.prepare(`
      DELETE FROM openspec_specs WHERE id = ?
    `);

    // Changes statements
    this.createChangeStmt = this.db.prepare(`
      INSERT INTO openspec_changes (
        id, name, path, status, validation_status, validation_errors,
        task_count, completed_task_count, progress_percentage,
        proposal_content, design_content, tasks_content,
        git_sha, created_at, updated_at, last_synced_at, is_favorite, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        path = excluded.path,
        status = excluded.status,
        validation_status = excluded.validation_status,
        validation_errors = excluded.validation_errors,
        task_count = excluded.task_count,
        completed_task_count = excluded.completed_task_count,
        progress_percentage = excluded.progress_percentage,
        proposal_content = excluded.proposal_content,
        design_content = excluded.design_content,
        tasks_content = excluded.tasks_content,
        git_sha = excluded.git_sha,
        updated_at = excluded.updated_at,
        last_synced_at = excluded.last_synced_at
    `);

    this.findChangeByIdStmt = this.db.prepare(`
      SELECT * FROM openspec_changes WHERE id = ?
    `);

    this.findAllChangesStmt = this.db.prepare(`
      SELECT * FROM openspec_changes ORDER BY updated_at DESC
    `);

    this.findChangesByStatusStmt = this.db.prepare(`
      SELECT * FROM openspec_changes WHERE status = ? ORDER BY updated_at DESC
    `);

    this.findFavoriteChangesStmt = this.db.prepare(`
      SELECT * FROM openspec_changes WHERE is_favorite = 1 ORDER BY updated_at DESC
    `);

    this.updateChangeStmt = this.db.prepare(`
      UPDATE openspec_changes
      SET status = ?, task_count = ?, completed_task_count = ?, progress_percentage = ?,
          proposal_content = ?, design_content = ?, tasks_content = ?,
          git_sha = ?, updated_at = ?, last_synced_at = ?
      WHERE id = ?
    `);

    this.updateChangeValidationStmt = this.db.prepare(`
      UPDATE openspec_changes
      SET validation_status = ?, validation_errors = ?, last_synced_at = ?
      WHERE id = ?
    `);

    this.deleteChangeStmt = this.db.prepare(`
      DELETE FROM openspec_changes WHERE id = ?
    `);

    // Archives statements
    this.createArchiveStmt = this.db.prepare(`
      INSERT INTO openspec_archives (
        id, name, path, archived_at, git_sha, created_at, updated_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        path = excluded.path,
        archived_at = excluded.archived_at,
        git_sha = excluded.git_sha,
        updated_at = excluded.updated_at,
        last_synced_at = excluded.last_synced_at
    `);

    this.findArchiveByIdStmt = this.db.prepare(`
      SELECT * FROM openspec_archives WHERE id = ?
    `);

    this.findAllArchivesStmt = this.db.prepare(`
      SELECT * FROM openspec_archives ORDER BY archived_at DESC
    `);

    this.deleteArchiveStmt = this.db.prepare(`
      DELETE FROM openspec_archives WHERE id = ?
    `);

    // Sync status statements
    this.countSpecsStmt = this.db.prepare(`SELECT COUNT(*) as count FROM openspec_specs`);
    this.countChangesStmt = this.db.prepare(`SELECT COUNT(*) as count FROM openspec_changes`);
    this.countArchivesStmt = this.db.prepare(`SELECT COUNT(*) as count FROM openspec_archives`);
    this.getLastSyncStmt = this.db.prepare(`
      SELECT MAX(last_synced_at) as last_sync FROM (
        SELECT last_synced_at FROM openspec_specs
        UNION ALL
        SELECT last_synced_at FROM openspec_changes
        UNION ALL
        SELECT last_synced_at FROM openspec_archives
      )
    `);
  }

  // ==================== Specs Methods ====================

  /**
   * Create or update a spec
   */
  upsertSpec(spec: Omit<CapabilitySpec, 'type'>): void {
    if (!this.db || !this.createSpecStmt) {
      console.warn('[OpenSpecRepository] Database not available, skipping upsertSpec');
      return;
    }

    try {
      const now = Date.now();
      this.createSpecStmt.run(
        spec.id,
        spec.name,
        spec.path,
        spec.content,
        spec.requirementCount,
        spec.scenarioCount,
        null, // git_sha (to be added later if needed)
        spec.createdAt ? spec.createdAt.getTime() : now,
        spec.updatedAt ? spec.updatedAt.getTime() : now,
        now
      );
    } catch (error) {
      console.error('[OpenSpecRepository] Error upserting spec:', error);
      throw error;
    }
  }

  /**
   * Find spec by ID
   */
  findSpecById(id: string): CapabilitySpec | null {
    if (!this.db || !this.findSpecByIdStmt) {
      return null;
    }

    try {
      const row = this.findSpecByIdStmt.get(id) as SpecRow | undefined;
      return row ? this.mapRowToSpec(row) : null;
    } catch (error) {
      console.error('[OpenSpecRepository] Error finding spec:', error);
      return null;
    }
  }

  /**
   * List all specs
   */
  listSpecs(): CapabilitySpec[] {
    if (!this.db || !this.findAllSpecsStmt) {
      return [];
    }

    try {
      const rows = this.findAllSpecsStmt.all() as SpecRow[];
      return rows.map(row => this.mapRowToSpec(row));
    } catch (error) {
      console.error('[OpenSpecRepository] Error listing specs:', error);
      return [];
    }
  }

  /**
   * Delete spec
   */
  deleteSpec(id: string): void {
    if (!this.db || !this.deleteSpecStmt) {
      return;
    }

    try {
      this.deleteSpecStmt.run(id);
    } catch (error) {
      console.error('[OpenSpecRepository] Error deleting spec:', error);
    }
  }

  // ==================== Changes Methods ====================

  /**
   * Create or update a change
   */
  upsertChange(change: Omit<ChangeProposal, 'type'>): void {
    if (!this.db || !this.createChangeStmt) {
      console.warn('[OpenSpecRepository] Database not available, skipping upsertChange');
      return;
    }

    try {
      const now = Date.now();
      this.createChangeStmt.run(
        change.id,
        change.name,
        change.path,
        change.status,
        change.validationStatus,
        null, // validation_errors (JSON string)
        change.taskCount,
        change.completedTaskCount,
        change.progressPercentage,
        change.proposal || null,
        change.design || null,
        change.tasks || null,
        null, // git_sha
        change.createdAt ? change.createdAt.getTime() : now,
        change.updatedAt ? change.updatedAt.getTime() : now,
        now,
        0, // is_favorite
        null // tags (JSON string)
      );
    } catch (error) {
      console.error('[OpenSpecRepository] Error upserting change:', error);
      throw error;
    }
  }

  /**
   * Find change by ID
   */
  findChangeById(id: string): ChangeProposal | null {
    if (!this.db || !this.findChangeByIdStmt) {
      return null;
    }

    try {
      const row = this.findChangeByIdStmt.get(id) as ChangeRow | undefined;
      return row ? this.mapRowToChange(row) : null;
    } catch (error) {
      console.error('[OpenSpecRepository] Error finding change:', error);
      return null;
    }
  }

  /**
   * List all changes
   */
  listChanges(status?: ChangeStatus): ChangeProposal[] {
    if (!this.db) {
      return [];
    }

    try {
      let rows: ChangeRow[];
      if (status && this.findChangesByStatusStmt) {
        rows = this.findChangesByStatusStmt.all(status) as ChangeRow[];
      } else if (this.findAllChangesStmt) {
        rows = this.findAllChangesStmt.all() as ChangeRow[];
      } else {
        return [];
      }
      return rows.map(row => this.mapRowToChange(row));
    } catch (error) {
      console.error('[OpenSpecRepository] Error listing changes:', error);
      return [];
    }
  }

  /**
   * List favorite changes
   */
  listFavoriteChanges(): ChangeProposal[] {
    if (!this.db || !this.findFavoriteChangesStmt) {
      return [];
    }

    try {
      const rows = this.findFavoriteChangesStmt.all() as ChangeRow[];
      return rows.map(row => this.mapRowToChange(row));
    } catch (error) {
      console.error('[OpenSpecRepository] Error listing favorite changes:', error);
      return [];
    }
  }

  /**
   * Update change validation status
   */
  updateChangeValidation(id: string, status: ValidationStatus, errors?: string): void {
    if (!this.db || !this.updateChangeValidationStmt) {
      return;
    }

    try {
      this.updateChangeValidationStmt.run(
        status,
        errors || null,
        Date.now(),
        id
      );
    } catch (error) {
      console.error('[OpenSpecRepository] Error updating change validation:', error);
    }
  }

  /**
   * Delete change
   */
  deleteChange(id: string): void {
    if (!this.db || !this.deleteChangeStmt) {
      return;
    }

    try {
      this.deleteChangeStmt.run(id);
    } catch (error) {
      console.error('[OpenSpecRepository] Error deleting change:', error);
    }
  }

  // ==================== Archives Methods ====================

  /**
   * Create or update an archive
   */
  upsertArchive(archive: Omit<ArchivedChange, 'type'>): void {
    if (!this.db || !this.createArchiveStmt) {
      console.warn('[OpenSpecRepository] Database not available, skipping upsertArchive');
      return;
    }

    try {
      const now = Date.now();
      this.createArchiveStmt.run(
        archive.id,
        archive.name,
        archive.path,
        archive.archivedAt.getTime(),
        null, // git_sha
        archive.createdAt ? archive.createdAt.getTime() : now,
        archive.updatedAt ? archive.updatedAt.getTime() : now,
        now
      );
    } catch (error) {
      console.error('[OpenSpecRepository] Error upserting archive:', error);
      throw error;
    }
  }

  /**
   * Find archive by ID
   */
  findArchiveById(id: string): ArchivedChange | null {
    if (!this.db || !this.findArchiveByIdStmt) {
      return null;
    }

    try {
      const row = this.findArchiveByIdStmt.get(id) as ArchiveRow | undefined;
      return row ? this.mapRowToArchive(row) : null;
    } catch (error) {
      console.error('[OpenSpecRepository] Error finding archive:', error);
      return null;
    }
  }

  /**
   * List all archives
   */
  listArchives(): ArchivedChange[] {
    if (!this.db || !this.findAllArchivesStmt) {
      return [];
    }

    try {
      const rows = this.findAllArchivesStmt.all() as ArchiveRow[];
      return rows.map(row => this.mapRowToArchive(row));
    } catch (error) {
      console.error('[OpenSpecRepository] Error listing archives:', error);
      return [];
    }
  }

  /**
   * Delete archive
   */
  deleteArchive(id: string): void {
    if (!this.db || !this.deleteArchiveStmt) {
      return;
    }

    try {
      this.deleteArchiveStmt.run(id);
    } catch (error) {
      console.error('[OpenSpecRepository] Error deleting archive:', error);
    }
  }

  // ==================== Sync Status Methods ====================

  /**
   * Get sync status information
   */
  getSyncStatus(): SyncStatus {
    if (!this.db) {
      return {
        lastSyncedAt: null,
        isStale: true,
        specsCount: 0,
        changesCount: 0,
        archivesCount: 0,
      };
    }

    try {
      const specsCount = (this.countSpecsStmt?.get() as { count: number })?.count || 0;
      const changesCount = (this.countChangesStmt?.get() as { count: number })?.count || 0;
      const archivesCount = (this.countArchivesStmt?.get() as { count: number })?.count || 0;
      const lastSyncResult = this.getLastSyncStmt?.get() as { last_sync: number | null } | undefined;
      const lastSyncedAt = lastSyncResult?.last_sync ? new Date(lastSyncResult.last_sync) : null;

      // Consider stale if no sync yet, or last sync was more than 5 minutes ago
      const isStale = !lastSyncedAt || (Date.now() - lastSyncedAt.getTime() > 5 * 60 * 1000);

      return {
        lastSyncedAt,
        isStale,
        specsCount,
        changesCount,
        archivesCount,
      };
    } catch (error) {
      console.error('[OpenSpecRepository] Error getting sync status:', error);
      return {
        lastSyncedAt: null,
        isStale: true,
        specsCount: 0,
        changesCount: 0,
        archivesCount: 0,
      };
    }
  }

  // ==================== Helper Methods ====================

  private mapRowToSpec(row: SpecRow): CapabilitySpec {
    return {
      id: row.id,
      type: 'spec',
      name: row.name,
      path: row.path,
      content: row.content,
      requirementCount: row.requirement_count,
      scenarioCount: row.scenario_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToChange(row: ChangeRow): ChangeProposal {
    return {
      id: row.id,
      type: 'change',
      name: row.name,
      path: row.path,
      status: row.status,
      validationStatus: row.validation_status,
      progressPercentage: row.progress_percentage,
      taskCount: row.task_count,
      completedTaskCount: row.completed_task_count,
      proposal: row.proposal_content || undefined,
      design: row.design_content || undefined,
      tasks: row.tasks_content || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToArchive(row: ArchiveRow): ArchivedChange {
    return {
      id: row.id,
      type: 'archive',
      name: row.name,
      path: row.path,
      archivedAt: new Date(row.archived_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Singleton instance
let repositoryInstance: OpenSpecRepository | null = null;

/**
 * Get OpenSpecRepository instance
 */
export function getOpenSpecRepository(): OpenSpecRepository {
  if (!repositoryInstance) {
    repositoryInstance = new OpenSpecRepository();
  }
  return repositoryInstance;
}
