import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorktreesRepository } from '@/lib/database/repositories/worktrees';
import { isPersistenceEnabled } from '@/lib/database';

/**
 * GET /api/worktrees/[id]
 * Get worktree details by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Database persistence is not enabled' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const worktreesRepo = getWorktreesRepository();
    const worktree = worktreesRepo.findById(id);

    if (!worktree) {
      return NextResponse.json(
        { error: 'Worktree not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ worktree });
  } catch (error) {
    console.error('Error fetching worktree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch worktree' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  name: z.string().optional(),
  branch: z.string().optional(),
  isMain: z.boolean().optional(),
});

/**
 * PATCH /api/worktrees/[id]
 * Update worktree
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Database persistence is not enabled' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const worktreesRepo = getWorktreesRepository();

    // Check if worktree exists
    const existing = worktreesRepo.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Worktree not found' },
        { status: 404 }
      );
    }

    // Update worktree
    worktreesRepo.update(id, validation.data);

    // Return updated worktree
    const updated = worktreesRepo.findById(id);
    return NextResponse.json({ worktree: updated });
  } catch (error) {
    console.error('Error updating worktree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update worktree' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worktrees/[id]
 * Delete worktree permanently
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Database persistence is not enabled' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const worktreesRepo = getWorktreesRepository();

    // Check if worktree exists
    const existing = worktreesRepo.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Worktree not found' },
        { status: 404 }
      );
    }

    // Delete worktree
    worktreesRepo.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Worktree deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting worktree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete worktree' },
      { status: 500 }
    );
  }
}
