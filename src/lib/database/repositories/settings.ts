/**
 * Settings Repository
 *
 * Data access layer for application settings.
 * Provides simple key-value storage with prepared statements.
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../client';

export interface Setting {
  key: string;
  value: string;
  description?: string;
  updated_at: number;
}

export class SettingsRepository {
  private db: Database.Database | null;

  // Prepared statements (cached for performance)
  private getStmt: Database.Statement | null = null;
  private setStmt: Database.Statement | null = null;
  private getAllStmt: Database.Statement | null = null;

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

    this.getStmt = this.db.prepare(`
      SELECT * FROM settings WHERE key = ?
    `);

    this.setStmt = this.db.prepare(`
      INSERT INTO settings (key, value, description, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    this.getAllStmt = this.db.prepare(`
      SELECT * FROM settings ORDER BY key ASC
    `);
  }

  /**
   * Get setting value by key
   * Returns undefined if not found
   */
  get(key: string): string | undefined {
    if (!this.db || !this.getStmt) {
      console.warn('[SettingsRepository] Database not available, skipping get');
      return undefined;
    }

    try {
      const row = this.getStmt.get(key) as Setting | undefined;
      return row?.value;
    } catch (error) {
      console.error('[SettingsRepository] Error getting setting:', error);
      return undefined;
    }
  }

  /**
   * Set setting value
   * Upserts (insert or update)
   */
  set(key: string, value: string, description?: string): void {
    if (!this.db || !this.setStmt) {
      console.warn('[SettingsRepository] Database not available, skipping set');
      return;
    }

    try {
      this.setStmt.run(key, value, description || null, Date.now());
    } catch (error) {
      console.error('[SettingsRepository] Error setting value:', error);
    }
  }

  /**
   * Get all settings as Record<string, string>
   */
  getAll(): Record<string, string> {
    if (!this.db || !this.getAllStmt) {
      console.warn('[SettingsRepository] Database not available, skipping getAll');
      return {};
    }

    try {
      const rows = this.getAllStmt.all() as Setting[];
      const settings: Record<string, string> = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      return settings;
    } catch (error) {
      console.error('[SettingsRepository] Error getting all settings:', error);
      return {};
    }
  }

  /**
   * Get setting as number
   * Returns default value if not found or cannot parse
   */
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key);
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get setting as boolean
   * Returns default value if not found
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key);
    if (value === undefined) {
      return defaultValue;
    }
    return value === 'true' || value === '1';
  }
}

// Singleton instance
let repositoryInstance: SettingsRepository | null = null;

/**
 * Get SettingsRepository instance
 */
export function getSettingsRepository(): SettingsRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SettingsRepository();
  }
  return repositoryInstance;
}
