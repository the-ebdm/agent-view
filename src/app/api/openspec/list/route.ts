/**
 * OpenSpec List API Route
 * GET /api/openspec/list - List all OpenSpec entities (specs, changes, archives)
 */

import { NextRequest, NextResponse } from 'next/server';
import { listSpecs, listChanges, listArchives } from '@/lib/openspec/cli-wrapper';
import type { ListEntitiesResponse } from '@/types/openspec';

// Cache configuration (30s TTL)
let cachedData: ListEntitiesResponse | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'spec' | 'change' | 'archive' | null
    const useCache = searchParams.get('cache') !== 'false';

    // Check cache
    const now = Date.now();
    if (useCache && cachedData && now - cacheTime < CACHE_TTL) {
      return NextResponse.json(filterByType(cachedData, type));
    }

    // Fetch all entities in parallel
    const [specs, changes, archives] = await Promise.all([
      listSpecs(),
      listChanges(),
      listArchives(),
    ]);

    const data: ListEntitiesResponse = {
      specs,
      changes,
      archives,
    };

    // Update cache
    cachedData = data;
    cacheTime = now;

    // Filter by type if requested
    return NextResponse.json(filterByType(data, type));
  } catch (error: any) {
    console.error('Failed to list OpenSpec entities:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to list OpenSpec entities',
        specs: [],
        changes: [],
        archives: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Filter entities by type
 */
function filterByType(
  data: ListEntitiesResponse,
  type: string | null
): ListEntitiesResponse {
  if (!type) return data;

  switch (type) {
    case 'spec':
      return { specs: data.specs, changes: [], archives: [] };
    case 'change':
      return { specs: [], changes: data.changes, archives: [] };
    case 'archive':
      return { specs: [], changes: [], archives: data.archives };
    default:
      return data;
  }
}
