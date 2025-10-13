/**
 * Database Schema
 *
 * Defines database tables, indexes, and migrations.
 * Schema version 1: Initial schema with agents, messages, agent_configs, settings
 */

import type Database from 'better-sqlite3';
import { getDatabase } from './client';

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 4;

/**
 * Initialize database schema
 * Creates all tables, indexes, and seeds default settings
 */
export function initializeSchema(): void {
  const db = getDatabase();
  if (!db) {
    console.log('[Schema] Skipping initialization: persistence disabled');
    return;
  }

  console.log('[Schema] Initializing database schema...');

  // Check current schema version
  const currentVersion = getSchemaVersion(db);

  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    console.log(`[Schema] Schema is up to date (version ${currentVersion})`);
    return;
  }

  if (currentVersion === 0) {
    // Fresh database, create all tables
    createSchemaV1(db);
  } else {
    // Run migrations
    runMigrations(db, currentVersion);
  }

  console.log('[Schema] Schema initialization complete');
}

/**
 * Get current schema version from settings table
 */
function getSchemaVersion(db: Database.Database): number {
  try {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version') as { value: string } | undefined;
    return result ? parseInt(result.value, 10) : 0;
  } catch {
    // Settings table doesn't exist yet
    return 0;
  }
}

/**
 * Set schema version in settings table
 */
