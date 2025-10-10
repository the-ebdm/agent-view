// Phase 2: Active Agents Dashboard with card grid layout
"use client";

import React, { useState } from "react";
import { AgentCard } from "./agent-card";
import { AgentInteractionModal } from "./agent-interaction-modal";
import { useActiveAgents } from "@/contexts/active-agents-context";

export function ActiveAgentsDashboard() {
  const { agents, isLoading, error } = useActiveAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Dashboard grid view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Active Agents</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {agents.length} {agents.length === 1 ? "agent" : "agents"} running
          </p>
        </div>

        {agents.length >= 10 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              High agent count may impact performance
            </span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-6xl mb-4">🤖</div>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin text-4xl mb-2">⚙️</div>
              <p className="text-gray-500 dark:text-gray-400">
                Loading agents...
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-2">No Active Agents</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Spawn an agent to get started
              </p>
            </>
          )}
        </div>
      )}

      {/* Agent Cards Grid */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              metrics={agent.metrics}
              onOpenModal={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      )}

      {/* Interaction Modal */}
      {selectedAgent && (
        <AgentInteractionModal
          agent={selectedAgent}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  );
}
