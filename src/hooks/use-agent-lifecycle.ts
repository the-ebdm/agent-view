// Phase 2: Hook for agent lifecycle control
'use client';

import { useState, useCallback } from 'react';
import { useActiveAgents } from '@/contexts/active-agents-context';

interface LifecycleState {
  isLoading: boolean;
  error: string | null;
}

export function useAgentLifecycle(agentId: string) {
  const { updateAgent, removeAgent, refreshAgents } = useActiveAgents();
  const [pauseState, setPauseState] = useState<LifecycleState>({ isLoading: false, error: null });
  const [resumeState, setResumeState] = useState<LifecycleState>({ isLoading: false, error: null });
  const [stopState, setStopState] = useState<LifecycleState>({ isLoading: false, error: null });
  const [restartState, setRestartState] = useState<LifecycleState>({ isLoading: false, error: null });

  const pause = useCallback(async () => {
    setPauseState({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/agents/${agentId}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pause agent');
      }

      const data = await response.json();
      updateAgent(agentId, { lifecycleState: data.lifecycleState, pausedTime: data.pausedTime });
      setPauseState({ isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to pause agent';
      setPauseState({ isLoading: false, error });
      throw err;
    }
  }, [agentId, updateAgent]);

  const resume = useCallback(async () => {
    setResumeState({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/agents/${agentId}/resume`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resume agent');
      }

      const data = await response.json();
      updateAgent(agentId, { lifecycleState: data.lifecycleState, pausedTime: undefined });
      setResumeState({ isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to resume agent';
      setResumeState({ isLoading: false, error });
      throw err;
    }
  }, [agentId, updateAgent]);

  const stop = useCallback(async () => {
    setStopState({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/agents/${agentId}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop agent');
      }

      // Agent moved to history, remove from active list
      removeAgent(agentId);
      setStopState({ isLoading: false, error: null });

      // Refresh to ensure consistency
      await refreshAgents();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to stop agent';
      setStopState({ isLoading: false, error });
      throw err;
    }
  }, [agentId, removeAgent, refreshAgents]);

  const restart = useCallback(async () => {
    setRestartState({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/agents/${agentId}/restart`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restart agent');
      }

      // Remove old agent and refresh to get new one
      removeAgent(agentId);
      await refreshAgents();
      setRestartState({ isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to restart agent';
      setRestartState({ isLoading: false, error });
      throw err;
    }
  }, [agentId, removeAgent, refreshAgents]);

  return {
    pause: { execute: pause, ...pauseState },
    resume: { execute: resume, ...resumeState },
    stop: { execute: stop, ...stopState },
    restart: { execute: restart, ...restartState },
  };
}
