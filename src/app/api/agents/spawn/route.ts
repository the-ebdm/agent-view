import { NextResponse } from 'next/server';
import { z } from 'zod';
import { spawnAgent } from '@/lib/agent-sdk/client';
import { sessionManager } from '@/lib/agent-session-manager';

const spawnSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  directory: z.string().min(1, 'Directory is required'),
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

    const { prompt, directory } = validation.data;

    // Spawn agent
    const result = await spawnAgent({ prompt, directory });

    // Create session
    sessionManager.createSession(result.id, prompt, directory);

    return NextResponse.json({
      id: result.id,
      status: result.status,
    });
  } catch (error) {
    console.error('Error spawning agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to spawn agent' },
      { status: 500 }
    );
  }
}
