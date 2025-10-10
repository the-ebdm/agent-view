'use client';

import { useState } from 'react';
import { AgentSpawnForm } from '@/components/features/agent-spawn-form';
import { AgentOutputStream } from '@/components/features/agent-output-stream';
import { AgentStatusBadge } from '@/components/features/agent-status-badge';
import { AgentHistoryList } from '@/components/features/agent-history-list';
import { useAgentStream } from '@/hooks/use-agent-stream';
import { useAgentHistory } from '@/hooks/use-agent-history';
import { sessionManager } from '@/lib/agent-session-manager';

export default function Home() {
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const { messages, status, error: streamError, reconnect } = useAgentStream(currentAgentId);
  const { history, refetch: refetchHistory } = useAgentHistory();

  const handleSpawn = async (prompt: string, directory: string) => {
    try {
      const response = await fetch('/api/agents/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, directory }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to spawn agent');
      }

      const data = await response.json();
      setCurrentAgentId(data.id);
      setSelectedHistoryId(null);

      // Refetch history after a short delay to include the new agent
      setTimeout(() => refetchHistory(), 500);
    } catch (err) {
      throw err;
    }
  };

  const handleSelectHistory = (id: string) => {
    setSelectedHistoryId(id);
    setCurrentAgentId(null);
  };

  // Get messages to display (either from current stream or historical session)
  const displayMessages = selectedHistoryId
    ? sessionManager.getHistoricalSession(selectedHistoryId)?.messages || []
    : messages;

  const displayStatus = selectedHistoryId
    ? sessionManager.getHistoricalSession(selectedHistoryId)?.status || 'idle'
    : status;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agent View</h1>
          <AgentStatusBadge status={displayStatus} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Desktop: Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar: Form + History */}
          <div className="md:col-span-1 space-y-6">
            <AgentSpawnForm
              onSpawn={handleSpawn}
              disabled={status === 'running'}
            />
            <AgentHistoryList
              history={history}
              selectedId={selectedHistoryId || currentAgentId}
              onSelect={handleSelectHistory}
            />
          </div>

          {/* Right: Output stream */}
          <div className="md:col-span-2">
            {streamError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                  {streamError}
                </p>
                <button
                  onClick={reconnect}
                  className="text-sm text-red-700 dark:text-red-300 underline"
                >
                  Reconnect
                </button>
              </div>
            )}
            <AgentOutputStream messages={displayMessages} />
          </div>
        </div>
      </main>
    </div>
  );
}
