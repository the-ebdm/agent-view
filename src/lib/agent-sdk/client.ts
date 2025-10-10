import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SpawnAgentParams, SpawnAgentResult } from './types';
import { getToolsForPreset } from '../tool-permissions';

export async function spawnAgent(params: SpawnAgentParams): Promise<SpawnAgentResult> {
  const { prompt, directory, toolPermissions } = params;

  // Generate unique agent ID
  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Phase 2: Get allowed tools from permissions
  let allowedTools: string[] | undefined;
  if (toolPermissions) {
    allowedTools = toolPermissions.preset === 'custom'
      ? toolPermissions.tools
      : getToolsForPreset(toolPermissions.preset);
  }

  // Spawn agent with Claude Agent SDK
  // The SDK will auto-detect local Claude Code instance
  const agentQuery = query({
    prompt,
    options: {
      // Set working directory for the agent
      cwd: directory,
      // Phase 2: Pass allowed tools to SDK
      // Note: SDK tool filtering might need custom implementation if not supported natively
      allowedTools,
    }
  });

  return {
    id: agentId,
    status: 'running',
  };
}

export function getAgentQueryInstance(agentId: string, params: SpawnAgentParams) {
  // Phase 2: Get allowed tools from permissions
  let allowedTools: string[] | undefined;
  if (params.toolPermissions) {
    allowedTools = params.toolPermissions.preset === 'custom'
      ? params.toolPermissions.tools
      : getToolsForPreset(params.toolPermissions.preset);
  }

  // Return the query generator for streaming
  return query({
    prompt: params.prompt,
    options: {
      cwd: params.directory,
      allowedTools,
    }
  });
}
