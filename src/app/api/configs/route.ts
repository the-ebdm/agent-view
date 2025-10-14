/**
 * API Route: /api/configs
 *
 * Manage saved agent configurations
 * - GET: List all saved configs
 * - POST: Create new config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigsRepository, isPersistenceEnabled } from '@/lib/database';
import type { SavedAgentConfig } from '@/lib/agent-templates';

export const dynamic = 'force-dynamic';

/**
 * GET /api/configs
 * List all saved agent configurations
 */
export async function GET(request: NextRequest) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Persistence is disabled' },
        { status: 503 }
      );
    }

    const configsRepo = getConfigsRepository();
    const { searchParams } = new URL(request.url);
    const favoritesOnly = searchParams.get('favorites') === 'true';

    const allConfigs = configsRepo.findAll();
    // Note: Configs repository doesn't support filtering favorites yet
    // For now, return all configs (favorites are sorted first by SQL query)
    const configs = allConfigs;

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[API] Failed to get configs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/configs
 * Create new saved agent configuration
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
    const { name, prompt, directory, toolPreset, customTools } = body;

    // Validate required fields
    if (!name || !prompt || !directory || !toolPreset) {
      return NextResponse.json(
        { error: 'Missing required fields: name, prompt, directory, toolPreset' },
        { status: 400 }
      );
    }

    const configsRepo = getConfigsRepository();

    const config: SavedAgentConfig = {
      id: `config-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name,
      prompt,
      directory,
      toolPreset,
      customTools,
      createdAt: Date.now(),
    };

    const created = configsRepo.create(config);

    return NextResponse.json({ config: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('[API] Failed to create config:', error);

    // Handle unique constraint violation
    if (error instanceof Error ? error.message : String(error)?.includes('already exists')) {
      return NextResponse.json(
        { error: 'Configuration with this name and directory already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
}
