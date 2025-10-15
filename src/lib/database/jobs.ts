/**
 * Background Job Scheduler
 *
 * Cron-based in-process scheduler for automated maintenance tasks.
 * Handles message retention, database vacuum, backups, and count reconciliation.
 */

import cron from 'node-cron';
import { getMessagesRepository } from './repositories/messages';
import { getProjectsRepository } from './repositories/projects';
import { getWorktreesRepository } from './repositories/worktrees';
import { backupDatabase, vacuumDatabase, getDatabaseHealth } from './client';
import { homedir } from 'os';
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Job execution result
 */
export interface JobResult {
  success: boolean;
  duration: number;
  error?: string;
  stats?: Record<string, number | string>;
}

/**
 * Job handler function
 */
type JobHandler = () => Promise<JobResult>;

/**
 * Registered job metadata
 */
interface RegisteredJob {
  name: string;
  schedule: string;
  handler: JobHandler;
  task: cron.ScheduledTask;
  locked: boolean;
}

/**
 * Job Scheduler
 *
 * Manages scheduled background tasks with concurrency control.
 */
class JobScheduler {
  private jobs: Map<string, RegisteredJob> = new Map();
  private enabled: boolean;

  constructor() {
    // Check if background jobs are enabled
    this.enabled = process.env.ENABLE_BACKGROUND_JOBS !== 'false'; // Default: enabled
  }

  /**
   * Register a new background job
   *
   * @param name - Unique job name
   * @param schedule - Cron schedule expression
   * @param handler - Job execution handler
   */
  register(name: string, schedule: string, handler: JobHandler): void {
    if (!this.enabled) {
      console.log(`[JobScheduler] Background jobs disabled, skipping registration of: ${name}`);
      return;
    }

    // Validate cron schedule
    if (!cron.validate(schedule)) {
      console.error(`[JobScheduler] Invalid cron schedule for job "${name}": ${schedule}`);
      return;
    }

    // Create cron task with locking
    const task = cron.schedule(schedule, async () => {
      await this.executeJob(name);
    }, {
      scheduled: false, // Don't start immediately
    });

    this.jobs.set(name, {
      name,
      schedule,
      handler,
      task,
      locked: false,
    });

    console.log(`[JobScheduler] Registered job: ${name} (schedule: ${schedule})`);
  }

