/**
 * API Route: /api/configs/recent
 *
 * Get recently used agent configurations
 * - GET: List recent configs (sorted by lastUsed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigsRepository, isPersistenceEnabled } from '@/lib/database';

export const dynamic = 'force-dynamic';

/**
 * GET /api/configs/recent
 * Get recently used configurations
 */
export async function GET(request: NextRequest) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Persistence is disabled' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const configsRepo = getConfigsRepository();
    const configs = configsRepo.findRecent(limit);

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[API] Failed to get recent configs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve recent configurations' },
      { status: 500 }
    );
  }
}
