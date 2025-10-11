/**
 * Agent Spawn Modal
 * Full-screen modal for spawning new agents
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { ToolPermission, ToolPermissionPreset, ToolName } from '@/types/agent';
import { ALL_TOOLS, TOOL_PRESETS, DANGEROUS_TOOLS, TOOL_DESCRIPTIONS } from '@/lib/tool-permissions';
import { useActiveAgents } from '@/contexts/active-agents-context';
import { AGENT_TEMPLATES, AgentConfigStorage, type SavedAgentConfig, type AgentTemplate } from '@/lib/agent-templates';

interface AgentSpawnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawn?: (agentId: string) => void;
}

export function AgentSpawnModal({ isOpen, onClose, onSpawn }: AgentSpawnModalProps) {
  const { refreshAgents } = useActiveAgents();
  const [activeTab, setActiveTab] = useState<'templates' | 'recent' | 'saved'>('templates');
  const [prompt, setPrompt] = useState('');
  const [directory, setDirectory] = useState('/Users/ericmuir/Projects/agent-view');
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<ToolPermissionPreset>('standard');
  const [customTools, setCustomTools] = useState<Set<ToolName>>(new Set(['Read', 'Grep', 'Glob']));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDangerousWarning, setShowDangerousWarning] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedAgentConfig[]>([]);
  const [recentAgents, setRecentAgents] = useState<SavedAgentConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [configName, setConfigName] = useState('');
  const [showSaveConfig, setShowSaveConfig] = useState(false);

  // Load saved configs and recent agents
  useEffect(() => {
    if (isOpen) {
      setSavedConfigs(AgentConfigStorage.getConfigs());
      setRecentAgents(AgentConfigStorage.getRecent());
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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

      // Add to recent
      AgentConfigStorage.addToRecent({
        name: name.trim() || 'Unnamed Agent',
        prompt,
        directory,
        toolPreset: preset,
        customTools: preset === 'custom' ? Array.from(customTools) : undefined,
      });

      // Clear form and close modal
      setPrompt('');
      setName('');
      setShowDangerousWarning(false);
      setShowSaveConfig(false);

      // Refresh agents list
      await refreshAgents();

      // Close modal
      onClose();

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

  const handleLoadTemplate = (template: AgentTemplate) => {
    setPrompt(template.prompt);
    setPreset(template.toolPreset);
    setName('');
    setError(null);
  };

  const handleLoadConfig = (config: SavedAgentConfig) => {
    setPrompt(config.prompt);
    setDirectory(config.directory);
    setPreset(config.toolPreset);
    setName(config.name);
    if (config.customTools && config.toolPreset === 'custom') {
      setCustomTools(new Set(config.customTools as ToolName[]));
    }
    setError(null);
  };

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      setError('Configuration name is required');
      return;
    }

    AgentConfigStorage.saveConfig({
      name: configName,
      prompt,
      directory,
      toolPreset: preset,
      customTools: preset === 'custom' ? Array.from(customTools) : undefined,
    });

    setSavedConfigs(AgentConfigStorage.getConfigs());
    setShowSaveConfig(false);
    setConfigName('');
  };

  const handleDeleteConfig = (id: string) => {
    AgentConfigStorage.deleteConfig(id);
    setSavedConfigs(AgentConfigStorage.getConfigs());
  };

  const filteredTemplates = selectedCategory === 'all'
    ? AGENT_TEMPLATES
    : AGENT_TEMPLATES.filter(t => t.category === selectedCategory);

  const categories = ['all', 'development', 'review', 'refactor', 'documentation', 'testing', 'analysis'];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-xl font-bold text-white">Spawn New Agent</h2>
              <p className="text-sm text-blue-100">Configure and launch an AI agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
            title="Close (Esc)"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Templates & Quick Access */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3">Quick Start</h3>

                {/* Quick Access Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className={`px-4 py-2 text-sm font-medium transition-all ${
                        activeTab === 'templates'
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      📋 Templates
                    </button>
                    <button
                      onClick={() => setActiveTab('recent')}
                      className={`px-4 py-2 text-sm font-medium transition-all ${
                        activeTab === 'recent'
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      🕒 Recent {recentAgents.length > 0 && `(${recentAgents.length})`}
                    </button>
                    <button
                      onClick={() => setActiveTab('saved')}
                      className={`px-4 py-2 text-sm font-medium transition-all ${
                        activeTab === 'saved'
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      💾 Saved {savedConfigs.length > 0 && `(${savedConfigs.length})`}
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="max-h-96 overflow-y-auto">
                  {activeTab === 'templates' && (
                    <div className="space-y-3">
                      {/* Category Filter */}
                      <div className="flex gap-1 flex-wrap">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 text-xs rounded-full transition-all ${
                              selectedCategory === cat
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Templates */}
                      <div className="space-y-2">
                        {filteredTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleLoadTemplate(template)}
                            className="group w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{template.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{template.name}</span>
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {TOOL_PRESETS[template.toolPreset].description.split('.')[0].split(' ')[0]}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'recent' && (
                    <div className="space-y-2">
                      {recentAgents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          No recent agents yet
                        </div>
                      ) : (
                        recentAgents.map((config) => (
                          <button
                            key={config.id}
                            onClick={() => handleLoadConfig(config)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate flex-1">{config.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(config.lastUsed || config.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{config.prompt}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'saved' && (
                    <div className="space-y-2">
                      {savedConfigs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          No saved configurations yet
                        </div>
                      ) : (
                        savedConfigs.map((config) => (
                          <div
                            key={config.id}
                            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <button
                              onClick={() => handleLoadConfig(config)}
                              className="flex-1 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 -m-3 p-3 rounded-lg transition-all"
                            >
                              <div className="font-medium text-sm mb-1">{config.name}</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{config.prompt}</p>
                            </button>
                            <button
                              onClick={() => handleDeleteConfig(config.id)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Form */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Configuration</h3>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Auto-generate (e.g., Swift Fox, Clever Owl)"
                    disabled={loading}
                  />
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
                  <div className="grid grid-cols-2 gap-2">
                    {(['read-only', 'standard', 'full-access', 'custom'] as ToolPermissionPreset[]).map((p) => {
                      const presetInfo = TOOL_PRESETS[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPreset(p);
                            setShowDangerousWarning(false);
                          }}
                          disabled={loading}
                          className={`p-2 rounded-lg border-2 text-left transition-all ${
                            preset === p
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={presetInfo.description}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold capitalize flex items-center gap-1">
                              <span className="text-sm">
                                {p === 'read-only' && '🔒'}
                                {p === 'standard' && '🛡️'}
                                {p === 'full-access' && '⚠️'}
                                {p === 'custom' && '⚙️'}
                              </span>
                              {p.replace('-', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {presetInfo.tools.length} tools
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Tool Selection */}
                  {preset === 'custom' && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Tools:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_TOOLS.map((tool) => (
                          <label
                            key={tool}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded"
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

                {/* Save Configuration */}
                {!showSaveConfig && (
                  <button
                    type="button"
                    onClick={() => setShowSaveConfig(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    💾 Save this configuration
                  </button>
                )}

                {showSaveConfig && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                    <Input
                      placeholder="Configuration name"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleSaveConfig}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowSaveConfig(false);
                          setConfigName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

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
                        onClick={() => setShowDangerousWarning(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="destructive" size="sm" loading={loading}>
                        {loading ? 'Spawning...' : 'Confirm & Spawn'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Submit */}
                {!showDangerousWarning && (
                  <Button type="submit" loading={loading} disabled={loading} className="w-full">
                    {loading ? 'Spawning Agent...' : 'Spawn Agent'}
                  </Button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
