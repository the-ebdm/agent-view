export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'interrupted';

export type MessageType = 'assistant' | 'tool_use' | 'tool_result' | 'result' | 'error';

export interface AgentMessage {
  type: MessageType;
  content: string;
  timestamp: number;
  toolName?: string;
  toolParams?: Record<string, unknown>;
}

export interface AgentSession {
  id: string;
  prompt: string;
  directory: string;
  status: AgentStatus;
  startTime: number;
  endTime?: number;
  messages: AgentMessage[];
}

export interface AgentHistoryItem {
  id: string;
  prompt: string;
  directory: string;
  status: AgentStatus;
  startTime: number;
  endTime?: number;
  messageCount: number;
}