  /**
   * Execute a job with locking and error handling
   */
  private async executeJob(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`[JobScheduler] Job not found: ${name}`);
      return;
    }

    // Check if job is already running
    if (job.locked) {
      console.log(`[JobScheduler] Job "${name}" is already running, skipping execution`);
      return;
    }

    // Acquire lock
    job.locked = true;
    const startTime = Date.now();

    console.log(`[JobScheduler] Starting job: ${name}`);

    try {
      const result = await job.handler();
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`[JobScheduler] Job "${name}" completed successfully in ${duration}ms`, result.stats || {});
      } else {
        console.error(`[JobScheduler] Job "${name}" failed in ${duration}ms:`, result.error);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[JobScheduler] Job "${name}" threw error after ${duration}ms:`, error);
    } finally {
      // Release lock
      job.locked = false;
    }
  }

  /**
   * Start all registered jobs
   */
  start(): void {
    if (!this.enabled) {
      console.log('[JobScheduler] Background jobs disabled via ENABLE_BACKGROUND_JOBS=false');
      return;
    }

    console.log(`[JobScheduler] Starting ${this.jobs.size} background jobs...`);

    for (const [name, job] of this.jobs) {
      job.task.start();
      console.log(`[JobScheduler] Started job: ${name}`);
    }
  }

  /**
   * Stop all registered jobs gracefully
   */
  stop(): void {
    console.log('[JobScheduler] Stopping all background jobs...');

    for (const [name, job] of this.jobs) {
      job.task.stop();
      console.log(`[JobScheduler] Stopped job: ${name}`);
    }
  }

  /**
   * Manually trigger a job (for testing or admin use)
   */
  async triggerJob(name: string): Promise<JobResult> {
    const job = this.jobs.get(name);
    if (!job) {
      return {
        success: false,
        duration: 0,
        error: `Job not found: ${name}`,
      };
    }

    const startTime = Date.now();
    try {
      const result = await job.handler();
      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of registered jobs
   */
  getJobs(): Array<{ name: string; schedule: string; locked: boolean }> {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      schedule: job.schedule,
      locked: job.locked,
    }));
  }
}

/**
 * Message Retention Job Handler
 *
 * Deletes messages older than MESSAGE_RETENTION_DAYS setting.
 * Default: 30 days
 */
async function messageRetentionHandler(): Promise<JobResult> {
  const startTime = Date.now();

  try {
    // Get retention days from environment or default to 30
    const retentionDays = parseInt(process.env.MESSAGE_RETENTION_DAYS || '30', 10);
    const cutoffTimestamp = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const messagesRepo = getMessagesRepository();
    const deletedCount = messagesRepo.deleteOlderThan(cutoffTimestamp);

    return {
      success: true,
      duration: Date.now() - startTime,
      stats: {
        retentionDays,
        deletedMessages: deletedCount,
        cutoffDate: new Date(cutoffTimestamp).toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Database Vacuum Job Handler
 *
 * Runs VACUUM to reclaim deleted space.
 * Scheduled weekly to balance performance and disk usage.
 */
async function databaseVacuumHandler(): Promise<JobResult> {
  const startTime = Date.now();

  try {
    // Get size before vacuum
    const healthBefore = getDatabaseHealth();
    const sizeBefore = healthBefore.size || 0;

    vacuumDatabase();

    // Get size after vacuum
    const healthAfter = getDatabaseHealth();
    const sizeAfter = healthAfter.size || 0;
    const spaceReclaimed = sizeBefore - sizeAfter;

    return {
      success: true,
      duration: Date.now() - startTime,
      stats: {
        sizeBefore,
        sizeAfter,
        spaceReclaimed,
        spaceReclaimedMB: (spaceReclaimed / (1024 * 1024)).toFixed(2),
      },
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Backup Job Handler
 *
 * Creates a database backup and rotates old backups (keeps last 7).
 */
async function backupHandler(): Promise<JobResult> {
  const startTime = Date.now();

  try {
    const backupDir = process.env.BACKUP_PATH || `${homedir()}/.config/agent-view/backups`;

    // Ensure backup directory exists
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = join(backupDir, `database-${timestamp}.sqlite`);

    backupDatabase(backupPath);

    // Wait a bit for async backup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Rotate old backups (keep last 7)
    const maxBackups = parseInt(process.env.MAX_BACKUPS || '7', 10);
    const backupFiles = readdirSync(backupDir)
      .filter(file => file.startsWith('database-') && file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: join(backupDir, file),
        mtime: statSync(join(backupDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time (newest first)

    let deletedCount = 0;
    if (backupFiles.length > maxBackups) {
      const filesToDelete = backupFiles.slice(maxBackups);
      for (const file of filesToDelete) {
        unlinkSync(file.path);
        deletedCount++;
      }
    }

    return {
      success: true,
      duration: Date.now() - startTime,
      stats: {
        backupPath,
        totalBackups: backupFiles.length - deletedCount,
        deletedOldBackups: deletedCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Count Reconciliation Job Handler
 *
 * Fixes drifted agent/worktree counts in projects and worktrees tables.
 */
async function countReconciliationHandler(): Promise<JobResult> {
  const startTime = Date.now();

  try {
    const projectsRepo = getProjectsRepository();
    const worktreesRepo = getWorktreesRepository();

    const projectsCorrected = projectsRepo.reconcileCounts();
    const worktreesCorrected = worktreesRepo.reconcileCounts();

    return {
      success: true,
      duration: Date.now() - startTime,
      stats: {
        projectsCorrected,
        worktreesCorrected,
        totalCorrected: projectsCorrected + worktreesCorrected,
      },
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initialize and register all background jobs
 */
export function initializeBackgroundJobs(): JobScheduler {
  const scheduler = new JobScheduler();

  // Register jobs with cron schedules
  // Note: All times are in server's local timezone

  // Message retention - Daily at 2 AM
  scheduler.register('message-retention', '0 2 * * *', messageRetentionHandler);

  // Database vacuum - Weekly on Sunday at 3 AM
  scheduler.register('database-vacuum', '0 3 * * 0', databaseVacuumHandler);

  // Database backup - Daily at 1 AM
  scheduler.register('database-backup', '0 1 * * *', backupHandler);

  // Count reconciliation - Daily at 4 AM
  scheduler.register('count-reconciliation', '0 4 * * *', countReconciliationHandler);

  return scheduler;
}

// Singleton instance
let schedulerInstance: JobScheduler | null = null;

/**
 * Get JobScheduler instance
 */
export function getJobScheduler(): JobScheduler {
  if (!schedulerInstance) {
    schedulerInstance = initializeBackgroundJobs();
  }
  return schedulerInstance;
}
