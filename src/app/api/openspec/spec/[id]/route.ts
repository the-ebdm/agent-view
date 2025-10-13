/**
 * OpenSpec Spec API Route
 * GET/PUT /api/openspec/spec/[id] - Read and update capability specs
 */

import { NextRequest, NextResponse } from 'next/server';
import { readOpenSpecFile, writeOpenSpecFile } from '@/lib/openspec/fs-operations';
import { showSpec } from '@/lib/openspec/cli-wrapper';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get('directory'); // Project directory

    // Try to get spec details from CLI first
    try {
      const specData = await showSpec(id);
      return NextResponse.json(specData);
    } catch {
      // Fallback to direct file read
      const specPath = path.join('specs', `${id}.md`);
      const content = await readOpenSpecFile(specPath, directory || undefined);

      return NextResponse.json({
        id,
        name: id,
        path: specPath,
        content,
      });
    }
  } catch (error: unknown) {
    const resolvedParams = await params;
    console.error(`Failed to get spec ${resolvedParams.id}:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Failed to get spec' },
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
    const { content, directory } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Write updated spec content
    const specPath = path.join('specs', `${id}.md`);
    await writeOpenSpecFile(specPath, content, directory || undefined);

    return NextResponse.json({
      success: true,
      message: `Spec ${id} updated successfully`,
    });
  } catch (error: unknown) {
    const resolvedParams = await params;
    console.error(`Failed to update spec ${resolvedParams.id}:`, error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Failed to update spec' },
      { status: 500 }
    );
  }
}
