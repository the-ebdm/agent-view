import { sessionManager } from '@/lib/agent-session-manager';
import { executionManager } from '@/lib/agent-execution-manager';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessionManager.getSession(id);

  if (!session) {
    return new Response('Agent not found', { status: 404 });
  }

  // Create SSE stream that subscribes to agent execution
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      try {
        // Send buffered messages first (catch-up for late subscribers)
        const bufferedMessages = executionManager.getBufferedMessages(id);
        bufferedMessages.forEach((message) => {
          const data = JSON.stringify(message);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        // Check if agent is still running
        if (!executionManager.hasAgent(id)) {
          // Agent completed or stopped, close after sending buffered messages
          console.log(`[Stream] Agent ${id} not running, closing after buffered messages`);
          controller.close();
          return;
        }

        // Subscribe to live messages
        executionManager.subscribe(id, controller);
        console.log(`[Stream] Subscribed to agent ${id}`);

        // Note: Live messages are sent automatically via broadcastMessage()
        // The controller will be used by executionManager to send messages
      } catch (error) {
        console.error(`[Stream] Error subscribing to agent ${id}:`, error);
        const errorMessage = {
          type: 'error',
          content: error instanceof Error ? error.message : 'Stream subscription error',
          timestamp: Date.now(),
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.close();
      }
    },
    cancel() {
      // Unsubscribe when client disconnects
      executionManager.unsubscribe(id, this as unknown as ReadableStreamDefaultController);
      console.log(`[Stream] Unsubscribed from agent ${id}`);
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
