/**
 * OpenSpec Sync
 * Bidirectional sync between filesystem (git) and database cache
 */

import path from 'path';
import { listSpecs, listChanges, listArchives } from './cli-wrapper';
import { readOpenSpecFile, exists } from './fs-operations';
import { getGitTimestamp, getDirectoryTimestamp, getGitCreationTimestamp, getGitSHA } from './git-utils';
import { parseSpecMarkdown, parseTasksMarkdown } from './parser';
import { getOpenSpecRepository } from '../database/repositories/openspec';
import type { CapabilitySpec, ChangeProposal, ArchivedChange, ChangeStatus } from '@/types/openspec';

/**
 * Sync result statistics
 */
export interface SyncResult {
  success: boolean;
  stats: {
    specs: { added: number; updated: number; removed: number };
    changes: { added: number; updated: number; removed: number };
    archives: { added: number; updated: number; removed: number };
  };
  errors: string[];
  duration: number;
}

/**
 * Sync options
 */
export interface SyncOptions {
  force?: boolean;
  incremental?: boolean;
}

// Prevent concurrent syncs
let syncInProgress = false;

/**
 * Sync OpenSpec entities from filesystem to database
 * This is the main sync function that coordinates all entity types
 */
export async function syncFromFilesystem(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();

  // Prevent concurrent syncs
  if (syncInProgress) {
    console.warn('[OpenSpecSync] Sync already in progress, skipping');
    return {
      success: false,
      stats: {
        specs: { added: 0, updated: 0, removed: 0 },
        changes: { added: 0, updated: 0, removed: 0 },
        archives: { added: 0, updated: 0, removed: 0 },
      },
      errors: ['Sync already in progress'],
      duration: 0,
    };
  }

  syncInProgress = true;

  try {
    console.log('[OpenSpecSync] Starting sync from filesystem...');

    const repo = getOpenSpecRepository();
    const errors: string[] = [];

    // Sync specs
    const specsStats = await syncSpecs(repo, errors);

    // Sync changes
    const changesStats = await syncChanges(repo, errors);

    // Sync archives
    const archivesStats = await syncArchives(repo, errors);

    const duration = Date.now() - startTime;

    console.log(`[OpenSpecSync] Sync complete in ${duration}ms`, {
      specs: specsStats,
      changes: changesStats,
      archives: archivesStats,
    });

    return {
      success: errors.length === 0,
      stats: {
        specs: specsStats,
        changes: changesStats,
        archives: archivesStats,
      },
      errors,
      duration,
    };
  } catch (error) {
    console.error('[OpenSpecSync] Sync failed:', error);
    return {
      success: false,
      stats: {
        specs: { added: 0, updated: 0, removed: 0 },
        changes: { added: 0, updated: 0, removed: 0 },
        archives: { added: 0, updated: 0, removed: 0 },
      },
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      duration: Date.now() - startTime,
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Sync specs from filesystem to database
 */
async function syncSpecs(
  repo: ReturnType<typeof getOpenSpecRepository>,
  errors: string[]
): Promise<{ added: number; updated: number; removed: number }> {
  const stats = { added: 0, updated: 0, removed: 0 };

  try {
    // List specs from filesystem (via CLI)
    const fsSpecs = await listSpecs();

    // Process each spec
    for (const fsSpec of fsSpecs) {
      try {
        // Read spec content (strip 'openspec/' prefix if present)
        const specPath = fsSpec.path.replace(/^openspec\//, '');

        // Check if file exists before trying to read it
        // Some specs may only exist in change subdirectories
        const fileExists = await exists(specPath);
        if (!fileExists) {
          console.log(`[OpenSpecSync] Skipping spec ${fsSpec.id}: file not found at ${specPath}`);
          continue; // Skip this spec without treating it as an error
        }

        const content = await readOpenSpecFile(specPath);

        // Parse content for requirement/scenario counts
        const parsed = parseSpecMarkdown(content);

        // Get git timestamps
        const updatedAt = await getGitTimestamp(fsSpec.path);
        const createdAt = await getGitCreationTimestamp(fsSpec.path);

        // Check if spec exists in database
        const dbSpec = repo.findSpecById(fsSpec.id);

        const specData = {
          id: fsSpec.id,
          name: fsSpec.name,
          path: fsSpec.path,
          content,
          requirementCount: parsed.requirements.length,
          scenarioCount: parsed.scenarios.length,
          createdAt: createdAt || new Date(),
          updatedAt: updatedAt || new Date(),
        };

        if (!dbSpec) {
          // New spec - insert
          repo.upsertSpec(specData);
          stats.added++;
        } else {
          // Existing spec - update
          repo.upsertSpec(specData);
          stats.updated++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync spec ${fsSpec.id}: ${error}`;
        console.error(`[OpenSpecSync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Remove specs that no longer exist in filesystem
    const dbSpecs = repo.listSpecs();
    for (const dbSpec of dbSpecs) {
      if (!fsSpecs.find(s => s.id === dbSpec.id)) {
        repo.deleteSpec(dbSpec.id);
        stats.removed++;
      }
    }
  } catch (error) {
    const errorMsg = `Failed to sync specs: ${error}`;
    console.error(`[OpenSpecSync] ${errorMsg}`);
    errors.push(errorMsg);
  }

  return stats;
}

/**
 * Sync changes from filesystem to database
 */
async function syncChanges(
  repo: ReturnType<typeof getOpenSpecRepository>,
  errors: string[]
): Promise<{ added: number; updated: number; removed: number }> {
  const stats = { added: 0, updated: 0, removed: 0 };

  try {
    // List changes from filesystem (via CLI)
    const fsChanges = await listChanges();

    // Process each change
    for (const fsChange of fsChanges) {
      try {
        // Get directory timestamp (most recent file in change directory)
        const updatedAt = await getDirectoryTimestamp(fsChange.path);
        const createdAt = await getGitCreationTimestamp(fsChange.path);

        // Read change files (strip 'openspec/' prefix if present, as readOpenSpecFile adds it)
        const changePath = fsChange.path.replace(/^openspec\//, '');
        const proposalPath = path.join(changePath, 'proposal.md');
        const designPath = path.join(changePath, 'design.md');
        const tasksPath = path.join(changePath, 'tasks.md');

        let proposalContent: string | undefined;
        let designContent: string | undefined;
        let tasksContent: string | undefined;

        try {
          proposalContent = await readOpenSpecFile(proposalPath);
        } catch (e) {
          // proposal.md is optional
        }

        try {
          designContent = await readOpenSpecFile(designPath);
        } catch (e) {
          // design.md is optional
        }

        try {
          tasksContent = await readOpenSpecFile(tasksPath);
        } catch (e) {
          // tasks.md is optional
        }

        // Parse tasks to get counts
        let taskCount = 0;
        let completedTaskCount = 0;
        let status: ChangeStatus = fsChange.status;

        if (tasksContent) {
          const tasks = parseTasksMarkdown(tasksContent);
          taskCount = tasks.length;
          completedTaskCount = tasks.filter(t => t.completed).length;

          // Derive status from task completion
          if (completedTaskCount === 0 && taskCount > 0) {
            status = 'pending';
          } else if (completedTaskCount === taskCount && taskCount > 0) {
            status = 'completed';
          } else if (completedTaskCount > 0) {
            status = 'in_progress';
          }
        }

        const progressPercentage = taskCount > 0
          ? Math.round((completedTaskCount / taskCount) * 100)
          : 0;

        // Check if change exists in database
        const dbChange = repo.findChangeById(fsChange.id);

        const changeData = {
          id: fsChange.id,
          name: fsChange.name,
          path: fsChange.path,
          status,
          validationStatus: dbChange?.validationStatus || ('pending' as const),
          progressPercentage,
          taskCount,
          completedTaskCount,
          proposal: proposalContent,
          design: designContent,
          tasks: tasksContent,
          createdAt: createdAt || new Date(),
          updatedAt: updatedAt || new Date(),
        };

        if (!dbChange) {
          // New change - insert
          repo.upsertChange(changeData);
          stats.added++;
        } else {
          // Existing change - update
          repo.upsertChange(changeData);
          stats.updated++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync change ${fsChange.id}: ${error}`;
        console.error(`[OpenSpecSync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Remove changes that no longer exist in filesystem
    const dbChanges = repo.listChanges();
    for (const dbChange of dbChanges) {
      if (!fsChanges.find(c => c.id === dbChange.id)) {
        repo.deleteChange(dbChange.id);
        stats.removed++;
      }
    }
  } catch (error) {
    const errorMsg = `Failed to sync changes: ${error}`;
    console.error(`[OpenSpecSync] ${errorMsg}`);
    errors.push(errorMsg);
  }

  return stats;
}

/**
 * Sync archives from filesystem to database
 */
async function syncArchives(
  repo: ReturnType<typeof getOpenSpecRepository>,
  errors: string[]
): Promise<{ added: number; updated: number; removed: number }> {
  const stats = { added: 0, updated: 0, removed: 0 };

  try {
    // List archives from filesystem (via CLI)
    const fsArchives = await listArchives();

    // Process each archive
    for (const fsArchive of fsArchives) {
      try {
        // Get directory timestamp
        const archivedAt = await getDirectoryTimestamp(fsArchive.path);
        const updatedAt = archivedAt;
        const createdAt = await getGitCreationTimestamp(fsArchive.path);

        // Check if archive exists in database
        const dbArchive = repo.findArchiveById(fsArchive.id);

        const archiveData = {
          id: fsArchive.id,
          name: fsArchive.name,
          path: fsArchive.path,
          archivedAt: archivedAt || new Date(),
          createdAt: createdAt || new Date(),
          updatedAt: updatedAt || new Date(),
        };

        if (!dbArchive) {
          // New archive - insert
          repo.upsertArchive(archiveData);
          stats.added++;
        } else {
          // Existing archive - update
          repo.upsertArchive(archiveData);
          stats.updated++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync archive ${fsArchive.id}: ${error}`;
        console.error(`[OpenSpecSync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Remove archives that no longer exist in filesystem
    const dbArchives = repo.listArchives();
    for (const dbArchive of dbArchives) {
      if (!fsArchives.find(a => a.id === dbArchive.id)) {
        repo.deleteArchive(dbArchive.id);
        stats.removed++;
      }
    }
  } catch (error) {
    const errorMsg = `Failed to sync archives: ${error}`;
    console.error(`[OpenSpecSync] ${errorMsg}`);
    errors.push(errorMsg);
  }

  return stats;
}

/**
 * Check if database needs sync (is stale)
 */
export function needsSync(): boolean {
  const repo = getOpenSpecRepository();
  const status = repo.getSyncStatus();
  return status.isStale;
}

/**
 * Get current sync status
 */
export function getSyncStatus() {
  const repo = getOpenSpecRepository();
  return repo.getSyncStatus();
}
