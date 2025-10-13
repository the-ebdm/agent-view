import type { AgentMessage } from '@/types/agent';

// SDK message can be any object from the Claude Agent SDK
type SDKMessage = any;

// Metadata extracted from SDK messages (session_id, etc.)
export interface SDKMetadata {
  sessionId?: string;
}

/**
 * Extract metadata from SDK system/init messages
 */
export function extractSDKMetadata(sdkMessage: SDKMessage): SDKMetadata | null {
  // Look for system messages with session info
  if (sdkMessage.type === 'system') {
    // The SDK's init message should contain session_id
    // Format: { type: 'system', message: { session_id: '...' } }
    const sessionId = sdkMessage.message?.session_id || sdkMessage.session_id;

    if (sessionId) {
      console.log('[StreamHandler] Extracted session_id:', sessionId);
      return { sessionId };
    }
  }

  return null;
}

export function processSDKMessage(sdkMessage: SDKMessage): AgentMessage | null {
  const timestamp = Date.now();

  // Handle system messages (init, etc.) - skip these for message stream
  // but metadata is extracted separately
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

// Stream result can be either a message or metadata
export type StreamYield =
  | { type: 'message'; data: AgentMessage }
  | { type: 'metadata'; data: SDKMetadata };

export async function* streamAgentMessages(
  agentQuery: AsyncGenerator<unknown, void, unknown>
): AsyncGenerator<StreamYield, void, unknown> {
  try {
    for await (const message of agentQuery) {
      const sdkMessage = message as SDKMessage;

      // Debug: log the message type
      if (sdkMessage.type === 'user' || sdkMessage.type === 'assistant') {
        console.log('[StreamHandler] Processing:', sdkMessage.type, 'with', sdkMessage.message?.content?.length || 0, 'content blocks');
      }

      // Extract metadata first (for system messages)
      const metadata = extractSDKMetadata(sdkMessage);
      if (metadata) {
        yield { type: 'metadata', data: metadata };
      }

      // Process regular messages
      const agentMessage = processSDKMessage(sdkMessage);

      // Only yield if we got a valid message (some SDK messages are skipped)
      if (agentMessage) {
        console.log('[StreamHandler] Yielding:', agentMessage.type, agentMessage.toolName || '');
        yield { type: 'message', data: agentMessage };
      }
    }
  } catch (error) {
    console.error('[StreamHandler] Error in stream:', error);
    // Yield error message
    yield {
      type: 'message',
      data: {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: Date.now(),
      },
    };
  }
}
