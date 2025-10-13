import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';
import { getMessagesRepository, isPersistenceEnabled } from '@/lib/database';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]/messages
 * Fetch message history for a specific agent
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Try to get messages from in-memory session first
    const session = sessionManager.getHistoricalSession(id);
    if (session) {
      return NextResponse.json({
        messages: session.messages,
        messageCount: session.messages.length,
        source: 'memory'
      });
    }

    // If not in memory, try database
    if (isPersistenceEnabled()) {
      const messagesRepo = getMessagesRepository();
      const messages = messagesRepo.findByAgentId(id);

      return NextResponse.json({
        messages,
        messageCount: messages.length,
        source: 'database'
      });
    }

    // Agent not found
    return NextResponse.json(
      { error: 'Agent not found or messages expired' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching agent messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
