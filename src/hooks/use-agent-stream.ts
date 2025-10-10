'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgentMessage, AgentStatus } from '@/types/agent';

interface UseAgentStreamResult {
  messages: AgentMessage[];
  status: AgentStatus;
  error: string | null;
  reconnect: () => void;
}

export function useAgentStream(agentId: string | null): UseAgentStreamResult {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!agentId) {
      setStatus('idle');
      return;
    }

    setError(null);
    setStatus('running');

    const es = new EventSource(`/api/agents/${agentId}/stream`);

    es.onmessage = (event) => {
      try {
        const message: AgentMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);

        // Update status based on message type
        if (message.type === 'error') {
          setStatus('error');
          setError(message.content);
          es.close();
        } else if (message.type === 'result') {
          setStatus('completed');
          es.close();
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    es.onerror = () => {
      setError('Connection lost');
      setStatus('error');
      es.close();
    };

    setEventSource(es);

    return () => {
      es.close();
    };
  }, [agentId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const reconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
    }
    connect();
  }, [eventSource, connect]);

  return { messages, status, error, reconnect };
}
