import type { AgentMessage, ToolPermission } from '@/types/agent';

export interface SpawnAgentParams {
  prompt: string;
  directory: string;
  toolPermissions?: ToolPermission; // Phase 2: Optional tool permissions
}

export interface SpawnAgentResult {
  id: string;
  status: 'running';
}

export interface SDKMessage {
  type: 'assistant' | 'tool_use' | 'tool_result' | 'result' | 'error';
  message?: string;
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  result?: string;
  error?: string;
}

export interface StreamMessage {
  agentId: string;
  message: AgentMessage;
}
