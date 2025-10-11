/**
 * Help Modal
 * Displays keyboard shortcuts and usage help
 */
'use client';

import React from 'react';
import { formatShortcut } from '@/hooks/use-keyboard-shortcuts';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const shortcuts = [
    {
      section: 'General',
      items: [
        { keys: { meta: true, key: 'k' }, description: 'Toggle spawn form' },
        { keys: { meta: true, key: 'h' }, description: 'Show help (this modal)' },
        { keys: { key: 'Escape' }, description: 'Close modals / Cancel actions' },
      ],
    },
    {
      section: 'Navigation',
      items: [
        { keys: { meta: true, key: '1' }, description: 'Switch to Agents tab' },
        { keys: { meta: true, key: '2' }, description: 'Switch to OpenSpec tab' },
        { keys: { meta: true, key: '3' }, description: 'Switch to History tab' },
      ],
    },
    {
      section: 'Agent Management',
      items: [
        { keys: { meta: true, shift: true, key: 'n' }, description: 'Spawn new agent' },
        { keys: { meta: true, key: 'r' }, description: 'Refresh agents' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">❓</span>
              <div>
                <h2 className="text-2xl font-bold">Help & Shortcuts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Keyboard shortcuts and usage guide
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {/* Quick Start */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🚀</span>
              Quick Start
            </h3>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>1. <strong>Choose a template</strong> or start with a custom prompt</p>
              <p>2. <strong>Select tool permissions</strong> based on your task requirements</p>
              <p>3. <strong>Click "Spawn Agent"</strong> to start the agent</p>
              <p>4. <strong>Monitor progress</strong> in the active agents dashboard</p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>⌨️</span>
              Keyboard Shortcuts
            </h3>
            <div className="space-y-4">
              {shortcuts.map((section, idx) => (
                <div key={idx}>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {section.section}
                  </h4>
                  <div className="space-y-2">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.description}
                        </span>
                        <kbd className="px-3 py-1 text-sm font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                          {formatShortcut(item.keys)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tool Permissions Guide */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🛡️</span>
              Tool Permissions
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span>🔒</span>
                  <strong className="text-sm">Read Only</strong>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Safe for exploration and analysis. Cannot modify files or execute commands.
                </p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span>🛡️</span>
                  <strong className="text-sm">Standard</strong>
                  <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded">Recommended</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Balanced permissions for development tasks. Can modify files but with safety checks.
                </p>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-1">
                  <span>⚠️</span>
                  <strong className="text-sm">Full Access</strong>
                  <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-0.5 rounded">Dangerous</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Complete access including shell commands. Use only for trusted tasks.
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span>⚙️</span>
                  <strong className="text-sm">Custom</strong>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Manually select specific tools needed for your task.
                </p>
              </div>
            </div>
          </div>

          {/* Tips & Best Practices */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>💡</span>
              Tips & Best Practices
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
              <li>Save frequently used configurations for quick access</li>
              <li>Use templates to get started quickly with common tasks</li>
              <li>Monitor agent progress through the dashboard cards</li>
              <li>Use the appropriate permission level for each task</li>
              <li>Check recent agents to re-run similar tasks</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
