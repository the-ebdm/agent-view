/**
 * API Route: /api/configs/migrate
 *
 * Migrate localStorage configs to database
 * - POST: Import array of configs from localStorage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigsRepository, isPersistenceEnabled } from '@/lib/database';
import type { SavedAgentConfig } from '@/lib/agent-templates';

export const dynamic = 'force-dynamic';

/**
 * POST /api/configs/migrate
 * Migrate configs from localStorage to database
 *
 * Body: { configs: SavedAgentConfig[] }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Persistence is disabled' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { error: 'Invalid request: configs must be an array' },
        { status: 400 }
      );
    }

    const configsRepo = getConfigsRepository();
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const config of configs) {
      try {
        // Ensure config has all required fields
        if (!config.name || !config.prompt || !config.directory || !config.toolPreset) {
          results.skipped++;
          results.errors.push(`Skipped config "${config.name || 'unnamed'}": missing required fields`);
          continue;
        }

        // Create with original ID and timestamps if available
        const configToImport: SavedAgentConfig = {
          id: config.id || `config-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: config.name,
          prompt: config.prompt,
          directory: config.directory,
          toolPreset: config.toolPreset,
          customTools: config.customTools,
          createdAt: config.createdAt || Date.now(),
          lastUsed: config.lastUsed,
        };

        configsRepo.create(configToImport);
        results.imported++;
      } catch (error: unknown) {
        // If config already exists (unique constraint), skip it
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes('already exists')) {
          results.skipped++;
          results.errors.push(`Skipped "${config.name}": already exists`);
        } else {
          results.skipped++;
          results.errors.push(`Failed to import "${config.name}": ${errorMessage}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[API] Failed to migrate configs:', error);
    return NextResponse.json(
      { error: 'Failed to migrate configurations' },
      { status: 500 }
    );
  }
}
