/**
 * OpenSpec Archive API Route
 * GET /api/openspec/archive/[id] - Read archived changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { readOpenSpecFile } from '@/lib/openspec/fs-operations';
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

    const archivePath = path.join('changes', 'archive', id);

    // If specific file requested, return its content
    if (file) {
      const filePath = path.join(archivePath, `${file}.md`);
      const content = await readOpenSpecFile(filePath, directory || undefined);

      return NextResponse.json({
        file,
        content,
      });
    }

    // Read all archive files directly
    const [proposal, design, tasks] = await Promise.allSettled([
      readOpenSpecFile(path.join(archivePath, 'proposal.md'), directory || undefined),
      readOpenSpecFile(path.join(archivePath, 'design.md'), directory || undefined),
      readOpenSpecFile(path.join(archivePath, 'tasks.md'), directory || undefined),
    ]);

    return NextResponse.json({
      id,
      path: archivePath,
      proposal: proposal.status === 'fulfilled' ? proposal.value : null,
      design: design.status === 'fulfilled' ? design.value : null,
      tasks: tasks.status === 'fulfilled' ? tasks.value : null,
    });
  } catch (error: unknown) {
    const resolvedParams = await params;
    console.error(`Failed to get archive ${resolvedParams.id}:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Failed to get archive' },
      { status: 404 }
    );
  }
}
