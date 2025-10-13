'use client';

import { Card } from '@/components/ui/card';
import { AgentStatusBadge } from './agent-status-badge';
import type { AgentHistoryItem } from '@/types/agent';

interface AgentHistoryListProps {
  history: AgentHistoryItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export function AgentHistoryList({ history, selectedId, onSelect }: AgentHistoryListProps) {
  if (history.length === 0) {
    return (
      <Card className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-3">📜</div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            No History
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Agent sessions will appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((item) => {
        const duration = item.endTime ? item.endTime - item.startTime : 0;
        const durationText = duration > 0
          ? (() => {
              const seconds = Math.floor(duration / 1000);
              const minutes = Math.floor(seconds / 60);
              if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
              }
              return `${seconds}s`;
            })()
          : '';

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              w-full text-left p-3 rounded-lg border transition-all
              ${selectedId === item.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
              }
            `}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base flex-shrink-0">📜</span>
                <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                  {item.name}
                </h3>
              </div>
              <AgentStatusBadge status={item.status} />
            </div>

            {/* Prompt - Single line with truncation */}
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
              {item.prompt}
            </p>

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <span>🕐</span>
                <span className="font-mono">
                  {new Date(item.startTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {durationText && (
                <div className="flex items-center gap-1">
                  <span>⏱️</span>
                  <span className="font-mono">{durationText}</span>
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <span>💬</span>
                <span className="font-semibold">{item.messageCount}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
