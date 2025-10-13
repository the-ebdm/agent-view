/**
 * OpenSpec Sync API Route
 * POST /api/openspec/sync - Manually trigger sync from filesystem to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncFromFilesystem } from '@/lib/openspec/sync';

export async function POST(request: NextRequest) {
  try {
    console.log('[OpenSpec API] Manual sync triggered');

    // Trigger sync
    const result = await syncFromFilesystem({ force: true });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        stats: result.stats,
        duration: result.duration,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          stats: result.stats,
          errors: result.errors,
          duration: result.duration,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[OpenSpec API] Sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Sync failed',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/openspec/sync - Get sync status
 */
export async function GET(request: NextRequest) {
  try {
    const { getSyncStatus } = await import('@/lib/openspec/sync');
    const status = getSyncStatus();

    return NextResponse.json({
      lastSyncedAt: status.lastSyncedAt?.toISOString() || null,
      isStale: status.isStale,
      counts: {
        specs: status.specsCount,
        changes: status.changesCount,
        archives: status.archivesCount,
      },
    });
  } catch (error: any) {
    console.error('[OpenSpec API] Failed to get sync status:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}
