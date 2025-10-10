import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SpawnAgentParams, SpawnAgentResult } from './types';

export async function spawnAgent(params: SpawnAgentParams): Promise<SpawnAgentResult> {
  const { prompt, directory } = params;

  // Generate unique agent ID
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Spawn agent with Claude Agent SDK
  // The SDK will auto-detect local Claude Code instance
  const agentQuery = query({
    prompt,
    options: {
      // Set working directory for the agent
      cwd: directory,
      // Allow all tools by default (as per Phase 1 requirements)
      // The SDK will use the local Claude Code authentication
    }
  });

  return {
    id: agentId,
    status: 'running',
  };
}

export function getAgentQueryInstance(agentId: string, params: SpawnAgentParams) {
  // Return the query generator for streaming
  return query({
    prompt: params.prompt,
    options: {
      cwd: params.directory,
    }
  });
}
