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
      <Card>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p className="text-sm">No agent history yet</p>
          <p className="text-xs mt-2">Spawn your first agent to get started</p>
        </div>
      </Card>
    );
  }

  return (
    <Card header={<h3 className="font-semibold">Agent History</h3>}>
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              w-full text-left p-3 rounded-lg border transition-colors
              ${selectedId === item.id
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-medium line-clamp-1">{item.prompt}</p>
              <AgentStatusBadge status={item.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{new Date(item.startTime).toLocaleString()}</span>
              <span>{item.messageCount} messages</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
