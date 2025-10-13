/**
 * Database Module
 *
 * Central export point for database functionality.
 * Call initializeDatabase() on server startup.
 */

export { getDatabase, isPersistenceEnabled, closeDatabase, backupDatabase, vacuumDatabase, getDatabaseHealth } from './client';
export { initializeSchema, CURRENT_SCHEMA_VERSION, resetDatabase } from './schema';
export { getAgentsRepository } from './repositories/agents';
export { getMessagesRepository } from './repositories/messages';
export { getConfigsRepository } from './repositories/configs';
export { getSettingsRepository } from './repositories/settings';
export { getOpenSpecRepository } from './repositories/openspec';

import { getDatabase, backupDatabase, vacuumDatabase, isPersistenceEnabled } from './client';
import { initializeSchema } from './schema';

/**
 * Initialize database system
 * Should be called once on server startup
 */
export async function initializeDatabase(): Promise<void> {
  if (!isPersistenceEnabled()) {
    console.log('[Database] Persistence disabled via ENABLE_PERSISTENCE environment variable');
    return;
  }

  console.log('[Database] Initializing database system...');

  try {
    // Create backup of existing database
    const db = getDatabase();
    if (db) {
      try {
        backupDatabase();
      } catch (error) {
        console.warn('[Database] Backup failed (may be first run):', error);
      }
    }

    // Initialize schema (creates tables if needed, runs migrations)
    initializeSchema();

    // Run VACUUM to optimize database
    try {
      vacuumDatabase();
    } catch (error) {
      console.warn('[Database] VACUUM failed:', error);
    }

    console.log('[Database] Database system initialized successfully');

    // Trigger OpenSpec sync if database is stale
    try {
      const { needsSync, syncFromFilesystem } = await import('@/lib/openspec/sync');
      if (needsSync()) {
        console.log('[Database] OpenSpec database is stale, triggering initial sync...');
        const result = await syncFromFilesystem();
        if (result.success) {
          console.log('[Database] OpenSpec sync completed successfully:', result.stats);
        } else {
          console.warn('[Database] OpenSpec sync completed with errors:', result.errors);
        }
      } else {
        console.log('[Database] OpenSpec database is current, skipping sync');
      }
    } catch (syncError) {
      console.warn('[Database] OpenSpec sync failed (non-fatal):', syncError);
    }
  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
    throw error;
  }
}
