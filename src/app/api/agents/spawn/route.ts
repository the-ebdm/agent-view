import { NextResponse } from 'next/server';
import { z } from 'zod';
import { spawnAgent } from '@/lib/agent-sdk/client';
import { sessionManager } from '@/lib/agent-session-manager';
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

    // Spawn agent
    const result = await spawnAgent({ prompt, directory, toolPermissions });

    // Phase 2: Create session with name and permissions
    const session = sessionManager.createSession(
      result.id,
      prompt,
      directory,
      name,
      toolPermissions as ToolPermission | undefined
    );

    return NextResponse.json({
      id: result.id,
      name: session.name,
      status: result.status,
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
