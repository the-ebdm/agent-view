/**
 * Agent Spawn Modal - Collapsible Sections
 * Single-page vertical layout with progressive sections
 */
'use client';

import { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { ToolPermission, ToolPermissionPreset, ToolName } from '@/types/agent';
import { ALL_TOOLS, TOOL_PRESETS, DANGEROUS_TOOLS, TOOL_DESCRIPTIONS } from '@/lib/tool-permissions';
import { ActiveAgentsContext } from '@/contexts/active-agents-context';
import { AGENT_TEMPLATES, AgentConfigStorage, type SavedAgentConfig, type AgentTemplate } from '@/lib/agent-templates';

interface AgentSpawnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawn?: (agentId: string) => void;
  defaultDirectory?: string;
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: string;
  number: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isComplete?: boolean;
}

function CollapsibleSection({
  title,
  subtitle,
  icon,
  number,
  isExpanded,
  onToggle,
  children,
  isComplete,
}: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isComplete
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : isExpanded
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {isComplete ? '✓' : number}
          </div>
          <span className="text-xl">{icon}</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-sm">{title}</div>
            {subtitle && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800">
          {children}
        </div>
      )}
    </div>
  );
}

export function AgentSpawnModal({ isOpen, onClose, onSpawn, defaultDirectory }: AgentSpawnModalProps) {
  const activeAgentsContext = useContext(ActiveAgentsContext);

  // Section expansion state
  const [expandedSection, setExpandedSection] = useState<number>(1);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [directory, setDirectory] = useState(defaultDirectory || '/Users/ericmuir/Projects/agent-view');
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<ToolPermissionPreset>('standard');
  const [customTools, setCustomTools] = useState<Set<ToolName>>(new Set(['Read', 'Grep', 'Glob']));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDangerousWarning, setShowDangerousWarning] = useState(false);

  // Template/config state
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<SavedAgentConfig[]>([]);
  const [recentAgents, setRecentAgents] = useState<SavedAgentConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'templates' | 'recent' | 'saved'>('templates');

  // Save config state
  const [configName, setConfigName] = useState('');
  const [showSaveConfig, setShowSaveConfig] = useState(false);

  // Load saved configs and recent agents
  useEffect(() => {
    if (isOpen) {
      (async () => {
        const [configs, recent] = await Promise.all([
          AgentConfigStorage.getConfigs(),
          AgentConfigStorage.getRecent(),
        ]);
        setSavedConfigs(configs);
        setRecentAgents(recent);
      })();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showDangerousWarning) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, showDangerousWarning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!prompt.trim()) {
      setError('Prompt is required');
      setExpandedSection(2);
      return;
    }

    if (!directory.trim()) {
      setError('Directory is required');
      setExpandedSection(2);
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
        setExpandedSection(3);
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
      await AgentConfigStorage.addToRecent({
        name: name.trim() || 'Unnamed Agent',
        prompt,
        directory,
        toolPreset: preset,
        customTools: preset === 'custom' ? Array.from(customTools) : undefined,
      });

      // Clear form and close modal
      setPrompt('');
      setName('');
      setSelectedTemplate(null);
      setShowDangerousWarning(false);
      setShowSaveConfig(false);
      setExpandedSection(1);

      // Refresh agents list if context is available
      if (activeAgentsContext?.refreshAgents) {
        await activeAgentsContext.refreshAgents();
      }

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
    setSelectedTemplate(template);
    setPrompt(template.prompt);
    setPreset(template.toolPreset);
    setName('');
    setError(null);
    setExpandedSection(2); // Move to configuration
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
    setExpandedSection(2); // Move to configuration
  };

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      setError('Configuration name is required');
      return;
    }

    await AgentConfigStorage.saveConfig({
      name: configName,
      prompt,
      directory,
      toolPreset: preset,
      customTools: preset === 'custom' ? Array.from(customTools) : undefined,
    });

    const configs = await AgentConfigStorage.getConfigs();
    setSavedConfigs(configs);
    setShowSaveConfig(false);
    setConfigName('');
  };

  const handleDeleteConfig = async (id: string) => {
    await AgentConfigStorage.deleteConfig(id);
    const configs = await AgentConfigStorage.getConfigs();
    setSavedConfigs(configs);
  };

  const handleGenerateRandomName = () => {
    const adjectives = ['Swift', 'Clever', 'Bright', 'Nimble', 'Sharp', 'Quick', 'Wise', 'Bold', 'Keen', 'Brave'];
    const animals = ['Fox', 'Owl', 'Hawk', 'Wolf', 'Eagle', 'Falcon', 'Raven', 'Tiger', 'Bear', 'Lion'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    setName(`${adj} ${animal}`);
  };

  const filteredTemplates = selectedCategory === 'all'
    ? AGENT_TEMPLATES
    : AGENT_TEMPLATES.filter(t => t.category === selectedCategory);

  const categories = ['all', 'development', 'review', 'documentation', 'testing', 'analysis'];

  // Check section completion
  const section1Complete = selectedTemplate !== null || prompt !== '';
  const section2Complete = prompt.trim() !== '' && directory.trim() !== '';
  const section3Complete = true; // Always complete as there's a default

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showDangerousWarning) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Compact */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-lg font-bold text-white">Spawn New Agent</h2>
              <p className="text-xs text-blue-100">Configure and launch an AI agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading || showDangerousWarning}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close (Esc)"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Section 1: Quick Start */}
            <CollapsibleSection
              number={1}
              title="Quick Start"
              subtitle="Choose a template or start from scratch"
              icon="🎯"
              isExpanded={expandedSection === 1}
              onToggle={() => setExpandedSection(expandedSection === 1 ? 0 : 1)}
              isComplete={section1Complete}
            >
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
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
                    type="button"
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
                    type="button"
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

                {/* Tab Content */}
                <div className="max-h-80 overflow-y-auto">
                  {activeTab === 'templates' && (
                    <div className="space-y-3">
                      {/* Category Filter */}
                      <div className="flex gap-1 flex-wrap">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 text-xs rounded-full transition-all ${
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
                      <div className="grid grid-cols-1 gap-2">
                        {filteredTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleLoadTemplate(template)}
                            className={`group text-left p-3 rounded-lg border-2 transition-all ${
                              selectedTemplate?.id === template.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{template.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">{template.name}</span>
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {template.toolPreset.replace('-', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
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
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                          No recent agents yet
                        </div>
                      ) : (
                        recentAgents.map((config) => (
                          <button
                            key={config.id}
                            type="button"
                            onClick={() => handleLoadConfig(config)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate flex-1">{config.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(config.lastUsed || config.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{config.prompt}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">{config.directory}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'saved' && (
                    <div className="space-y-2">
                      {savedConfigs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                          No saved configurations yet
                        </div>
                      ) : (
                        savedConfigs.map((config) => (
                          <div
                            key={config.id}
                            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <button
                              type="button"
                              onClick={() => handleLoadConfig(config)}
                              className="flex-1 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 -m-3 p-3 rounded-lg transition-all"
                            >
                              <div className="font-medium text-sm mb-1">{config.name}</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{config.prompt}</p>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteConfig(config.id)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
            </CollapsibleSection>

            {/* Section 2: Configuration */}
            <CollapsibleSection
              number={2}
              title="Configuration"
              subtitle="Define agent name, prompt, and working directory"
              icon="⚙️"
              isExpanded={expandedSection === 2}
              onToggle={() => setExpandedSection(expandedSection === 2 ? 0 : 2)}
              isComplete={section2Complete}
            >
              <div className="space-y-4">
                {/* Agent Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Name <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Auto-generate (e.g., Swift Fox, Clever Owl)"
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateRandomName}
                      disabled={loading}
                      title="Generate random name"
                    >
                      🎲
                    </Button>
                  </div>
                </div>

                {/* Working Directory */}
                <div>
                  <label htmlFor="directory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Working Directory
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="directory"
                      type="text"
                      value={directory}
                      onChange={(e) => setDirectory(e.target.value)}
                      placeholder="/path/to/directory"
                      disabled={loading}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      title="Browse directory (coming soon)"
                    >
                      📁
                    </Button>
                  </div>
                  {directory && (
                    <p className="text-xs text-gray-500 mt-1">
                      Agent will have access to files in this directory
                    </p>
                  )}
                </div>

                {/* Agent Prompt */}
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Prompt
                  </label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What would you like the agent to do? Be specific about the task, expected outcomes, and any constraints."
                    rows={6}
                    disabled={loading}
                    error={error || undefined}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {prompt.length > 0 && `${prompt.length} characters`}
                    </p>
                    {selectedTemplate && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Using template: {selectedTemplate.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 3: Tool Permissions & Security */}
            <CollapsibleSection
              number={3}
              title="Tool Permissions & Security"
              subtitle="Control what the agent can do"
              icon="🔐"
              isExpanded={expandedSection === 3}
              onToggle={() => setExpandedSection(expandedSection === 3 ? 0 : 3)}
              isComplete={section3Complete}
            >
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Security Note:</strong> Choose the minimum permissions needed for the task.
                    You can always grant more permissions later if needed.
                  </p>
                </div>

                {/* Preset Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          preset === p
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={presetInfo.description}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-2xl">
                            {p === 'read-only' && '🔒'}
                            {p === 'standard' && '🛡️'}
                            {p === 'full-access' && '⚠️'}
                            {p === 'custom' && '⚙️'}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm capitalize mb-1">
                              {p.replace('-', ' ')}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {presetInfo.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {presetInfo.tools.length} tool{presetInfo.tools.length !== 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tool Selection */}
                {preset === 'custom' && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select Individual Tools:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_TOOLS.map((tool) => (
                        <label
                          key={tool}
                          className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-all"
                          title={TOOL_DESCRIPTIONS[tool]}
                        >
                          <input
                            type="checkbox"
                            checked={customTools.has(tool)}
                            onChange={() => handleToggleTool(tool)}
                            disabled={loading}
                            className="rounded"
                          />
                          <span className="text-sm flex-1">
                            {tool}
                          </span>
                          {DANGEROUS_TOOLS.includes(tool) && (
                            <span className="text-xs" title="Potentially dangerous">⚠️</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dangerous Warning */}
                {showDangerousWarning && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg animate-pulse">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <h4 className="font-bold text-orange-800 dark:text-orange-200 mb-1">
                          Security Warning: Grant Full Access?
                        </h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          This configuration allows file modification, command execution, and system changes.
                          Only proceed if you trust this task and understand the risks.
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
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        loading={loading}
                      >
                        {loading ? 'Spawning...' : 'I Understand, Confirm & Spawn'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Error Message */}
          {error && !showDangerousWarning && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-lg">❌</span>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between gap-3">
            {/* Save Configuration */}
            <div className="flex-1">
              {!showSaveConfig ? (
                <button
                  type="button"
                  onClick={() => setShowSaveConfig(true)}
                  disabled={loading}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  💾 Save this configuration for later
                </button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Configuration name"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveConfig}
                    disabled={loading}
                  >
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
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Spawn Button */}
            {!showDangerousWarning && (
              <Button
                type="submit"
                onClick={handleSubmit}
                loading={loading}
                disabled={loading || !section2Complete}
                size="lg"
                className="min-w-[140px]"
              >
                {loading ? 'Spawning...' : '🚀 Spawn Agent'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
