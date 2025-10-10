import { sessionManager } from '@/lib/agent-session-manager';
import { getAgentQueryInstance } from '@/lib/agent-sdk/client';
import { streamAgentMessages } from '@/lib/agent-sdk/stream-handler';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[Stream] Looking for agent:', id);
  const session = sessionManager.getSession(id);

  if (!session) {
    console.log('[Stream] Agent not found:', id);
    return new Response('Agent not found', { status: 404 });
  }

  console.log('[Stream] Found session:', { id, prompt: session.prompt });

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('[Stream] Starting stream for agent:', id);

        // Get agent query instance
        const agentQuery = getAgentQueryInstance(id, {
          prompt: session.prompt,
          directory: session.directory,
        });

        console.log('[Stream] Got agent query instance');

        // Stream messages
        let messageCount = 0;
        for await (const message of streamAgentMessages(agentQuery)) {
          messageCount++;
          console.log('[Stream] Message', messageCount, ':', message.type);

          // Add message to session
          sessionManager.addMessage(id, message);

          // Send via SSE
          const data = JSON.stringify(message);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // If error or result, close stream
          if (message.type === 'error' || message.type === 'result') {
            console.log('[Stream] Closing stream due to:', message.type);
            controller.close();
            return;
          }
        }

        console.log('[Stream] Stream completed naturally after', messageCount, 'messages');
        controller.close();
      } catch (error) {
        console.error('[Stream] Error:', error);
        const errorMessage = {
          type: 'error',
          content: error instanceof Error ? error.message : 'Stream error',
          timestamp: Date.now(),
        };
        sessionManager.addMessage(id, errorMessage);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
