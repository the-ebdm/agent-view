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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Agent View
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Claude Code Agent Monitor
              </p>
            </div>
          </div>
          <AgentStatusBadge status={displayStatus} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Desktop: Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left sidebar: Form + History */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
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
          <div className="lg:col-span-2">
            {streamError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                      Connection Error
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      {streamError}
                    </p>
                    <button
                      onClick={reconnect}
                      className="text-sm font-semibold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
                    >
                      Reconnect →
                    </button>
                  </div>
                </div>
              </div>
            )}
            <AgentOutputStream messages={displayMessages} />
          </div>
        </div>
      </main>
    </div>
  );
}
