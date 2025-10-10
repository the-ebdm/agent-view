// Phase 2: Enhanced spawn form with name and tool permissions
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ToolPermission, ToolPermissionPreset, ToolName } from '@/types/agent';
import { ALL_TOOLS, TOOL_PRESETS, DANGEROUS_TOOLS, TOOL_DESCRIPTIONS } from '@/lib/tool-permissions';
import { useActiveAgents } from '@/contexts/active-agents-context';

interface AgentSpawnFormV2Props {
  onSpawn?: (agentId: string) => void;
}

export function AgentSpawnFormV2({ onSpawn }: AgentSpawnFormV2Props) {
  const { refreshAgents } = useActiveAgents();
  const [prompt, setPrompt] = useState('');
  const [directory, setDirectory] = useState('/Users/ericmuir/Projects/agent-view');
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<ToolPermissionPreset>('standard');
  const [customTools, setCustomTools] = useState<Set<ToolName>>(new Set(['Read', 'Grep', 'Glob']));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDangerousWarning, setShowDangerousWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }

    if (!directory.trim()) {
      setError('Directory is required');
      return;
    }

    // Build tool permissions
    const toolPermissions: ToolPermission = {
      preset,
      ...(preset === 'custom' && { tools: Array.from(customTools) }),
    };

    // Check for dangerous tools
    if (preset === 'full-access' || (preset === 'custom' && Array.from(customTools).some(t => DANGEROUS_TOOLS.includes(t)))) {
      if (!showDangerousWarning) {
        setShowDangerousWarning(true);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/agents/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          directory,
          name: name.trim() || undefined,
          toolPermissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to spawn agent');
      }

      const data = await response.json();

      // Clear form
      setPrompt('');
      setName('');
      setShowDangerousWarning(false);

      // Refresh agents list
      await refreshAgents();

      // Callback with new agent ID
      if (onSpawn) {
        onSpawn(data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTool = (tool: ToolName) => {
    const newTools = new Set(customTools);
    if (newTools.has(tool)) {
      newTools.delete(tool);
    } else {
      newTools.add(tool);
    }
    setCustomTools(newTools);
  };

  const handleCancelDangerousWarning = () => {
    setShowDangerousWarning(false);
  };

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <h3 className="font-semibold">Spawn New Agent</h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Agent Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Agent Name <span className="text-gray-400">(optional)</span>
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Auto-generate (e.g., Swift Fox)"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty for auto-generated name
          </p>
        </div>

        {/* Directory */}
        <div>
          <label htmlFor="directory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Working Directory
          </label>
          <Input
            id="directory"
            type="text"
            value={directory}
            onChange={(e) => setDirectory(e.target.value)}
            placeholder="/path/to/directory"
            disabled={loading}
          />
        </div>

        {/* Prompt */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Agent Prompt
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What would you like the agent to do?"
            rows={4}
            disabled={loading}
            error={error || undefined}
          />
        </div>

        {/* Tool Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tool Permissions
          </label>

          {/* Preset Selector */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(['read-only', 'standard', 'full-access', 'custom'] as ToolPermissionPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPreset(p);
                  setShowDangerousWarning(false);
                }}
                disabled={loading}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  preset === p
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold capitalize">
                    {p === 'read-only' && '🔒'}
                    {p === 'standard' && '🛡️'}
                    {p === 'full-access' && '⚠️'}
                    {p === 'custom' && '⚙️'}
                    {' '}
                    {p.replace('-', ' ')}
                  </span>
                  {p === 'full-access' && (
                    <Badge variant="destructive" className="text-xs">Dangerous</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {TOOL_PRESETS[p].description.split('.')[0]}
                </p>
              </button>
            ))}
          </div>

          {/* Custom Tool Selection */}
          {preset === 'custom' && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Tools:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_TOOLS.map((tool) => (
                  <label
                    key={tool}
                    className="flex items-center gap-2 cursor-pointer"
                    title={TOOL_DESCRIPTIONS[tool]}
                  >
                    <input
                      type="checkbox"
                      checked={customTools.has(tool)}
                      onChange={() => handleToggleTool(tool)}
                      disabled={loading}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {tool}
                      {DANGEROUS_TOOLS.includes(tool) && ' ⚠️'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Dangerous Warning */}
        {showDangerousWarning && (
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                  Grant Full Access?
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  This configuration allows file modification and command execution. Only proceed if you trust this task.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelDangerousWarning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                loading={loading}
              >
                {loading ? 'Spawning...' : 'Confirm & Spawn'}
              </Button>
            </div>
          </div>
        )}

        {/* Submit */}
        {!showDangerousWarning && (
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Spawning Agent...' : 'Spawn Agent'}
          </Button>
        )}
      </form>
    </Card>
  );
}
