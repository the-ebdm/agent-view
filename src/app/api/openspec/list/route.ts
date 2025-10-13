/**
 * OpenSpec List API Route
 * GET /api/openspec/list - List all OpenSpec entities (specs, changes, archives)
 *
 * Now powered by database cache with automatic staleness detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { listSpecs, listChanges, listArchives } from '@/lib/openspec/cli-wrapper';
import { getOpenSpecRepository } from '@/lib/database/repositories/openspec';
import { syncFromFilesystem, needsSync, getSyncStatus } from '@/lib/openspec/sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'spec' | 'change' | 'archive' | null
    const useCache = searchParams.get('cache') !== 'false';
    const forceSync = searchParams.get('sync') === 'true';

    // Get repository instance
    const repo = getOpenSpecRepository();

    // Check if database needs sync or forced sync requested
    if (forceSync || (useCache && needsSync())) {
      console.log('[OpenSpec API] Database is stale or sync forced, triggering sync...');
      try {
        await syncFromFilesystem();
      } catch (syncError) {
        console.error('[OpenSpec API] Sync failed, falling back to filesystem:', syncError);
        return await fallbackToFilesystem(type);
      }
    }

    // Query database (fast!)
    try {
      const [specs, changes, archives] = await Promise.all([
        type === 'spec' || !type ? repo.listSpecs() : [],
        type === 'change' || !type ? repo.listChanges() : [],
        type === 'archive' || !type ? repo.listArchives() : [],
      ]);

      const syncStatus = getSyncStatus();

      const data = {
        specs,
        changes,
        archives,
        syncedAt: syncStatus.lastSyncedAt?.toISOString() || null,
      };

      return NextResponse.json(data);
    } catch (dbError) {
      console.error('[OpenSpec API] Database query failed, falling back to filesystem:', dbError);
      return await fallbackToFilesystem(type);
    }
  } catch (error: unknown) {
    console.error('[OpenSpec API] Failed to list OpenSpec entities:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error) || 'Failed to list OpenSpec entities',
        specs: [],
        changes: [],
        archives: [],
        syncedAt: null,
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback to filesystem if database fails
 */
async function fallbackToFilesystem(type: string | null) {
  console.warn('[OpenSpec API] Using filesystem fallback');

  const [specs, changes, archives] = await Promise.all([
    type === 'spec' || !type ? listSpecs() : [],
    type === 'change' || !type ? listChanges() : [],
    type === 'archive' || !type ? listArchives() : [],
  ]);

  return NextResponse.json({
    specs,
    changes,
    archives,
    syncedAt: null,
    fallback: true,
  });
}

