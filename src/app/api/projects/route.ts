import { NextResponse } from 'next/server';
import { getProjectsRepository } from '@/lib/database/repositories/projects';
import { isPersistenceEnabled } from '@/lib/database';
import { discoverProject } from '@/lib/services/project-discovery';

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

/**
 * POST /api/projects
 * Add a new project by directory path
 */
export async function POST(request: Request) {
  try {
    if (!isPersistenceEnabled()) {
      return NextResponse.json(
        { error: 'Database persistence is not enabled' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { directory } = body;

    if (!directory || typeof directory !== 'string') {
      return NextResponse.json(
        { error: 'Directory path is required' },
        { status: 400 }
      );
    }

    // Use the project discovery service to add the project
    const result = await discoverProject(directory);

    if (!result || !result.project) {
      return NextResponse.json(
        { error: 'Failed to add project - directory may not exist or be invalid' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      project: result.project,
      worktree: result.worktree,
      message: 'Project added successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add project' },
      { status: 500 }
    );
  }
}
