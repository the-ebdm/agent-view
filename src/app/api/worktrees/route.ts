import { NextResponse } from 'next/server';
import { getWorktreesRepository } from '@/lib/database/repositories/worktrees';
import { isPersistenceEnabled } from '@/lib/database';

/**
 * GET /api/worktrees?projectId=xxx
 * List worktrees, optionally filtered by project ID
 */
export async function GET(request: Request) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Database persistence is not enabled' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const worktreesRepo = getWorktreesRepository();
    const worktrees = projectId
      ? worktreesRepo.findByProjectId(projectId)
      : worktreesRepo.findAll();

    return NextResponse.json({
      worktrees,
      count: worktrees.length,
    });
  } catch (error) {
    console.error('Error fetching worktrees:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch worktrees' },
      { status: 500 }
    );
  }
}