function setSchemaVersion(db: Database.Database, version: number): void {
  db.prepare(`
    INSERT INTO settings (key, value, description, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run('schema_version', version.toString(), 'Database schema version', Date.now());
}

/**
 * Create schema version 1
 * Initial schema with agents, messages, agent_configs, settings
 */
function createSchemaV1(db: Database.Database): void {
  console.log('[Schema] Creating schema version 1...');

  // Run in transaction for atomicity
  const transaction = db.transaction(() => {
    // Create settings table first (needed for version tracking)
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );
    `);

    // Create agents table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        directory TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('idle', 'running', 'completed', 'error', 'interrupted')),
        lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN ('running', 'paused', 'stopped', 'error')),
        tool_permissions TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        paused_time INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_agents_lifecycle ON agents(lifecycle_state);
      CREATE INDEX IF NOT EXISTS idx_agents_start_time ON agents(start_time DESC);
    `);

    // Create messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('assistant', 'tool_use', 'tool_result', 'result', 'error')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tool_name TEXT,
        tool_params TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
    `);

    // Create agent_configs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        directory TEXT NOT NULL,
        tool_preset TEXT NOT NULL CHECK(tool_preset IN ('read-only', 'standard', 'full-access', 'custom')),
        custom_tools TEXT,
        created_at INTEGER NOT NULL,
        last_used INTEGER,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        UNIQUE(name, directory)
      );

      CREATE INDEX IF NOT EXISTS idx_configs_last_used ON agent_configs(last_used DESC);
      CREATE INDEX IF NOT EXISTS idx_configs_favorite ON agent_configs(is_favorite DESC, last_used DESC);
    `);

    // Seed default settings
    const now = Date.now();
    db.prepare(`
      INSERT INTO settings (key, value, description, updated_at) VALUES
        ('schema_version', '1', 'Database schema version', ?),
        ('max_concurrent_agents', '20', 'Maximum number of concurrent agents', ?),
        ('max_history_items', '10', 'Number of historical agents to keep in quick access', ?),
        ('default_directory', ?, 'Default working directory for new agents', ?),
        ('poll_interval', '2000', 'UI polling interval in milliseconds', ?),
        ('message_retention_days', '30', 'Number of days to retain messages before auto-delete', ?)
      ON CONFLICT(key) DO NOTHING
    `).run(now, now, now, `"${process.env.HOME || '/tmp'}"`, now, now, now);
  });

  transaction();

  console.log('[Schema] Schema version 1 created successfully');
}

/**
 * Migrate from schema version 1 to version 2
 * Adds projects and worktrees tables with foreign keys to agents and agent_configs
 */
function migrateV1toV2(db: Database.Database): void {
  console.log('[Schema] Migrating schema from version 1 to 2...');

  // Create projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      directory TEXT NOT NULL UNIQUE,
      description TEXT,
      openspec_path TEXT,
      default_tool_permissions TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      tags TEXT,
      agent_count INTEGER NOT NULL DEFAULT 0,
      active_agent_count INTEGER NOT NULL DEFAULT 0,
      worktree_count INTEGER NOT NULL DEFAULT 0,
      last_used INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      archived_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_projects_directory ON projects(directory);
    CREATE INDEX IF NOT EXISTS idx_projects_last_used ON projects(last_used DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_favorite ON projects(is_favorite DESC, last_used DESC);
    CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived_at);
  `);

  // Create worktrees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS worktrees (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      directory TEXT NOT NULL UNIQUE,
      branch TEXT,
      is_main INTEGER NOT NULL DEFAULT 0,
      agent_count INTEGER NOT NULL DEFAULT 0,
      active_agent_count INTEGER NOT NULL DEFAULT 0,
      last_used INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_worktrees_project_id ON worktrees(project_id);
    CREATE INDEX IF NOT EXISTS idx_worktrees_directory ON worktrees(directory);
    CREATE INDEX IF NOT EXISTS idx_worktrees_last_used ON worktrees(last_used DESC);
    CREATE INDEX IF NOT EXISTS idx_worktrees_is_main ON worktrees(is_main DESC);
  `);

  // Add project_id and worktree_id columns to agents table
  db.exec(`
    ALTER TABLE agents ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
    ALTER TABLE agents ADD COLUMN worktree_id TEXT REFERENCES worktrees(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
    CREATE INDEX IF NOT EXISTS idx_agents_worktree_id ON agents(worktree_id);
  `);

  // Add project_id column to agent_configs table
  db.exec(`
    ALTER TABLE agent_configs ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_configs_project_id ON agent_configs(project_id);
  `);

  console.log('[Schema] Migration to version 2 complete');
}

/**
 * Migrate from schema version 2 to version 3
 * Adds OpenSpec cache tables (specs, changes, archives)
 */
function migrateV2toV3(db: Database.Database): void {
  console.log('[Schema] Migrating schema from version 2 to 3...');

  // Create openspec_specs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS openspec_specs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      requirement_count INTEGER NOT NULL DEFAULT 0,
      scenario_count INTEGER NOT NULL DEFAULT 0,
      git_sha TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_synced_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_specs_updated_at ON openspec_specs(updated_at DESC);
  `);

  // Create openspec_changes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS openspec_changes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed')),
      validation_status TEXT NOT NULL CHECK(validation_status IN ('pending', 'validating', 'valid', 'invalid')),
      validation_errors TEXT,
      task_count INTEGER NOT NULL DEFAULT 0,
      completed_task_count INTEGER NOT NULL DEFAULT 0,
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      proposal_content TEXT,
      design_content TEXT,
      tasks_content TEXT,
      git_sha TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_synced_at INTEGER NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      tags TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_changes_status ON openspec_changes(status);
    CREATE INDEX IF NOT EXISTS idx_changes_updated_at ON openspec_changes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_changes_favorite ON openspec_changes(is_favorite DESC, updated_at DESC);
  `);

  // Create openspec_archives table
  db.exec(`
    CREATE TABLE IF NOT EXISTS openspec_archives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      archived_at INTEGER NOT NULL,
      git_sha TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_synced_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_archives_archived_at ON openspec_archives(archived_at DESC);
  `);

  console.log('[Schema] Migration to version 3 complete');
}

/**
 * Migrate from schema version 3 to version 4
 * Adds session_id column to agents table for SDK session management
 */
function migrateV3toV4(db: Database.Database): void {
  console.log('[Schema] Migrating schema from version 3 to 4...');

  // Add session_id column to agents table (nullable for backward compatibility)
  db.exec(`
    ALTER TABLE agents ADD COLUMN session_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_agents_session_id ON agents(session_id);
  `);

  console.log('[Schema] Migration to version 4 complete');
}

/**
 * Run database migrations
 * Applies incremental schema changes from currentVersion to CURRENT_SCHEMA_VERSION
 */
function runMigrations(db: Database.Database, fromVersion: number): void {
  console.log(`[Schema] Running migrations from version ${fromVersion} to ${CURRENT_SCHEMA_VERSION}...`);

  const migrations: Array<(db: Database.Database) => void> = [
    migrateV1toV2,
    migrateV2toV3,
    migrateV3toV4,
    // Add future migrations here
  ];

  // Run migrations sequentially
  for (let version = fromVersion; version < CURRENT_SCHEMA_VERSION; version++) {
    const migrationIndex = version - 1;
    if (migrationIndex < migrations.length) {
      console.log(`[Schema] Applying migration ${version} -> ${version + 1}`);
      const transaction = db.transaction(() => {
        migrations[migrationIndex](db);
        setSchemaVersion(db, version + 1);
      });
      transaction();
    }
  }

  console.log('[Schema] Migrations complete');
}

/**
 * Drop all tables (for testing/development)
 * WARNING: This will delete all data!
 */
export function dropAllTables(): void {
  const db = getDatabase();
  if (!db) {
    return;
  }

  console.warn('[Schema] Dropping all tables (ALL DATA WILL BE LOST)...');

  db.exec(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS agents;
    DROP TABLE IF EXISTS worktrees;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS agent_configs;
    DROP TABLE IF EXISTS openspec_specs;
    DROP TABLE IF EXISTS openspec_changes;
    DROP TABLE IF EXISTS openspec_archives;
    DROP TABLE IF EXISTS settings;
  `);

  console.warn('[Schema] All tables dropped');
}

/**
 * Reset database (drop and recreate)
 * WARNING: This will delete all data!
 */
export function resetDatabase(): void {
  dropAllTables();
  initializeSchema();
  console.log('[Schema] Database reset complete');
}
