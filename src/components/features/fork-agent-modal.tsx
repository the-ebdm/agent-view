// Fork Agent Modal - Create a new agent from an existing session
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActiveAgents } from "@/contexts/active-agents-context";
import type { AgentSession } from "@/types/agent";

interface ForkAgentModalProps {
  agent: AgentSession;
  onClose: () => void;
  onSuccess?: (newAgent: AgentSession) => void;
}

export function ForkAgentModal({ agent, onClose, onSuccess }: ForkAgentModalProps) {
  const { refreshAgents: refresh } = useActiveAgents();
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState(`${agent.name} - fork`);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateFork = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt for the forked agent");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agent.id}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          name: name.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create fork');
      }

      const result = await response.json();
      console.log("Fork created:", result);

      // Refresh the agents list to show the new fork
      await refresh();

      // Call success callback if provided
      if (onSuccess) {
        // Find the new agent in the refreshed list
        setTimeout(() => {
          onSuccess(result);
        }, 500);
      }

      onClose();
    } catch (err) {
      console.error("Failed to create fork:", err);
      setError(err instanceof Error ? err.message : 'Failed to create fork');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreateFork();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold">Fork Agent</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a new agent from &quot;{agent.name}&quot;
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!agent.sessionId && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">❌</span>
                <div className="text-sm text-red-800 dark:text-red-200">
                  <div className="font-semibold">Session Not Available</div>
                  <div className="text-xs mt-1">
                    This agent was created before session management was enabled. Forking is not available.
                  </div>
                </div>
              </div>
            </div>
          )}

          {agent.sessionId && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fork Name (optional)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Default: ${agent.name} - fork`}
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Prompt <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What should the forked agent do? (e.g., 'Try that again but use TypeScript', 'Explore a different approach')"
                  rows={3}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The fork will start with the full conversation history of &quot;{agent.name}&quot; but follow this new direction.
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <div className="font-semibold">How Forking Works</div>
                    <div className="text-xs mt-1">
                      Creates a new independent agent with full conversation history from &quot;{agent.name}&quot;.
                      Both agents will exist separately.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {agent.sessionId && (
          <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFork}
              disabled={!prompt.trim() || isCreating}
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create Fork"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}