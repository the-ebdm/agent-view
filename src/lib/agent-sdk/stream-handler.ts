import type { AgentMessage } from '@/types/agent';

// SDK message can be any object from the Claude Agent SDK
type SDKMessage = any;

export function processSDKMessage(sdkMessage: SDKMessage): AgentMessage | null {
  const timestamp = Date.now();

  // Handle system messages (init, etc.) - skip these
  if (sdkMessage.type === 'system') {
    return null;
  }

  // Handle assistant messages from the SDK
  if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
    const content = sdkMessage.message.content;

    // Process each content block
    for (const block of content) {
      // Handle text blocks
      if (block.type === 'text') {
        return {
          type: 'assistant',
          content: block.text || '',
          timestamp,
        };
      }

      // Handle tool use blocks
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          content: `Using tool: ${block.name}`,
          timestamp,
          toolName: block.name,
          toolParams: block.input,
        };
      }
    }
  }

  // Handle user messages (which might contain tool results)
  if (sdkMessage.type === 'user' && sdkMessage.message?.content) {
    const content = sdkMessage.message.content;

    for (const block of content) {
      // Handle tool result blocks
      if (block.type === 'tool_result') {
        return {
          type: 'tool_result',
          content: typeof block.content === 'string'
            ? block.content
            : Array.isArray(block.content)
            ? block.content.map(c => c.text || c).join('\n')
            : JSON.stringify(block.content),
          timestamp,
        };
      }
    }
  }

  // Handle errors
  if (sdkMessage.type === 'error') {
    return {
      type: 'error',
      content: sdkMessage.error?.message || sdkMessage.message || 'Unknown error',
      timestamp,
    };
  }

  // Skip other message types
  return null;
}

export async function* streamAgentMessages(
  agentQuery: AsyncGenerator<unknown, void, unknown>
): AsyncGenerator<AgentMessage, void, unknown> {
  try {
    for await (const message of agentQuery) {
      const sdkMessage = message as SDKMessage;
      const agentMessage = processSDKMessage(sdkMessage);

      // Only yield if we got a valid message (some SDK messages are skipped)
      if (agentMessage) {
        yield agentMessage;
      }
    }
  } catch (error) {
    console.error('[StreamHandler] Error in stream:', error);
    // Yield error message
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now(),
    };
  }
}
