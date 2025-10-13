import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';

const forkSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  name: z.string().optional(), // Optional custom name for forked agent
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const validation = forkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prompt, name } = validation.data;

    // Get original agent session
    const originalAgent = sessionManager.getSession(id);
    if (!originalAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if agent has session_id
    if (!originalAgent.sessionId) {
      return NextResponse.json(
        { error: 'Agent does not have an SDK session ID. Session management is only available for agents created after this feature was enabled.' },
        { status: 400 }
      );
    }

    // Generate new agent ID for the fork
    const newAgentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine name for forked agent
    // Use hyphen instead of parentheses for name (validation only allows alphanumeric, spaces, hyphens)
    const forkedName = name || `${originalAgent.name} - fork`;

    // Create new session for the fork
    const newSession = await sessionManager.createSession(
      newAgentId,
      prompt,
      originalAgent.directory,
      forkedName,
      originalAgent.toolPermissions
    );

    // Start agent execution with SDK session fork
    await executionManager.startAgent(newAgentId, {
      prompt,
      directory: originalAgent.directory,
      toolPermissions: originalAgent.toolPermissions,
      forkFromSessionId: originalAgent.sessionId, // Fork from parent session
    });

    return NextResponse.json({
      id: newAgentId,
      name: newSession.name,
      status: 'running',
      lifecycleState: newSession.lifecycleState,
      toolPermissions: newSession.toolPermissions,
      parentAgentId: id,
      forkedFrom: originalAgent.name,
    });
  } catch (error) {
    console.error('Error creating fork:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create fork' },
      { status: 500 }
    );
  }
}
