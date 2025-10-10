// Phase 2: Pause agent execution
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    sessionManager.pauseAgent(id);

    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found after pause' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      lifecycleState: session.lifecycleState,
      pausedTime: session.pausedTime,
    });
  } catch (error) {
    console.error('Error pausing agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pause agent' },
      { status: 400 }
    );
  }
}
