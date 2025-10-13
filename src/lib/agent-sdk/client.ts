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
  const _agentQuery = query({
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

/**
 * Resume an existing SDK session with a new message
 *
 * @param sessionId - SDK session ID to resume
 * @param prompt - New message/prompt to send
 * @param directory - Working directory for the agent
 * @param toolPermissions - Optional tool permissions
 * @param canUseTool - Optional callback for tool approval
 * @returns AsyncGenerator for streaming messages
 */
export function resumeAgent(
  sessionId: string,
  prompt: string,
  directory: string,
  toolPermissions?: SpawnAgentParams['toolPermissions'],
  canUseTool?: (toolName: string, input: Record<string, unknown>) => Promise<{ behavior: 'allow' | 'deny'; updatedInput?: Record<string, unknown>; message?: string }>
) {
  // Get allowed tools from permissions
  let allowedTools: string[] | undefined;
  if (toolPermissions) {
    allowedTools = toolPermissions.preset === 'custom'
      ? toolPermissions.tools
      : getToolsForPreset(toolPermissions.preset);
  }

  // Resume session with new prompt
  return query({
    prompt,
    options: {
      cwd: directory,
      allowedTools,
      canUseTool,
      resume: sessionId, // SDK option to resume existing session
    }
  });
}

/**
 * Fork an existing SDK session into a new independent session
 *
 * @param sessionId - SDK session ID to fork from
 * @param prompt - Initial prompt for the forked session
 * @param directory - Working directory for the agent
 * @param toolPermissions - Optional tool permissions
 * @param canUseTool - Optional callback for tool approval
 * @returns AsyncGenerator for streaming messages
 */
export function forkAgent(
  sessionId: string,
  prompt: string,
  directory: string,
  toolPermissions?: SpawnAgentParams['toolPermissions'],
  canUseTool?: (toolName: string, input: Record<string, unknown>) => Promise<{ behavior: 'allow' | 'deny'; updatedInput?: Record<string, unknown>; message?: string }>
) {
  // Get allowed tools from permissions
  let allowedTools: string[] | undefined;
  if (toolPermissions) {
    allowedTools = toolPermissions.preset === 'custom'
      ? toolPermissions.tools
      : getToolsForPreset(toolPermissions.preset);
  }

  // Fork session with new prompt
  return query({
    prompt,
    options: {
      cwd: directory,
      allowedTools,
      canUseTool,
      resume: sessionId, // Resume from parent session
      forkSession: true, // SDK option to create new independent session
    }
  });
}
