// Phase 2: List all active agents
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let agents = sessionManager.getAllActiveAgents();

    // Filter by status if provided
    if (statusFilter) {
      agents = agents.filter(agent => {
        if (statusFilter === 'running') return agent.lifecycleState === 'running';
        if (statusFilter === 'paused') return agent.lifecycleState === 'paused';
        if (statusFilter === 'stopped') return agent.lifecycleState === 'stopped';
        return true;
      });
    }

    // Return agents with metrics
    const agentsWithMetrics = agents.map(agent => {
      const metrics = sessionManager.getAgentMetrics(agent.id);
      return {
        id: agent.id,
        name: agent.name,
        prompt: agent.prompt,
        directory: agent.directory,
        status: agent.status,
        lifecycleState: agent.lifecycleState,
        toolPermissions: agent.toolPermissions,
        startTime: agent.startTime,
        messageCount: agent.messages.length,
        metrics,
      };
    });

    return NextResponse.json({ agents: agentsWithMetrics });
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list agents' },
      { status: 500 }
    );
  }
}
