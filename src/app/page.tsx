/**
 * Projects Dashboard - Main Landing Page
 * Shows all projects with navigation to individual project views
 */
'use client';

import { useState, useRef } from 'react';
import { ProjectsDashboard } from '@/components/features/projects-dashboard';
import { HelpModal } from '@/components/features/help-modal';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [showHelp, setShowHelp] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      description: 'Add new project',
      action: () => fileInputRef.current?.click(),
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
      },
    },
  ]);

  const handleAddProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Get the directory path from the first file
    const file = files[0];
    const path = file.webkitRelativePath || file.name;
    const directory = path.split('/')[0];

    // In a real implementation, we'd need the full path
    // For now, we'll use a workaround by getting it from the file path
    const fullPath = (file as any).path;

    if (!fullPath) {
      alert('Unable to get directory path. Please try again.');
      return;
    }

    // Extract directory path (remove filename if present)
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

    setIsAddingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: dirPath }),
      });

      if (!response.ok) {
        throw new Error('Failed to add project');
      }

      // Refresh the page to show the new project
      window.location.reload();
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project. Please try again.');
    } finally {
      setIsAddingProject(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
            {/* Hidden file input for directory selection */}
            <input
              ref={fileInputRef}
              type="file"
              /* @ts-ignore - webkitdirectory is not in TypeScript types */
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleAddProject}
              className="hidden"
            />

            {/* Add Project Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
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
                <li>• Click <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">+ Add Project</kbd> or press <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 rounded text-xs">⌘N</kbd> to add a project directory</li>
                <li>• Projects are automatically discovered from the filesystem</li>
                <li>• Each project tracks its agents, worktrees, and OpenSpec configurations</li>
                <li>• Click any project card to view its details and spawn agents</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
