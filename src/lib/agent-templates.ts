/**
 * Agent Templates and Presets
 * Provides common agent configurations for quick spawning
 */

import type { ToolPermissionPreset } from '@/types/agent';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
  toolPreset: ToolPermissionPreset;
  category: 'development' | 'review' | 'refactor' | 'documentation' | 'testing' | 'analysis';
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for best practices, bugs, and improvements',
    icon: '🔍',
    prompt: 'Review the codebase for:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance improvements\n- Security concerns\n\nProvide detailed feedback with specific file locations and suggestions.',
    toolPreset: 'read-only',
    category: 'review',
  },
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Investigate and fix a specific bug',
    icon: '🐛',
    prompt: 'Find and fix the following bug:\n[Describe the bug here]\n\nSteps:\n1. Investigate the issue\n2. Identify root cause\n3. Implement fix\n4. Test the solution',
    toolPreset: 'standard',
    category: 'development',
  },
  {
    id: 'feature-implementation',
    name: 'Feature Implementation',
    description: 'Implement a new feature from scratch',
    icon: '✨',
    prompt: 'Implement the following feature:\n[Describe the feature here]\n\nRequirements:\n- Design the architecture\n- Write clean, maintainable code\n- Add tests\n- Update documentation',
    toolPreset: 'standard',
    category: 'development',
  },
  {
    id: 'refactor',
    name: 'Code Refactoring',
    description: 'Refactor code for better structure and maintainability',
    icon: '♻️',
    prompt: 'Refactor the codebase to:\n- Improve code organization\n- Reduce complexity\n- Enhance readability\n- Follow best practices\n\nEnsure all existing tests pass.',
    toolPreset: 'standard',
    category: 'refactor',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Create or update project documentation',
    icon: '📚',
    prompt: 'Create comprehensive documentation for:\n[Specify what to document]\n\nInclude:\n- API documentation\n- Usage examples\n- Architecture overview\n- Setup instructions',
    toolPreset: 'standard',
    category: 'documentation',
  },
  {
    id: 'testing',
    name: 'Test Suite',
    description: 'Write comprehensive tests for the codebase',
    icon: '🧪',
    prompt: 'Create tests for:\n[Specify components/features to test]\n\nInclude:\n- Unit tests\n- Integration tests\n- Edge cases\n- Error handling',
    toolPreset: 'standard',
    category: 'testing',
  },
  {
    id: 'performance-analysis',
    name: 'Performance Analysis',
    description: 'Analyze and optimize code performance',
    icon: '⚡',
    prompt: 'Analyze performance and identify:\n- Bottlenecks\n- Memory leaks\n- Inefficient algorithms\n- Optimization opportunities\n\nProvide detailed recommendations.',
    toolPreset: 'read-only',
    category: 'analysis',
  },
  {
    id: 'security-audit',
    name: 'Security Audit',
    description: 'Audit code for security vulnerabilities',
    icon: '🔒',
    prompt: 'Conduct a security audit:\n- Check for common vulnerabilities\n- Review authentication/authorization\n- Inspect data validation\n- Check for sensitive data exposure\n\nProvide remediation suggestions.',
    toolPreset: 'read-only',
    category: 'analysis',
  },
  {
    id: 'dependency-update',
    name: 'Dependency Update',
    description: 'Update and test project dependencies',
    icon: '📦',
    prompt: 'Update project dependencies:\n1. Check for outdated packages\n2. Review breaking changes\n3. Update package.json\n4. Run tests\n5. Fix any compatibility issues',
    toolPreset: 'standard',
    category: 'development',
  },
  {
    id: 'custom',
    name: 'Custom Task',
    description: 'Start with a blank prompt',
    icon: '✏️',
    prompt: '',
    toolPreset: 'standard',
    category: 'development',
  },
];

export interface SavedAgentConfig {
  id: string;
  name: string;
  prompt: string;
  directory: string;
  toolPreset: ToolPermissionPreset;
  customTools?: string[];
  createdAt: number;
  lastUsed?: number;
}

export class AgentConfigStorage {
  private static STORAGE_KEY = 'agent-view-configs';
  private static RECENT_KEY = 'agent-view-recent';
  private static MAX_RECENT = 10;

  static saveConfig(config: Omit<SavedAgentConfig, 'id' | 'createdAt'>): SavedAgentConfig {
    const configs = this.getConfigs();
    const newConfig: SavedAgentConfig = {
      ...config,
      id: `config-${Date.now()}`,
      createdAt: Date.now(),
    };
    configs.push(newConfig);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    return newConfig;
  }

  static getConfigs(): SavedAgentConfig[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static deleteConfig(id: string): void {
    const configs = this.getConfigs().filter(c => c.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
  }

  static addToRecent(config: Omit<SavedAgentConfig, 'id' | 'createdAt' | 'lastUsed'>): void {
    if (typeof window === 'undefined') return;

    const recent = this.getRecent();
    const newEntry: SavedAgentConfig = {
      ...config,
      id: `recent-${Date.now()}`,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // Remove duplicates based on prompt and directory
    const filtered = recent.filter(
      r => !(r.prompt === config.prompt && r.directory === config.directory)
    );

    // Add new entry and limit to MAX_RECENT
    const updated = [newEntry, ...filtered].slice(0, this.MAX_RECENT);
    localStorage.setItem(this.RECENT_KEY, JSON.stringify(updated));
  }

  static getRecent(): SavedAgentConfig[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.RECENT_KEY);
    return data ? JSON.parse(data) : [];
  }

  static clearRecent(): void {
    localStorage.removeItem(this.RECENT_KEY);
  }
}
