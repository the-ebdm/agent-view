// Phase 2: React Context for managing active agents state
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AgentSession, AgentMetrics } from '@/types/agent';

interface AgentWithMetrics extends AgentSession {
  metrics?: AgentMetrics;
}

interface ActiveAgentsContextValue {
  agents: AgentWithMetrics[];
  isLoading: boolean;
  error: string | null;
  refreshAgents: () => Promise<void>;
  addAgent: (agent: AgentSession) => void;
  updateAgent: (id: string, updates: Partial<AgentSession>) => void;
  removeAgent: (id: string) => void;
}

const ActiveAgentsContext = createContext<ActiveAgentsContextValue | undefined>(undefined);

interface ActiveAgentsProviderProps {
  children: ReactNode;
  pollInterval?: number; // Polling interval in ms (default: 2000)
}

export function ActiveAgentsProvider({ children, pollInterval = 2000 }: ActiveAgentsProviderProps) {
  const [agents, setAgents] = useState<AgentWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch active agents');
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching active agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for agent updates
  useEffect(() => {
    // Initial fetch
    refreshAgents();

    // Set up polling
    const interval = setInterval(refreshAgents, pollInterval);

    return () => clearInterval(interval);
  }, [refreshAgents, pollInterval]);

  const addAgent = useCallback((agent: AgentSession) => {
    setAgents(prev => [...prev, agent]);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<AgentSession>) => {
    setAgents(prev =>
      prev.map(agent =>
        agent.id === id ? { ...agent, ...updates } : agent
      )
    );
  }, []);

  const removeAgent = useCallback((id: string) => {
    setAgents(prev => prev.filter(agent => agent.id !== id));
  }, []);

  const value: ActiveAgentsContextValue = {
    agents,
    isLoading,
    error,
    refreshAgents,
    addAgent,
    updateAgent,
    removeAgent,
  };

  return (
    <ActiveAgentsContext.Provider value={value}>
      {children}
    </ActiveAgentsContext.Provider>
  );
}

export function useActiveAgents() {
  const context = useContext(ActiveAgentsContext);
  if (context === undefined) {
    throw new Error('useActiveAgents must be used within an ActiveAgentsProvider');
  }
  return context;
}
