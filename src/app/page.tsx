// Phase 2: Multi-agent dashboard page
'use client';

import { useState } from 'react';
import { ActiveAgentsDashboard } from '@/components/features/active-agents-dashboard';
import { AgentSpawnFormV2 } from '@/components/features/agent-spawn-form-v2';
import { AgentHistoryList } from '@/components/features/agent-history-list';
import { useAgentHistory } from '@/hooks/use-agent-history';
import { ActiveAgentsProvider, useActiveAgents } from '@/contexts/active-agents-context';
import { Button } from '@/components/ui/button';

function DashboardContent() {
  const { agents } = useActiveAgents();
  const { history } = useAgentHistory();
  const [showSpawnForm, setShowSpawnForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSpawnComplete = () => {
    setShowSpawnForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Agent View
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Multi-Agent Orchestration
              </p>
            </div>
          </div>

          {/* Agent Counter */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {agents.length} Active {agents.length === 1 ? 'Agent' : 'Agents'}
              </span>
            </div>

            {/* Spawn Button */}
            <Button
              onClick={() => setShowSpawnForm(!showSpawnForm)}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <span className="hidden sm:inline">+ Spawn Agent</span>
              <span className="sm:hidden">+</span>
            </Button>

            {/* History Toggle */}
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              size="sm"
            >
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">📜</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Spawn Form & History (collapsible on mobile) */}
          <div className={`lg:col-span-1 space-y-4 ${(showSpawnForm || showHistory) ? 'block' : 'hidden lg:block'}`}>
            {/* Spawn Form */}
            <div className={showSpawnForm ? 'block' : 'hidden lg:block'}>
              <AgentSpawnFormV2 onSpawn={handleSpawnComplete} />
            </div>

            {/* History */}
            {showHistory && (
              <div className="lg:block">
                <AgentHistoryList
                  history={history}
                  selectedId={null}
                  onSelect={() => {}}
                />
              </div>
            )}
          </div>

          {/* Main Content - Agent Dashboard */}
          <div className={`lg:col-span-3 ${(showSpawnForm || showHistory) ? 'hidden lg:block' : 'block'}`}>
            <ActiveAgentsDashboard />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ActiveAgentsProvider pollInterval={2000}>
      <DashboardContent />
    </ActiveAgentsProvider>
  );
}
