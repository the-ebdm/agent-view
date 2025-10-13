// Pause agent execution with SDK session preservation
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get agent session to verify it has a session_id
    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent has session_id (required for pause/resume)
    if (!session.sessionId) {
      return NextResponse.json(
        { error: 'Agent does not have an SDK session ID. Pause/resume is only available for agents created after session management was enabled.' },
        { status: 400 }
      );
    }

    // Check if agent is running
    if (session.lifecycleState !== 'running') {
      return NextResponse.json(
        { error: `Cannot pause agent in state: ${session.lifecycleState}` },
        { status: 400 }
      );
    }

    // Gracefully stop agent execution
    await executionManager.stopAgent(id);

    // Update session manager state to paused (preserving session_id)
    sessionManager.pauseAgent(id);

    // Get updated session
    const updatedSession = sessionManager.getSession(id);
    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Agent not found after pause' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedSession.id,
      lifecycleState: updatedSession.lifecycleState,
      pausedTime: updatedSession.pausedTime,
      sessionId: updatedSession.sessionId,
    });
  } catch (error) {
    console.error('Error pausing agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pause agent' },
      { status: 400 }
    );
  }
}
