/**
 * Database Client
 *
 * Singleton instance of better-sqlite3 database connection.
 * Handles database initialization, connection management, and WAL mode.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { homedir } from 'os';

// Database configuration
const DATABASE_PATH = process.env.DATABASE_PATH || `${homedir()}/.config/agent-view/database.sqlite`;
const ENABLE_PERSISTENCE = process.env.ENABLE_PERSISTENCE !== 'false'; // Default: enabled

/**
 * Get database file path
 * Creates parent directory if it doesn't exist
 */
function getDatabasePath(): string {
  const dbPath = DATABASE_PATH;
  const dbDir = dirname(dbPath);

  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`[Database] Created directory: ${dbDir}`);
  }

  return dbPath;
}

/**
 * Initialize database connection with WAL mode
 */
function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();

  console.log(`[Database] Initializing database at: ${dbPath}`);

  const db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  // Enable WAL mode for better concurrency and crash resilience
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log(`[Database] Database initialized successfully`);

  return db;
}

/**
 * Database singleton instance
 */
let dbInstance: Database.Database | null = null;

/**
 * Get database instance
 *
 * @returns Database instance or null if persistence disabled
 */
export function getDatabase(): Database.Database | null {
  if (!ENABLE_PERSISTENCE) {
    console.log('[Database] Persistence disabled via ENABLE_PERSISTENCE=false');
    return null;
  }

  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }

  return dbInstance;
}

/**
 * Check if persistence is enabled
 */
export function isPersistenceEnabled(): boolean {
  return ENABLE_PERSISTENCE;
}

/**
 * Close database connection
 * Used for graceful shutdown
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[Database] Connection closed');
  }
}

/**
 * Backup database to a file
 * Creates a copy of the database file
 *
 * @param backupPath - Path to backup file
 */
export function backupDatabase(backupPath?: string): void {
  const db = getDatabase();
  if (!db) {
    console.warn('[Database] Cannot backup: persistence disabled');
    return;
  }

  const targetPath = backupPath || `${getDatabasePath()}.backup`;

  db.backup(targetPath)
    .then(() => {
      console.log(`[Database] Backup created: ${targetPath}`);
    })
    .catch((error) => {
      console.error(`[Database] Backup failed:`, error);
    });
}

/**
 * Run VACUUM to reclaim deleted space
 * Should be run periodically (e.g., on startup)
 */
export function vacuumDatabase(): void {
  const db = getDatabase();
  if (!db) {
    return;
  }

  console.log('[Database] Running VACUUM...');
  const start = Date.now();

  db.prepare('VACUUM').run();

  const duration = Date.now() - start;
  console.log(`[Database] VACUUM completed in ${duration}ms`);
}

/**
 * Get database health status
 */
export function getDatabaseHealth(): {
  status: 'healthy' | 'degraded' | 'error';
  enabled: boolean;
  path: string | null;
  size: number | null;
  schemaVersion: number | null;
  error?: string;
} {
  if (!ENABLE_PERSISTENCE) {
    return {
      status: 'degraded',
      enabled: false,
      path: null,
      size: null,
      schemaVersion: null,
      error: 'Persistence disabled',
    };
  }

  try {
    const db = getDatabase();
    if (!db) {
      return {
        status: 'error',
        enabled: true,
        path: DATABASE_PATH,
        size: null,
        schemaVersion: null,
        error: 'Failed to initialize database',
      };
    }

    // Get database file size
    const fs = require('fs');
    const stats = fs.statSync(getDatabasePath());
    const sizeInBytes = stats.size;

    // Get schema version from settings table (if it exists)
    let schemaVersion: number | null = null;
    try {
      const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version') as { value: string } | undefined;
      schemaVersion = result ? parseInt(result.value, 10) : null;
    } catch (error) {
      // Settings table may not exist yet
      schemaVersion = 0;
    }

    return {
      status: 'healthy',
      enabled: true,
      path: getDatabasePath(),
      size: sizeInBytes,
      schemaVersion,
    };
  } catch (error) {
    return {
      status: 'error',
      enabled: true,
      path: DATABASE_PATH,
      size: null,
      schemaVersion: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown handler
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => {
    console.log('[Database] SIGTERM received, closing database...');
    closeDatabase();
  });

  process.on('SIGINT', () => {
    console.log('[Database] SIGINT received, closing database...');
    closeDatabase();
    process.exit(0);
  });
}
