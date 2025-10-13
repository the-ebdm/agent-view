import { NextResponse } from 'next/server';
import { getProjectsRepository } from '@/lib/database/repositories/projects';
import { isPersistenceEnabled } from '@/lib/database';

/**
 * GET /api/projects
 * List all non-archived projects
 */
export async function GET() {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Database persistence is not enabled' },
        { status: 503 }
      );
    }

    const projectsRepo = getProjectsRepository();
    const projects = projectsRepo.findAll();

    return NextResponse.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
