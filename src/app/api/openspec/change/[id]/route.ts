/**
 * OpenSpec Change API Route
 * GET/PUT/DELETE /api/openspec/change/[id] - Read, update, and delete changes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  readOpenSpecFile,
  writeOpenSpecFile,
  deleteOpenSpec,
  exists,
} from '@/lib/openspec/fs-operations';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file'); // 'proposal' | 'design' | 'tasks' | null
    const directory = searchParams.get('directory'); // Project directory

    const changePath = path.join('changes', id);

    // If specific file requested, return its content
    if (file) {
      const filePath = path.join(changePath, `${file}.md`);
      const content = await readOpenSpecFile(filePath, directory || undefined);

      return NextResponse.json({
        file,
        content,
      });
    }

    // Read all change files directly
    const [proposal, design, tasks] = await Promise.allSettled([
      readOpenSpecFile(path.join(changePath, 'proposal.md'), directory || undefined),
      readOpenSpecFile(path.join(changePath, 'design.md'), directory || undefined),
      readOpenSpecFile(path.join(changePath, 'tasks.md'), directory || undefined),
    ]);

    return NextResponse.json({
      id,
      path: changePath,
      proposal: proposal.status === 'fulfilled' ? proposal.value : null,
      design: design.status === 'fulfilled' ? design.value : null,
      tasks: tasks.status === 'fulfilled' ? tasks.value : null,
    });
  } catch (error: unknown) {
    const resolvedParams = await params;
    console.error(`Failed to get change ${resolvedParams.id}:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Failed to get change' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, file, directory } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    if (!file || !['proposal', 'design', 'tasks'].includes(file)) {
      return NextResponse.json(
        { error: 'File must be one of: proposal, design, tasks' },
        { status: 400 }
      );
    }

    // Write updated file content
    const filePath = path.join('changes', id, `${file}.md`);
    await writeOpenSpecFile(filePath, content, directory || undefined);

    return NextResponse.json({
      success: true,
      message: `Change ${id} ${file} updated successfully`,
    });
  } catch (error: unknown) {
    const resolvedParams = await params;
    console.error(`Failed to update change ${resolvedParams.id}:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Failed to update change' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get('directory'); // Project directory

    const changePath = path.join('changes', id);

    // Check if change exists
    const changeExists = await exists(changePath, directory || undefined);
    if (!changeExists) {
      return NextResponse.json(
        { error: `Change ${id} not found` },
        { status: 404 }
      );
    }

    // Delete change directory
    await deleteOpenSpec(changePath, directory || undefined);

    return NextResponse.json({
      success: true,
      message: `Change ${id} deleted successfully`,
    });
  } catch (error: unknown) {
    const resolvedParams = await params;
    console.error(`Failed to delete change ${resolvedParams.id}:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Failed to delete change' },
      { status: 500 }
    );
  }
}
