import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProjectsRepository } from '@/lib/database/repositories/projects';
import { isPersistenceEnabled } from '@/lib/database';

/**
 * GET /api/projects/[id]
 * Get project details by ID
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
    const projectsRepo = getProjectsRepository();
    const project = projectsRepo.findById(id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  openspecPath: z.string().optional(),
  defaultToolPermissions: z.record(z.any()).optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * PATCH /api/projects/[id]
 * Update project
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

    const projectsRepo = getProjectsRepository();

    // Check if project exists
    const existing = projectsRepo.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update project
    projectsRepo.update(id, validation.data);

    // Return updated project
    const updated = projectsRepo.findById(id);
    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Archive project (soft delete)
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
    const projectsRepo = getProjectsRepository();

    // Check if project exists
    const existing = projectsRepo.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Archive project
    projectsRepo.archive(id);

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    console.error('Error archiving project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to archive project' },
      { status: 500 }
    );
  }
}
