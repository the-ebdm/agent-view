// Phase 2: Active Agents Dashboard with card grid layout
"use client";

import React, { useState } from "react";
import { AgentCard } from "./agent-card";
import { AgentInteractionModal } from "./agent-interaction-modal";
import { PermissionApprovalDrawer } from "./permission-approval-drawer";
import { useActiveAgents } from "@/contexts/active-agents-context";

export function ActiveAgentsDashboard() {
  const { agents, isLoading, error } = useActiveAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [approvalDrawerAgentId, setApprovalDrawerAgentId] = useState<string | null>(null);

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

        <div>
          {isLoading && (
            <div className="flex">
              <div className="mr-2">
                <div className="animate-spin">⚙️</div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Loading agents...
              </p>
            </div>
          )}
          {agents.length >= 10 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                High agent count may impact performance
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Empty/Loading State */}
      {agents.length === 0 && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-7xl mb-4">🤖</div>
            <div className="text-center max-w-md">
              <h3 className="text-2xl font-bold mb-2">No Active Agents</h3>
              <p className="text-gray-500 dark:text-gray-400 text-base mb-6">
                Spawn your first agent to start automating tasks
              </p>

              {/* Quick Start Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl mb-2">📋</div>
                  <h4 className="font-semibold text-sm mb-1">Use Templates</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Start with pre-built tasks
                  </p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl mb-2">⌨️</div>
                  <h4 className="font-semibold text-sm mb-1">Press ⌘K</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Quick spawn with keyboard
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl mb-2">💡</div>
                  <h4 className="font-semibold text-sm mb-1">Press ⌘H</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    View all shortcuts
                  </p>
                </div>
              </div>
            </div>
          </div>
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
              onOpenApprovals={() => setApprovalDrawerAgentId(agent.id)}
            />
          ))}
        </div>
      )}

      {/* Interaction Modal */}
      {selectedAgent && (
        <AgentInteractionModal
          agent={selectedAgent}
          onClose={() => setSelectedAgentId(null)}
          onOpenApprovals={() => setApprovalDrawerAgentId(selectedAgent.id)}
        />
      )}

      {/* Permission Approval Drawer */}
      {approvalDrawerAgentId && (
        <PermissionApprovalDrawer
          agentId={approvalDrawerAgentId}
          isOpen={approvalDrawerAgentId !== null}
          onClose={() => setApprovalDrawerAgentId(null)}
        />
      )}
    </div>
  );
}
