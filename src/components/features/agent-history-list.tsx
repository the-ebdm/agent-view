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
    <Card
      header={
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Agent History</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {history.length} session{history.length !== 1 ? 's' : ''}
          </span>
        </div>
      }
    >
      <div className="space-y-2 max-h-[400px] overflow-y-auto -m-6 p-6">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              w-full text-left p-3 rounded-lg border-l-4 border-t border-r border-b transition-all
              ${selectedId === item.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 shadow-md'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-medium line-clamp-2 flex-1">{item.prompt}</p>
              <AgentStatusBadge status={item.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="font-mono">{new Date(item.startTime).toLocaleTimeString()}</span>
              <span className="font-semibold">{item.messageCount} msg</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
