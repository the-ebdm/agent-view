// Phase 2: Restart agent with same configuration
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sessionManager } from '@/lib/agent-session-manager';
import { spawnAgent } from '@/lib/agent-sdk/client';
import type { ToolPermission } from '@/types/agent';

// Optional: Allow overriding toolPermissions on restart
const restartSchema = z.object({
  toolPermissions: z.object({
    preset: z.enum(['read-only', 'standard', 'full-access', 'custom']),
    tools: z.array(z.enum(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task', 'WebFetch', 'WebSearch'])).optional(),
  }).optional(),
}).optional();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the existing session to retrieve its configuration
    const oldSession = sessionManager.getSession(id);
    if (!oldSession) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Parse optional body (to allow permission override)
    let body = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Empty body is fine
    }

    const validation = restartSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Use new permissions if provided, otherwise reuse old ones
    const toolPermissions = validation.data?.toolPermissions || oldSession.toolPermissions;

    // Stop the old agent (moves to history)
    sessionManager.stopAgent(id);

    // Spawn new agent with same configuration
    const result = await spawnAgent({
      prompt: oldSession.prompt,
      directory: oldSession.directory,
      toolPermissions,
    });

    // Create new session with same name pattern
    const newSession = sessionManager.createSession(
      result.id,
      oldSession.prompt,
      oldSession.directory,
      `${oldSession.name} (Restarted)`,
      toolPermissions as ToolPermission
    );

    return NextResponse.json({
      id: result.id,
      name: newSession.name,
      status: result.status,
      lifecycleState: newSession.lifecycleState,
      toolPermissions: newSession.toolPermissions,
      restartedFrom: id,
    });
  } catch (error) {
    console.error('Error restarting agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restart agent' },
      { status: 500 }
    );
  }
}
