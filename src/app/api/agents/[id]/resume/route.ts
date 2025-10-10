// Phase 2: Resume paused agent
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    sessionManager.resumeAgent(id);

    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found after resume' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      lifecycleState: session.lifecycleState,
    });
  } catch (error) {
    console.error('Error resuming agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume agent' },
      { status: 400 }
    );
  }
}
