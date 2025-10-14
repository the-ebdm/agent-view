/**
 * Slash Command Button Component
 * UI buttons for executing OpenSpec slash commands (proposal, apply, archive)
 */

"use client";

import React, { useState } from "react";
import {
  buildApplyChangePrompt,
  buildReviewChangePrompt,
  buildProposalPrompt,
  buildArchivePrompt,
  type OpenSpecChangeContext,
} from "@/lib/openspec/prompt-builder";

type CommandType = "proposal" | "apply" | "review" | "archive";

interface SlashCommandButtonProps {
  command: CommandType;
  changeId?: string; // If provided, skip the input dialog
  onSuccess?: (output: string) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  children?: React.ReactNode;
  // OpenSpec context for enriched prompts (apply command)
  changeContext?: OpenSpecChangeContext;
  projectDirectory?: string;
}

const COMMAND_CONFIG: Record<
  CommandType,
  {
    label: string;
    icon: string;
    description: string;
    promptLabel: string;
    placeholder: string;
  }
> = {
  proposal: {
    label: "New Proposal",
    icon: "📝",
    description: "Create a new OpenSpec change proposal",
    promptLabel: "Change ID",
    placeholder: "e.g., add-new-feature",
  },
  apply: {
    label: "Apply Change",
    icon: "⚡",
    description: "Apply an OpenSpec change proposal",
    promptLabel: "Change ID",
    placeholder: "e.g., add-new-feature",
  },
  review: {
    label: "Review Change",
    icon: "🔍",
    description: "Review an OpenSpec change proposal",
    promptLabel: "Change ID",
    placeholder: "e.g., add-new-feature",
  },
  archive: {
    label: "Archive Change",
    icon: "📦",
    description: "Archive a completed change",
    promptLabel: "Change ID",
    placeholder: "e.g., add-new-feature",
  },
};

export function SlashCommandButton({
  command,
  changeId: providedChangeId,
  onSuccess,
  onError,
  className = "",
  variant = "primary",
  disabled = false,
  children,
  changeContext,
  projectDirectory,
}: SlashCommandButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [changeId, setChangeId] = useState("");
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
      setChangeId("");
      setOutput(null);
      setError(null);
    }
  };

  // Execute the slash command by spawning an agent
  const executeCommand = async (id: string) => {
    setIsExecuting(true);
    setOutput(null);
    setError(null);

    try {
      await spawnOpenSpecAgent(id);
    } catch (err: unknown) {
      const errorText =
        err instanceof Error ? err.message : "Failed to spawn agent";
      setError(errorText);
      onError?.(errorText);
    } finally {
      setIsExecuting(false);
    }
  };

  // Spawn agent for OpenSpec command
  const spawnOpenSpecAgent = async (id: string) => {
    try {
      let prompt: string;
      let agentName: string;

      // Build prompt based on command type
      switch (command) {
        case "proposal":
          prompt = buildProposalPrompt(id, projectDirectory);
          agentName = `Proposal - ${id}`;
          break;

        case "apply":
          // Use provided context or create minimal context
          const applyContext: OpenSpecChangeContext = changeContext || {
            changeId: id,
            name: id,
          };
          prompt = buildApplyChangePrompt(applyContext, projectDirectory);
          agentName = `Apply - ${applyContext.name}`;
          break;

        case "review":
          // Use provided context or create minimal context
          const reviewContext: OpenSpecChangeContext = changeContext || {
            changeId: id,
            name: id,
          };
          prompt = buildReviewChangePrompt(reviewContext, projectDirectory);
          agentName = `Review - ${reviewContext.name}`;
          break;

        case "archive":
          prompt = buildArchivePrompt(id, projectDirectory, skipSpecs, autoYes);
          agentName = `Archive - ${id}`;
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }

      console.log("agentName", agentName);
      console.log("command", command);
      console.log("prompt", prompt);

      // Spawn new agent
      const response = await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          prompt,
          directory: projectDirectory || process.cwd(),
          toolPermissions: {
            preset:
              command === "apply" || command === "review"
                ? "full-access"
                : "standard",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to spawn agent");
      }

      const { id: agentId, name } = await response.json();

      // Build success message based on command
      let successMessage = `✓ Agent "${name}" spawned successfully!\n\nAgent ID: ${agentId}\n\n`;

      switch (command) {
        case "proposal":
          successMessage +=
            "The agent will create a new OpenSpec change proposal.\nYou can monitor progress in the main dashboard.";
          break;
        case "apply":
          successMessage +=
            "The agent will implement the change according to the approved proposal.\nYou can monitor progress in the main dashboard.";
          break;
        case "review":
          successMessage +=
            "The agent will review the change proposal.\nYou can monitor progress in the main dashboard.";
          break;
        case "archive":
          successMessage +=
            "The agent will archive the completed change.\nYou can monitor progress in the main dashboard.";
          break;
      }

      setOutput(successMessage);
      onSuccess?.(agentId);

      // Close dialog after delay
      setTimeout(() => {
        setShowDialog(false);
      }, 3000);
    } catch (err: unknown) {
      throw err;
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!changeId.trim()) {
      setError("Change ID is required");
      return;
    }

    // Validate change ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(changeId)) {
      setError(
        "Change ID can only contain letters, numbers, hyphens, and underscores"
      );
      return;
    }

    executeCommand(changeId);
  };

  // Button variants
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary:
      "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200",
    danger: "bg-red-600 hover:bg-red-700 text-white",
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
              {command === "archive" && (
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
                    "Execute"
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
export function NewProposalButton(
  props: Omit<SlashCommandButtonProps, "command">
) {
  return <SlashCommandButton command="proposal" variant="primary" {...props} />;
}

export function ApplyChangeButton(
  props: Omit<SlashCommandButtonProps, "command">
) {
  return <SlashCommandButton command="apply" variant="primary" {...props} />;
}

export function ReviewChangeButton(
  props: Omit<SlashCommandButtonProps, "command">
) {
  return <SlashCommandButton command="review" variant="primary" {...props} />;
}

export function ArchiveChangeButton(
  props: Omit<SlashCommandButtonProps, "command">
) {
  return <SlashCommandButton command="archive" variant="danger" {...props} />;
}
