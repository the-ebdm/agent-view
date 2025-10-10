// Phase 2: Stop agent (graceful shutdown)
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Stop execution via execution manager (gracefully closes generator)
    await executionManager.stopAgent(id);

    // Update session metadata
    sessionManager.stopAgent(id);

    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found after stop' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      lifecycleState: session.lifecycleState,
      endTime: session.endTime,
    });
  } catch (error) {
    console.error('Error stopping agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop agent' },
      { status: 400 }
    );
  }
}
