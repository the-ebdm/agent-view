/**
 * Enhanced Multi-Agent Dashboard (V3)
 * Includes tabbed navigation, keyboard shortcuts, and improved UX
 */
'use client';

import { useState } from 'react';
import { ActiveAgentsDashboard } from '@/components/features/active-agents-dashboard';
import { AgentSpawnFormV3 } from '@/components/features/agent-spawn-form-v3';
import { AgentHistoryList } from '@/components/features/agent-history-list';
import { OpenSpecSection } from '@/components/openspec/openspec-section';
import { HelpModal } from '@/components/features/help-modal';
import { useAgentHistory } from '@/hooks/use-agent-history';
import { ActiveAgentsProvider, useActiveAgents } from '@/contexts/active-agents-context';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function DashboardContent() {
  const { agents, refreshAgents } = useActiveAgents();
  const { history } = useAgentHistory();
  const [showSpawnForm, setShowSpawnForm] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      description: 'Toggle spawn form',
      action: () => setShowSpawnForm(!showSpawnForm),
    },
    {
      key: 'h',
      meta: true,
      description: 'Show help',
      action: () => setShowHelp(true),
    },
    {
      key: 'r',
      meta: true,
      description: 'Refresh agents',
      action: () => refreshAgents(),
    },
    {
      key: '1',
      meta: true,
      description: 'Switch to Agents tab',
      action: () => setActiveTab('agents'),
    },
    {
      key: '2',
      meta: true,
      description: 'Switch to OpenSpec tab',
      action: () => setActiveTab('openspec'),
    },
    {
      key: '3',
      meta: true,
      description: 'Switch to History tab',
      action: () => setActiveTab('history'),
    },
    {
      key: 'Escape',
      description: 'Close help modal',
      action: () => setShowHelp(false),
    },
  ]);

  const handleSpawnComplete = () => {
    // Optionally hide spawn form on mobile after spawning
    if (window.innerWidth < 1024) {
      setShowSpawnForm(false);
    }
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

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Agent Counter */}
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
              title="Spawn Agent (⌘K)"
            >
              <span className="hidden sm:inline">+ Spawn Agent</span>
              <span className="sm:hidden">+</span>
            </Button>

            {/* Help Button */}
            <Button
              onClick={() => setShowHelp(true)}
              variant="outline"
              size="sm"
              title="Help & Shortcuts (⌘H)"
            >
              <span className="hidden sm:inline">Help</span>
              <span className="sm:hidden">?</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Spawn Form */}
          <div className={`lg:col-span-1 ${showSpawnForm ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24">
              <AgentSpawnFormV3
                onSpawn={handleSpawnComplete}
                collapsed={!showSpawnForm}
                onToggleCollapse={() => setShowSpawnForm(!showSpawnForm)}
              />
            </div>
          </div>

          {/* Main Content - Tabbed Navigation */}
          <div className={`lg:col-span-3 ${showSpawnForm ? 'hidden lg:block' : 'block'}`}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-t-lg border border-gray-200 dark:border-gray-700">
                <TabsList className="px-4">
                  <TabsTrigger value="agents" icon="🤖" badge={agents.length}>
                    Active Agents
                  </TabsTrigger>
                  <TabsTrigger value="openspec" icon="📁">
                    OpenSpec
                  </TabsTrigger>
                  <TabsTrigger value="history" icon="📜" badge={history.length}>
                    History
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Agents Tab */}
                <TabsContent value="agents" className="p-6">
                  <ActiveAgentsDashboard />
                </TabsContent>

                {/* OpenSpec Tab */}
                <TabsContent value="openspec" className="p-6">
                  <OpenSpecSection />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="p-6">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="text-6xl mb-4">📜</div>
                      <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Spawn an agent to start building your history
                      </p>
                      <Button
                        onClick={() => setShowSpawnForm(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600"
                      >
                        + Spawn First Agent
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold">Agent History</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {history.length} {history.length === 1 ? 'agent' : 'agents'} in history
                        </p>
                      </div>
                      <AgentHistoryList
                        history={history}
                        selectedId={null}
                        onSelect={(id) => {
                          // Optionally open agent details
                          console.log('Selected history item:', id);
                        }}
                      />
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Quick Tips */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Pro Tips
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Press <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">⌘K</kbd> to toggle spawn form</li>
                    <li>• Use templates for common tasks to get started quickly</li>
                    <li>• Save configurations you use frequently</li>
                    <li>• Press <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">⌘H</kbd> for help & shortcuts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Mobile Toggle Hint */}
      {!showSpawnForm && (
        <button
          onClick={() => setShowSpawnForm(true)}
          className="lg:hidden fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-20"
          title="Spawn Agent (⌘K)"
        >
          <span className="text-2xl">+</span>
        </button>
      )}
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
