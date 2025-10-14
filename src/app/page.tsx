/**
 * Projects Dashboard - Main Landing Page
 * Shows all projects with navigation to individual project views
 */
'use client';

import { useState } from 'react';
import { ProjectsDashboard } from '@/components/features/projects-dashboard';
import { HelpModal } from '@/components/features/help-modal';
import { OpenSpecSyncStatus } from '@/components/openspec/openspec-sync-status';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [showHelp, setShowHelp] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [directoryPath, setDirectoryPath] = useState('');
  const [addProjectError, setAddProjectError] = useState('');

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      description: 'Add new project',
      action: () => setShowAddProjectForm(true),
    },
    {
      key: 'h',
      meta: true,
      description: 'Show help',
      action: () => setShowHelp(true),
    },
    {
      key: 'Escape',
      description: 'Close modals',
      action: () => {
        setShowHelp(false);
        setShowAddProjectForm(false);
        setAddProjectError('');
      },
    },
  ]);

  const handleAddProject = async () => {
    if (!directoryPath.trim()) {
      setAddProjectError('Please enter a directory path');
      return;
    }

    setIsAddingProject(true);
    setAddProjectError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: directoryPath.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add project');
      }

      // Reset form and refresh the page to show the new project
      setDirectoryPath('');
      setShowAddProjectForm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error adding project:', error);
      setAddProjectError(error instanceof Error ? error.message : 'Failed to add project. Please try again.');
    } finally {
      setIsAddingProject(false);
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
                Project-Based Agent Orchestration
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Add Project Button */}
            <Button
              onClick={() => setShowAddProjectForm(!showAddProjectForm)}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              title="Add Project (⌘N)"
              disabled={isAddingProject}
            >
              {isAddingProject ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <span className="hidden sm:inline">Adding...</span>
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline">+ Add Project</span>
                  <span className="sm:hidden">+</span>
                </>
              )}
            </Button>

            {/* Help Button */}
            <Button
              onClick={() => setShowHelp(true)}
              variant="ghost"
              size="sm"
              title="Help & Shortcuts (⌘H)"
            >
              <span className="hidden sm:inline">Help</span>
              <span className="sm:hidden">?</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Add Project Form (shown below header when active) */}
      {showAddProjectForm && (
        <div className="max-w-7xl mx-auto mt-4 px-4 sm:px-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Add Project Directory
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="/path/to/your/project"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddProject();
                    }
                  }}
                  disabled={isAddingProject}
                  error={addProjectError}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddProject}
                  disabled={isAddingProject || !directoryPath.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add
                </Button>
                <Button
                  onClick={() => {
                    setShowAddProjectForm(false);
                    setDirectoryPath('');
                    setAddProjectError('');
                  }}
                  variant="ghost"
                  disabled={isAddingProject}
                >
                  Cancel
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter the full path to a project directory on your filesystem
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Projects</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Select a project to view its agents, OpenSpec files, and history
          </p>
        </div>

        {/* Projects Grid */}
        <ProjectsDashboard />

        {/* Quick Tips */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Getting Started
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Click <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">+ Add Project</kbd> or press <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">⌘N</kbd> to add a project directory path</li>
                <li>• Enter the full path to your project directory (e.g., <code className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">/Users/yourname/Projects/myproject</code>)</li>
                <li>• Projects are automatically discovered and tracked in the database</li>
                <li>• Each project tracks its agents, worktrees, and OpenSpec configurations</li>
                <li>• Click any project card to view its details and spawn agents</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Footer with OpenSpec Sync Status */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-2 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              OpenSpec Database:
            </span>
            <OpenSpecSyncStatus />
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Agent View v1.0
          </div>
        </div>
      </footer>
    </div>
  );
}
