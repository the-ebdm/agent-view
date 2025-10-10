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

  return NextResponse.json({
    id: session.id,
    status: session.status,
    startTime: session.startTime,
    endTime: session.endTime,
    directory: session.directory,
    messageCount: session.messages.length,
  });
}
