import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';

const replySchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const validation = replySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message } = validation.data;

    // Get agent session to reply to
    const agent = sessionManager.getSession(id);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent has session_id
    if (!agent.sessionId) {
      return NextResponse.json(
        { error: 'Agent does not have an SDK session ID. Session management is only available for agents created after this feature was enabled.' },
        { status: 400 }
      );
    }

    // Check if agent is currently running
    // Allow replies to running agents (queuing behavior - SDK handles sequential processing)
    const isRunning = executionManager.hasAgent(id);

    if (isRunning) {
      // For now, prevent concurrent executions on same agent
      // TODO: Implement message queue for true queuing behavior
      return NextResponse.json(
        { error: 'Agent is currently running. Please wait for completion before sending another message.' },
        { status: 409 }
      );
    }

    // Verify agent is in a resumable state
    if (agent.lifecycleState === 'stopped' && agent.status === 'interrupted') {
      return NextResponse.json(
        { error: 'Agent was stopped and cannot accept replies. Use fork to branch from this point.' },
        { status: 400 }
      );
    }

    // Update agent lifecycle state to running
    // This reuses the SAME agent - no new agent created
    if (agent.lifecycleState === 'paused') {
      // Agent is paused, use resumeAgent
      sessionManager.resumeAgent(id);
    } else {
      // Agent is completed/stopped - manually update state to resume conversation
      agent.lifecycleState = 'running';
      agent.status = 'running';
      agent.pausedTime = undefined;
      agent.endTime = undefined;
    }

    // Start execution with SDK session resumption on the SAME agent
    await executionManager.startAgent(id, {
      prompt: message,
      directory: agent.directory,
      toolPermissions: agent.toolPermissions,
      resumeFromSessionId: agent.sessionId, // Resume from agent's own session
    });

    return NextResponse.json({
      id: agent.id, // Same agent ID
      name: agent.name, // Same agent name
      status: 'running',
      lifecycleState: 'running',
      sessionId: agent.sessionId,
      continued: true, // Flag to indicate this is a continuation, not a new agent
    });
  } catch (error) {
    console.error('Error replying to agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reply to agent' },
      { status: 500 }
    );
  }
}
