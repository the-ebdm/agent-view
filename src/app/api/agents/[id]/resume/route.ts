// Resume paused agent using SDK session resumption
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';

const resumeSchema = z.object({
  message: z.string().optional(), // Optional message to continue conversation
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse optional message from request body
    const body = await request.json().catch(() => ({}));
    const validation = resumeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Get paused agent session
    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent has session_id (required for resume)
    if (!session.sessionId) {
      return NextResponse.json(
        { error: 'Agent does not have an SDK session ID. Pause/resume is only available for agents created after session management was enabled.' },
        { status: 400 }
      );
    }

    // Check if agent is paused
    if (session.lifecycleState !== 'paused') {
      return NextResponse.json(
        { error: `Cannot resume agent in state: ${session.lifecycleState}` },
        { status: 400 }
      );
    }

    // Update session manager state to running
    sessionManager.resumeAgent(id);

    // Start new execution using SDK session resumption
    // Use optional message or empty prompt to continue
    const resumePrompt = message || '';

    await executionManager.startAgent(id, {
      prompt: resumePrompt,
      directory: session.directory,
      toolPermissions: session.toolPermissions,
      resumeFromSessionId: session.sessionId, // Resume from existing session
    });

    // Get updated session
    const updatedSession = sessionManager.getSession(id);
    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Agent not found after resume' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedSession.id,
      lifecycleState: updatedSession.lifecycleState,
      sessionId: updatedSession.sessionId,
      resumed: true,
    });
  } catch (error) {
    console.error('Error resuming agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume agent' },
      { status: 500 }
    );
  }
}
