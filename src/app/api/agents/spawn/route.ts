import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';
import type { ToolPermission } from '@/types/agent';

// Phase 2: Updated schema with name and toolPermissions
const spawnSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  directory: z.string().min(1, 'Directory is required'),
  name: z.string().optional(),
  toolPermissions: z.object({
    preset: z.enum(['read-only', 'standard', 'full-access', 'custom']),
    tools: z.array(z.enum(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task', 'WebFetch', 'WebSearch'])).optional(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validation = spawnSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prompt, directory, name, toolPermissions } = validation.data;

    // Generate unique agent ID
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Phase 2: Create session with name and permissions
    const session = sessionManager.createSession(
      agentId,
      prompt,
      directory,
      name,
      toolPermissions as ToolPermission | undefined
    );

    // Start agent execution in background
    await executionManager.startAgent(agentId, {
      prompt,
      directory,
      toolPermissions: toolPermissions as ToolPermission | undefined,
    });

    return NextResponse.json({
      id: agentId,
      name: session.name,
      status: 'running',
      lifecycleState: session.lifecycleState,
      toolPermissions: session.toolPermissions,
    });
  } catch (error) {
    console.error('Error spawning agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to spawn agent' },
      { status: 500 }
    );
  }
}
