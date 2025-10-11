/**
 * Slash Command Button Component
 * UI buttons for executing OpenSpec slash commands (proposal, apply, archive)
 */

'use client';

import React, { useState } from 'react';

type CommandType = 'proposal' | 'apply' | 'archive';

interface SlashCommandButtonProps {
  command: CommandType;
  changeId?: string; // If provided, skip the input dialog
  onSuccess?: (output: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  children?: React.ReactNode;
}

const COMMAND_CONFIG: Record<CommandType, {
  label: string;
  icon: string;
  description: string;
  promptLabel: string;
  placeholder: string;
}> = {
  proposal: {
    label: 'New Proposal',
    icon: '📝',
    description: 'Create a new OpenSpec change proposal',
    promptLabel: 'Change ID',
    placeholder: 'e.g., add-new-feature',
  },
  apply: {
    label: 'Apply Change',
    icon: '⚡',
    description: 'Apply an OpenSpec change proposal',
    promptLabel: 'Change ID',
    placeholder: 'e.g., add-new-feature',
  },
  archive: {
    label: 'Archive Change',
    icon: '📦',
    description: 'Archive a completed change',
    promptLabel: 'Change ID',
    placeholder: 'e.g., add-new-feature',
  },
};

export function SlashCommandButton({
  command,
  changeId: providedChangeId,
  onSuccess,
  onError,
  className = '',
  variant = 'primary',
  disabled = false,
  children,
}: SlashCommandButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [changeId, setChangeId] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Archive-specific flags
  const [skipSpecs, setSkipSpecs] = useState(false);
  const [autoYes, setAutoYes] = useState(true);

  const config = COMMAND_CONFIG[command];

  // Handle button click
  const handleClick = () => {
    if (providedChangeId) {
      // Execute immediately if changeId is provided
      executeCommand(providedChangeId);
    } else {
      // Show dialog to get changeId
      setShowDialog(true);
      setChangeId('');
      setOutput(null);
      setError(null);
    }
  };

  // Execute the slash command
  const executeCommand = async (id: string) => {
    setIsExecuting(true);
    setOutput(null);
    setError(null);

    try {
      // Build args based on command type
      let args = id;
      if (command === 'archive') {
        if (skipSpecs) args += ' --skip-specs';
        if (autoYes) args += ' --yes';
      }

      // Call API to execute command
      const response = await fetch('/api/slash-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          args,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const outputText = result.stdout || 'Command executed successfully';
        setOutput(outputText);
        onSuccess?.(outputText);

        // Close dialog after short delay
        setTimeout(() => {
          setShowDialog(false);
        }, 2000);
      } else {
        const errorText = result.stderr || result.error || 'Command failed';
        setError(errorText);
        onError?.(errorText);
      }

    } catch (err: any) {
      const errorText = err.message || 'Failed to execute command';
      setError(errorText);
      onError?.(errorText);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!changeId.trim()) {
      setError('Change ID is required');
      return;
    }

    // Validate change ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(changeId)) {
      setError('Change ID can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    executeCommand(changeId);
  };

  // Button variants
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleClick}
        disabled={disabled || isExecuting}
        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      >
        {children || (
          <span className="flex items-center gap-2">
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        )}
      </button>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {config.description}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-4">
              {/* Change ID Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {config.promptLabel}
                </label>
                <input
                  type="text"
                  value={changeId}
                  onChange={(e) => setChangeId(e.target.value)}
                  placeholder={config.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500"
                  disabled={isExecuting}
                  autoFocus
                />
              </div>

              {/* Archive-specific options */}
              {command === 'archive' && (
                <div className="mb-4 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={skipSpecs}
                      onChange={(e) => setSkipSpecs(e.target.checked)}
                      disabled={isExecuting}
                      className="rounded"
                    />
                    <span>Skip updating specs (--skip-specs)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={autoYes}
                      onChange={(e) => setAutoYes(e.target.checked)}
                      disabled={isExecuting}
                      className="rounded"
                    />
                    <span>Auto-confirm (--yes)</span>
                  </label>
                </div>
              )}

              {/* Output/Error Display */}
              {output && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap font-mono">
                    {output}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                    {error}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  disabled={isExecuting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting || !changeId.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
                >
                  {isExecuting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span>Executing...</span>
                    </span>
                  ) : (
                    'Execute'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Quick action buttons for common commands
 */
export function NewProposalButton(props: Omit<SlashCommandButtonProps, 'command'>) {
  return <SlashCommandButton command="proposal" variant="primary" {...props} />;
}

export function ApplyChangeButton(props: Omit<SlashCommandButtonProps, 'command'>) {
  return <SlashCommandButton command="apply" variant="primary" {...props} />;
}

export function ArchiveChangeButton(props: Omit<SlashCommandButtonProps, 'command'>) {
  return <SlashCommandButton command="archive" variant="danger" {...props} />;
}
