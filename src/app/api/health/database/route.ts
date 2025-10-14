/**
 * Database Health Check API Endpoint
 *
 * GET /api/health/database
 *
 * Returns database connectivity status, schema version, and statistics.
 */

import { NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/lib/database/client';
import { getAgentsRepository } from '@/lib/database/repositories/agents';
import { getMessagesRepository } from '@/lib/database/repositories/messages';
import { getProjectsRepository } from '@/lib/database/repositories/projects';
import { getWorktreesRepository } from '@/lib/database/repositories/worktrees';
import { existsSync, statSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Database health check response
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'error';
  database: {
    connected: boolean;
    schemaVersion: number | null;
    expectedVersion: number;
    path: string | null;
    sizeBytes: number | null;
    sizeMB: string | null;
  };
  lastMaintenance?: {
    vacuum: string | null;
    backup: string | null;
  };
  entities?: {
    agents: number;
    projects: number;
    worktrees: number;
    messages: number;
    openspecEntities: number;
  };
  error?: string;
}

export async function GET() {
  try {
    const health = getDatabaseHealth();

    // Expected schema version (should match latest migration)
    const EXPECTED_SCHEMA_VERSION = 4;

    // Build response based on health status
    const response: HealthCheckResponse = {
      status: health.status,
      database: {
        connected: health.enabled && health.status !== 'error',
        schemaVersion: health.schemaVersion,
        expectedVersion: EXPECTED_SCHEMA_VERSION,
        path: health.path,
        sizeBytes: health.size,
        sizeMB: health.size ? (health.size / (1024 * 1024)).toFixed(2) : null,
      },
    };

    // Add error if present
    if (health.error) {
      response.error = health.error;
    }

    // Get entity counts if database is healthy
    if (health.status === 'healthy') {
      try {
        const agentsRepo = getAgentsRepository();
        const messagesRepo = getMessagesRepository();
        const projectsRepo = getProjectsRepository();
        const worktreesRepo = getWorktreesRepository();

        // Count entities (using repository methods)
        const agents = agentsRepo.findAll().length;
        const projects = projectsRepo.findAll().length;
        const worktrees = worktreesRepo.findAll().length;

        // For messages, we need to count across all agents
        // Since there's no findAll for messages, we'll estimate from active agents
        let totalMessages = 0;
        const allAgents = agentsRepo.findAll();
        for (const agent of allAgents) {
          totalMessages += messagesRepo.countByAgentId(agent.id);
        }

        // Count OpenSpec entities (changes, entities, delta entries)
        // We'll need to query the database directly for these
        const { getDatabase } = await import('@/lib/database/client');
        const db = getDatabase();
        let openspecEntities = 0;
        if (db) {
          try {
            const changesCount = db.prepare('SELECT COUNT(*) as count FROM openspec_changes').get() as { count: number };
            const entitiesCount = db.prepare('SELECT COUNT(*) as count FROM openspec_entities').get() as { count: number };
            const deltasCount = db.prepare('SELECT COUNT(*) as count FROM openspec_delta_entries').get() as { count: number };
            openspecEntities = changesCount.count + entitiesCount.count + deltasCount.count;
          } catch {
            // Tables may not exist yet
            openspecEntities = 0;
          }
        }

        response.entities = {
          agents,
          projects,
          worktrees,
          messages: totalMessages,
          openspecEntities,
        };
      } catch (error) {
        console.error('[Health Check] Error counting entities:', error);
        // Continue without entity counts
      }

      // Get last maintenance timestamps
      try {
        const backupDir = process.env.BACKUP_PATH || `${homedir()}/.config/agent-view/backups`;
        let lastBackup: string | null = null;

        if (existsSync(backupDir)) {
          const backupFiles = readdirSync(backupDir)
            .filter(file => file.startsWith('database-') && file.endsWith('.sqlite'))
            .map(file => ({
              name: file,
              path: join(backupDir, file),
              mtime: statSync(join(backupDir, file)).mtime,
            }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

          if (backupFiles.length > 0) {
            lastBackup = backupFiles[0].mtime.toISOString();
          }
        }

        // We don't track vacuum timestamps in settings yet, so this will be null
        response.lastMaintenance = {
          vacuum: null,
          backup: lastBackup,
        };
      } catch (error) {
        console.error('[Health Check] Error getting maintenance timestamps:', error);
        // Continue without maintenance info
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        database: {
          connected: false,
          schemaVersion: null,
          expectedVersion: 4,
          path: null,
          sizeBytes: null,
          sizeMB: null,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      } as HealthCheckResponse,
      { status: 500 }
    );
  }
}
