'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AgentOutputStream } from './agent-output-stream';
import { AgentStatusBadge } from './agent-status-badge';
import type { AgentMessage, AgentHistoryItem } from '@/types/agent';

interface AgentHistoryModalProps {
  historyItem: AgentHistoryItem;
  onClose: () => void;
}

export function AgentHistoryModal({ historyItem, onClose }: AgentHistoryModalProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  // Check if prompt is long enough to need truncation (rough estimate: ~150 chars = 3 lines)
  const isPromptLong = historyItem.prompt.length > 150;

  // Fetch messages for this agent
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${historyItem.id}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [historyItem.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const duration = historyItem.endTime
    ? historyItem.endTime - historyItem.startTime
    : 0;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="text-xl">📜</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{historyItem.name}</h2>
              </div>
              <AgentStatusBadge status={historyItem.status} />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-8 px-3 ml-3"
            >
              ✕ Close
            </Button>
          </div>

          {/* Agent Info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <span className="font-semibold">Started:</span>{' '}
              {new Date(historyItem.startTime).toLocaleString()}
            </div>
            {historyItem.endTime && (
              <div>
                <span className="font-semibold">Duration:</span>{' '}
                {formatDuration(duration)}
              </div>
            )}
            <div>
              <span className="font-semibold">Messages:</span> {messages.length}
            </div>
            <div className="w-full">
              <span className="font-semibold">Directory:</span>{' '}
              <span className="font-mono text-xs">{historyItem.directory}</span>
            </div>
          </div>

          {/* Initial Prompt */}
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                Initial Prompt:
              </div>
              {isPromptLong && (
                <button
                  onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  {isPromptExpanded ? '▼ Show less' : '▶ Show more'}
                </button>
              )}
            </div>
            <div className={`text-sm text-gray-700 dark:text-gray-300 ${!isPromptExpanded && isPromptLong ? 'line-clamp-3' : ''}`}>
              {historyItem.prompt}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-spin">⏳</div>
                <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <p className="text-red-600 dark:text-red-400 mb-2">Failed to load messages</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                <Button onClick={fetchMessages} size="sm" className="mt-4">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 dark:text-gray-400">No messages recorded</p>
              </div>
            </div>
          )}

          {!loading && !error && messages.length > 0 && (
            <AgentOutputStream messages={messages} />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            This is a read-only view of the agent&apos;s message history
          </p>
        </div>
      </div>
    </div>
  );
}
