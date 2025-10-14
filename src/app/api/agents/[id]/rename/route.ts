// Phase 2: Rename agent
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';

const renameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = renameSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    sessionManager.renameAgent(id, name);

    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found after rename' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      name: session.name,
    });
  } catch (error) {
    console.error('Error renaming agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rename agent' },
      { status: 400 }
    );
  }
}
