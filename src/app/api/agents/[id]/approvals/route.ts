import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';

/**
 * GET /api/agents/:id/approvals
 * Fetch pending tool approval requests for an agent
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = sessionManager.getSession(id);

    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const approvals = sessionManager.getPendingApprovals(id);

    return NextResponse.json({
      approvals,
      count: approvals.length,
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
