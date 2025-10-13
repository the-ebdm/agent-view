/**
 * Project Detail Page
 * Shows project-specific tabs: Active Agents, OpenSpec, History
 */
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ActiveAgentsDashboard } from '@/components/features/active-agents-dashboard';
import { AgentSpawnModal } from '@/components/features/agent-spawn-modal';
import { AgentHistoryList } from '@/components/features/agent-history-list';
import { AgentHistoryModal } from '@/components/features/agent-history-modal';
import { OpenSpecSection } from '@/components/openspec/openspec-section';
import { HelpModal } from '@/components/features/help-modal';
import { useAgentHistory } from '@/hooks/use-agent-history';
import { ActiveAgentsProvider, useActiveAgents } from '@/contexts/active-agents-context';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Project } from '@/types/project';

interface ProjectDetailProps {
  params: Promise<{ id: string }>;
}

function ProjectDetailContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { agents, refreshAgents } = useActiveAgents();
  const { history } = useAgentHistory();
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<string | null>(null);

  // Fetch project details
  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data.project);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter agents and history for this project
  const projectAgents = agents.filter(agent => agent.projectId === projectId);
  const projectHistory = history.filter(item => {
    // History items don't have projectId yet, so we'll show all for now
    // TODO: Add projectId to history items
    return true;
  });

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      meta: true,
      description: 'Open spawn modal',
      action: () => setShowSpawnModal(true),
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
    setShowSpawnModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Project not found</p>
          <Button onClick={() => router.push('/')}>
            ← Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Projects
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {project.name}
            </span>
          </div>

          {/* Main Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {project.openspecPath ? '📋' : '📁'}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Agent Counter */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {projectAgents.length} Active {projectAgents.length === 1 ? 'Agent' : 'Agents'}
                </span>
              </div>

              {/* Spawn Button */}
              <Button
                onClick={() => setShowSpawnModal(true)}
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabbed Navigation */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-t-lg border border-gray-200 dark:border-gray-700">
              <TabsList className="px-4">
                <TabsTrigger value="agents" icon="🤖" badge={projectAgents.length}>
                  Active Agents
                </TabsTrigger>
                <TabsTrigger value="openspec" icon="📁">
                  OpenSpec
                </TabsTrigger>
                <TabsTrigger value="history" icon="📜" badge={projectHistory.length}>
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Agents Tab */}
              <TabsContent value="agents" className="p-6">
                {projectAgents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="text-xl font-semibold mb-2">No Active Agents</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Spawn an agent in this project to get started
                    </p>
                    <Button
                      onClick={() => setShowSpawnModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      + Spawn Agent
                    </Button>
                  </div>
                ) : (
                  <ActiveAgentsDashboard />
                )}
              </TabsContent>

              {/* OpenSpec Tab */}
              <TabsContent value="openspec" className="p-6">
                <OpenSpecSection
                  projectDirectory={project.directory}
                  openspecPath={project.openspecPath}
                />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="p-6">
                {projectHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="text-6xl mb-4">📜</div>
                    <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Spawn an agent to start building your history
                    </p>
                    <Button
                      onClick={() => setShowSpawnModal(true)}
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
                        {projectHistory.length} {projectHistory.length === 1 ? 'agent' : 'agents'} in history
                      </p>
                    </div>
                    <AgentHistoryList
                      history={projectHistory}
                      selectedId={selectedHistoryItem}
                      onSelect={(id) => {
                        setSelectedHistoryItem(id);
                      }}
                    />
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Project Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Project Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Total Agents</p>
                    <p className="text-lg font-semibold">{project.agentCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Active Now</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {project.activeAgentCount}
                    </p>
                  </div>
                  {project.worktreeCount > 0 && (
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Worktrees</p>
                      <p className="text-lg font-semibold">{project.worktreeCount}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Last Used</p>
                    <p className="text-sm font-medium">
                      {project.lastUsed ? new Date(project.lastUsed).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Spawn Agent Modal */}
      <AgentSpawnModal
        isOpen={showSpawnModal}
        onClose={() => setShowSpawnModal(false)}
        onSpawn={handleSpawnComplete}
        defaultDirectory={project.directory}
      />

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <AgentHistoryModal
          historyItem={projectHistory.find(item => item.id === selectedHistoryItem)!}
          onClose={() => setSelectedHistoryItem(null)}
        />
      )}
    </div>
  );
}

export default function ProjectDetailPage({ params }: ProjectDetailProps) {
  const resolvedParams = use(params);

  return (
    <ActiveAgentsProvider pollInterval={2000}>
      <ProjectDetailContent projectId={resolvedParams.id} />
    </ActiveAgentsProvider>
  );
}
