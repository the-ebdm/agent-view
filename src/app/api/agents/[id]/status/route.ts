import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessionManager.getSession(id);

  if (!session) {
    return NextResponse.json(
      { error: 'Agent not found' },
      { status: 404 }
    );
  }

  // Phase 2: Include metrics and lifecycle state
  const metrics = sessionManager.getAgentMetrics(id);

  return NextResponse.json({
    id: session.id,
    name: session.name,
    status: session.status,
    lifecycleState: session.lifecycleState,
    toolPermissions: session.toolPermissions,
    startTime: session.startTime,
    endTime: session.endTime,
    pausedTime: session.pausedTime,
    directory: session.directory,
    messageCount: session.messages.length,
    metrics,
  });
}
