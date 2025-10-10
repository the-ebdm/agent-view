import { sessionManager } from '@/lib/agent-session-manager';
import { getAgentQueryInstance } from '@/lib/agent-sdk/client';
import { streamAgentMessages } from '@/lib/agent-sdk/stream-handler';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessionManager.getSession(id);

  if (!session) {
    return new Response('Agent not found', { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get agent query instance
        const agentQuery = getAgentQueryInstance(id, {
          prompt: session.prompt,
          directory: session.directory,
        });

        // Stream messages
        for await (const message of streamAgentMessages(agentQuery)) {
          // Add message to session
          sessionManager.addMessage(id, message);

          // Send via SSE
          const data = JSON.stringify(message);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // If error or result, close stream
          if (message.type === 'error' || message.type === 'result') {
            controller.close();
            return;
          }
        }

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
