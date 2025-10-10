import type { AgentMessage } from '@/types/agent';
import type { SDKMessage } from './types';

export function processSDKMessage(sdkMessage: SDKMessage): AgentMessage {
  const timestamp = Date.now();

  switch (sdkMessage.type) {
    case 'assistant':
      return {
        type: 'assistant',
        content: sdkMessage.message || sdkMessage.content || '',
        timestamp,
      };

    case 'tool_use':
      return {
        type: 'tool_use',
        content: `Using tool: ${sdkMessage.toolName}`,
        timestamp,
        toolName: sdkMessage.toolName,
        toolParams: sdkMessage.toolInput,
      };

    case 'tool_result':
      return {
        type: 'tool_result',
        content: sdkMessage.result || '',
        timestamp,
      };

    case 'result':
      return {
        type: 'result',
        content: sdkMessage.message || sdkMessage.content || 'Agent completed',
        timestamp,
      };

    case 'error':
      return {
        type: 'error',
        content: sdkMessage.error || sdkMessage.message || 'Unknown error',
        timestamp,
      };

    default:
      return {
        type: 'assistant',
        content: JSON.stringify(sdkMessage),
        timestamp,
      };
  }
}

export async function* streamAgentMessages(
  agentQuery: AsyncGenerator<unknown, void, unknown>
): AsyncGenerator<AgentMessage, void, unknown> {
  try {
    for await (const message of agentQuery) {
      // Process the message from SDK
      const sdkMessage = message as SDKMessage;
      const agentMessage = processSDKMessage(sdkMessage);
      yield agentMessage;
    }
  } catch (error) {
    // Yield error message
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now(),
    };
  }
}
