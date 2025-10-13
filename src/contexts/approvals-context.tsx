/**
 * Approvals Context
 * Centralized approval state management to avoid redundant polling
 */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface PendingApproval {
  id: string;
  toolName: string;
  description: string;
  params: Record<string, unknown>;
  timestamp: number;
}

interface AgentApprovals {
  agentId: string;
  count: number;
  approvals: PendingApproval[];
  lastFetched: number;
}

interface ApprovalsContextValue {
  getApprovals: (agentId: string) => AgentApprovals | undefined;
  refreshApprovals: (agentId: string) => Promise<void>;
  clearApprovals: (agentId: string) => void;
}

const ApprovalsContext = createContext<ApprovalsContextValue | undefined>(undefined);

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_AGE = 10000; // Consider data stale after 10 seconds

export function ApprovalsProvider({ children }: { children: React.ReactNode }) {
  const [approvalsMap, setApprovalsMap] = useState<Map<string, AgentApprovals>>(new Map());
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());

  // Fetch approvals for a specific agent
  const fetchApprovals = useCallback(async (agentId: string): Promise<AgentApprovals> => {
    try {
      const response = await fetch(`/api/agents/${agentId}/approvals`);
      if (response.ok) {
        const data = await response.json();
        return {
          agentId,
          count: data.count || 0,
          approvals: data.approvals || [],
          lastFetched: Date.now(),
        };
      }
    } catch (error) {
      console.error(`Error fetching approvals for agent ${agentId}:`, error);
    }

    return {
      agentId,
      count: 0,
      approvals: [],
      lastFetched: Date.now(),
    };
  }, []);

  // Refresh approvals for a specific agent
  const refreshApprovals = useCallback(async (agentId: string) => {
    const data = await fetchApprovals(agentId);
    setApprovalsMap(prev => {
      const next = new Map(prev);
      next.set(agentId, data);
      return next;
    });
    setActiveAgents(prev => new Set(prev).add(agentId));
  }, [fetchApprovals]);

  // Get approvals for a specific agent
  const getApprovals = useCallback((agentId: string): AgentApprovals | undefined => {
    const data = approvalsMap.get(agentId);

    // If data doesn't exist or is stale, trigger a refresh
    if (!data || (Date.now() - data.lastFetched) > MAX_AGE) {
      // Trigger async refresh (don't block)
      refreshApprovals(agentId);
    }

    return data;
  }, [approvalsMap, refreshApprovals]);

  // Clear approvals for a specific agent (when agent is removed)
  const clearApprovals = useCallback((agentId: string) => {
    setApprovalsMap(prev => {
      const next = new Map(prev);
      next.delete(agentId);
      return next;
    });
    setActiveAgents(prev => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  // Background polling for all active agents
  useEffect(() => {
    if (activeAgents.size === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        Array.from(activeAgents).map(agentId => fetchApprovals(agentId))
      );

      setApprovalsMap(prev => {
        const next = new Map(prev);
        updates.forEach(update => {
          next.set(update.agentId, update);
        });
        return next;
      });
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeAgents, fetchApprovals]);

  const value: ApprovalsContextValue = {
    getApprovals,
    refreshApprovals,
    clearApprovals,
  };

  return (
    <ApprovalsContext.Provider value={value}>
      {children}
    </ApprovalsContext.Provider>
  );
}

export function useApprovals(agentId: string) {
  const context = useContext(ApprovalsContext);
  if (!context) {
    throw new Error('useApprovals must be used within ApprovalsProvider');
  }

  const [approvals, setApprovals] = useState<AgentApprovals | undefined>(undefined);

  useEffect(() => {
    // Initial fetch
    context.refreshApprovals(agentId);

    // Subscribe to updates
    const interval = setInterval(() => {
      const data = context.getApprovals(agentId);
      setApprovals(data);
    }, 500); // Check for updates frequently, but polling happens centrally

    return () => {
      clearInterval(interval);
    };
  }, [agentId, context]);

  // Also update immediately when context data changes
  useEffect(() => {
    const data = context.getApprovals(agentId);
    setApprovals(data);
  }, [agentId, context]);

  return {
    approvalCount: approvals?.count || 0,
    approvals: approvals?.approvals || [],
    refresh: () => context.refreshApprovals(agentId),
  };
}
