/**
 * API Route: /api/configs/[id]
 *
 * Manage individual saved agent configuration
 * - GET: Get config by ID
 * - DELETE: Delete config
 * - PATCH: Update config (toggle favorite, update tags, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigsRepository, isPersistenceEnabled } from '@/lib/database';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/configs/[id]
 * Get specific config by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Persistence is disabled' },
        { status: 503 }
      );
    }

    const configsRepo = getConfigsRepository();
    const config = configsRepo.findById(id);

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('[API] Failed to get config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/configs/[id]
 * Delete saved configuration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Persistence is disabled' },
        { status: 503 }
      );
    }

    const configsRepo = getConfigsRepository();
    configsRepo.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete config:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/configs/[id]
 * Update configuration (toggle favorite, update tags, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Persistence is disabled' },
        { status: 503 }
      );
    }

    const configsRepo = getConfigsRepository();

    // Handle toggle favorite
    if (body.action === 'toggle-favorite') {
      const updated = configsRepo.toggleFavorite(id);
      return NextResponse.json({ config: updated });
    }

    // Handle update last used
    if (body.action === 'update-last-used') {
      configsRepo.updateLastUsed(id);
      const config = configsRepo.findById(id);
      return NextResponse.json({ config });
    }

    // Handle general updates (tags, name, etc.)
    const { tags, name, prompt, toolPreset, customTools } = body;
    const updates: any = {};

    if (tags !== undefined) updates.tags = tags;
    if (name !== undefined) updates.name = name;
    if (prompt !== undefined) updates.prompt = prompt;
    if (toolPreset !== undefined) updates.tool_preset = toolPreset;
    if (customTools !== undefined) updates.custom_tools = customTools;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Note: ConfigsRepository doesn't have a general update method yet
    // For now, just support toggle-favorite and update-last-used actions
    return NextResponse.json(
      { error: 'General config updates not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('[API] Failed to update config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
