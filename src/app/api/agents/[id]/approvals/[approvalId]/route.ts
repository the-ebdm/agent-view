import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';

const actionSchema = z.object({
  action: z.enum(['approve', 'deny']),
});

/**
 * POST /api/agents/:id/approvals/:approvalId
 * Approve or deny a pending tool permission request
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  try {
    const { id, approvalId } = await params;
    const body = await request.json();

    // Validate request body
    const validation = actionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    // Check if agent exists
    const session = sessionManager.getSession(id);
    if (!session) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if approval exists
    const approvals = sessionManager.getPendingApprovals(id);
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    // Process action
    if (action === 'approve') {
      sessionManager.approveRequest(id, approvalId);
      console.log(`[API] Approved ${approval.toolName} request for agent ${id}`);
    } else {
      sessionManager.denyRequest(id, approvalId);
      console.log(`[API] Denied ${approval.toolName} request for agent ${id}`);
    }

    return NextResponse.json({
      success: true,
      action,
      approvalId,
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: 500 }
    );
  }
}
