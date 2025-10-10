// Phase 2: Agent Card component for dashboard grid
'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAgentLifecycle } from '@/hooks/use-agent-lifecycle';
import type { AgentSession, AgentMetrics } from '@/types/agent';

interface AgentCardProps {
  agent: AgentSession;
  metrics?: AgentMetrics;
  onOpenModal?: () => void;
}

export function AgentCard({ agent, metrics, onOpenModal }: AgentCardProps) {
  const { pause, resume, stop } = useAgentLifecycle(agent.id);
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'stopped':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'running':
        return 'Running';
      case 'paused':
        return 'Paused';
      case 'stopped':
        return 'Stopped';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getPermissionBadgeColor = (preset: string) => {
    switch (preset) {
      case 'read-only':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'standard':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'full-access':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'custom':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pause.execute();
    } catch (err) {
      console.error('Failed to pause agent:', err);
    }
  };

  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resume.execute();
    } catch (err) {
      console.error('Failed to resume agent:', err);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showConfirmStop) {
      setShowConfirmStop(true);
      return;
    }

    try {
      await stop.execute();
    } catch (err) {
      console.error('Failed to stop agent:', err);
    }
  };

  const handleCancelStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmStop(false);
  };

  const isRunning = agent.lifecycleState === 'running';
  const isPaused = agent.lifecycleState === 'paused';

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
        isRunning ? 'ring-2 ring-green-400 ring-offset-2' : ''
      }`}
      onClick={onOpenModal}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{agent.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {agent.directory}
          </p>
        </div>
        <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.lifecycleState)} ${isRunning ? 'animate-pulse' : ''}`} />
      </div>

      {/* Status and Permissions */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {getStatusText(agent.lifecycleState)}
        </Badge>
        <Badge className={`text-xs ${getPermissionBadgeColor(agent.toolPermissions.preset)}`}>
          {agent.toolPermissions.preset === 'read-only' && '🔒'}
          {agent.toolPermissions.preset === 'standard' && '🛡️'}
          {agent.toolPermissions.preset === 'full-access' && '⚠️'}
          {agent.toolPermissions.preset === 'custom' && '⚙️'}
          {' '}
          {agent.toolPermissions.preset}
        </Badge>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Messages:</span>
            <span className="ml-1 font-semibold">{metrics.messageCount}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Time:</span>
            <span className="ml-1 font-semibold">{formatTime(metrics.elapsedTime)}</span>
          </div>
        </div>
      )}

      {/* Prompt Preview */}
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
        {agent.prompt}
      </p>

      {/* Actions */}
      {!showConfirmStop ? (
        <div className="flex gap-2">
          {isRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={pause.isLoading}
              className="flex-1"
            >
              {pause.isLoading ? '⏸️ Pausing...' : '⏸️ Pause'}
            </Button>
          )}
          {isPaused && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResume}
              disabled={resume.isLoading}
              className="flex-1"
            >
              {resume.isLoading ? '▶️ Resuming...' : '▶️ Resume'}
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
            disabled={stop.isLoading}
            className={isPaused || !isRunning ? 'flex-1' : ''}
          >
            {stop.isLoading ? '🛑 Stopping...' : '🛑 Stop'}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancelStop}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStop}
            disabled={stop.isLoading}
            className="flex-1"
          >
            {stop.isLoading ? 'Confirming...' : 'Confirm Stop'}
          </Button>
        </div>
      )}

      {/* Error Messages */}
      {(pause.error || resume.error || stop.error) && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          {pause.error || resume.error || stop.error}
        </div>
      )}
    </Card>
  );
}
