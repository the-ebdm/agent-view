export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'interrupted';

// Phase 2: Multi-Agent Orchestration - Lifecycle States
export type AgentLifecycleState = 'running' | 'paused' | 'stopped' | 'error';

export type MessageType = 'assistant' | 'tool_use' | 'tool_result' | 'result' | 'error';

// Phase 2: Tool Permission Types
export type ToolName = 'Read' | 'Write' | 'Edit' | 'Bash' | 'Grep' | 'Glob' | 'Task' | 'WebFetch' | 'WebSearch';

export type ToolPermissionPreset = 'read-only' | 'standard' | 'full-access' | 'custom';

export interface ToolPermission {
  preset: ToolPermissionPreset;
  tools?: ToolName[]; // Only used when preset is 'custom'
}

// Phase 2: Agent Metrics
export interface AgentMetrics {
  elapsedTime: number; // Milliseconds
  messageCount: number;
  lastActivityTime: number; // Unix timestamp
}

export interface AgentMessage {
  type: MessageType;
  content: string;
  timestamp: number;
  toolName?: string;
  toolParams?: Record<string, unknown>;
}

export interface AgentSession {
  id: string;
  name: string; // Phase 2: Agent naming
  prompt: string;
  directory: string;
  status: AgentStatus;
  lifecycleState: AgentLifecycleState; // Phase 2: Lifecycle control
  toolPermissions: ToolPermission; // Phase 2: Permission system
  startTime: number;
  endTime?: number;
  pausedTime?: number; // Phase 2: Track pause duration
  messages: AgentMessage[];
}

export interface AgentHistoryItem {
  id: string;
  name: string; // Phase 2: Agent naming
  prompt: string;
  directory: string;
  status: AgentStatus;
  toolPermissions: ToolPermission; // Phase 2: Permission history
  startTime: number;
  endTime?: number;
  messageCount: number;
}
