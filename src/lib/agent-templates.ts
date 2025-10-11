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
  private static MIGRATION_KEY = 'agent-view-migrated';
  private static MAX_RECENT = 10;

  /**
   * Check if we're running in browser
   */
  private static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Migrate localStorage configs to database (one-time operation)
   */
  private static async migrateToDatabase(): Promise<void> {
    if (!this.isBrowser()) return;

    // Check if already migrated
    const migrated = localStorage.getItem(this.MIGRATION_KEY);
    if (migrated === 'true') return;

    try {
      // Get configs from localStorage
      const savedConfigsData = localStorage.getItem(this.STORAGE_KEY);
      const recentConfigsData = localStorage.getItem(this.RECENT_KEY);

      const savedConfigs: SavedAgentConfig[] = savedConfigsData ? JSON.parse(savedConfigsData) : [];
      const recentConfigs: SavedAgentConfig[] = recentConfigsData ? JSON.parse(recentConfigsData) : [];

      // Combine and deduplicate
      const allConfigs = [...savedConfigs, ...recentConfigs];
      const uniqueConfigs = Array.from(
        new Map(allConfigs.map(c => [`${c.name}-${c.directory}`, c])).values()
      );

      if (uniqueConfigs.length === 0) {
        localStorage.setItem(this.MIGRATION_KEY, 'true');
        return;
      }

      // Migrate to database
      const response = await fetch('/api/configs/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: uniqueConfigs }),
      });

      if (response.ok) {
        console.log('[AgentConfigStorage] Successfully migrated configs to database');
        localStorage.setItem(this.MIGRATION_KEY, 'true');
      }
    } catch (error) {
      console.error('[AgentConfigStorage] Failed to migrate configs:', error);
      // Don't set migration flag - retry next time
    }
  }

  /**
   * Save new agent configuration
   */
  static async saveConfig(config: Omit<SavedAgentConfig, 'id' | 'createdAt'>): Promise<SavedAgentConfig> {
    // Trigger migration if needed
    await this.migrateToDatabase();

    try {
      // Try database first
      const response = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        return data.config;
      }

      // Fall back to localStorage
      throw new Error('Database save failed');
    } catch (error) {
      console.warn('[AgentConfigStorage] Falling back to localStorage:', error);
      return this.saveConfigLocal(config);
    }
  }

  /**
   * Get all saved configurations
   */
  static async getConfigs(): Promise<SavedAgentConfig[]> {
    // Trigger migration if needed
    await this.migrateToDatabase();

    try {
      // Try database first
      const response = await fetch('/api/configs');

      if (response.ok) {
        const data = await response.json();
        return data.configs;
      }

      // Fall back to localStorage
      throw new Error('Database fetch failed');
    } catch (error) {
      console.warn('[AgentConfigStorage] Falling back to localStorage:', error);
      return this.getConfigsLocal();
    }
  }

  /**
   * Delete configuration by ID
   */
  static async deleteConfig(id: string): Promise<void> {
    try {
      // Try database first
      const response = await fetch(`/api/configs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        return;
      }

      // Fall back to localStorage
      throw new Error('Database delete failed');
    } catch (error) {
      console.warn('[AgentConfigStorage] Falling back to localStorage:', error);
      this.deleteConfigLocal(id);
    }
  }

  /**
   * Add configuration to recently used
   */
  static async addToRecent(config: Omit<SavedAgentConfig, 'id' | 'createdAt' | 'lastUsed'>): Promise<void> {
    try {
      // Try to find existing config by name and directory
      const configs = await this.getConfigs();
      const existing = configs.find(
        c => c.name === config.name && c.directory === config.directory
      );

      if (existing) {
        // Update lastUsed timestamp
        await fetch(`/api/configs/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-last-used' }),
        });
      } else {
        // Create new config
        await this.saveConfig(config);
      }
    } catch (error) {
      console.warn('[AgentConfigStorage] Falling back to localStorage:', error);
      this.addToRecentLocal(config);
    }
  }

  /**
   * Get recently used configurations
   */
  static async getRecent(): Promise<SavedAgentConfig[]> {
    // Trigger migration if needed
    await this.migrateToDatabase();

    try {
      // Try database first
      const response = await fetch(`/api/configs/recent?limit=${this.MAX_RECENT}`);

      if (response.ok) {
        const data = await response.json();
        return data.configs;
      }

      // Fall back to localStorage
      throw new Error('Database fetch failed');
    } catch (error) {
      console.warn('[AgentConfigStorage] Falling back to localStorage:', error);
      return this.getRecentLocal();
    }
  }

  // ===== localStorage fallback methods =====

  private static saveConfigLocal(config: Omit<SavedAgentConfig, 'id' | 'createdAt'>): SavedAgentConfig {
    if (!this.isBrowser()) throw new Error('localStorage not available');

    const configs = this.getConfigsLocal();
    const newConfig: SavedAgentConfig = {
      ...config,
      id: `config-${Date.now()}`,
      createdAt: Date.now(),
    };
    configs.push(newConfig);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    return newConfig;
  }

  private static getConfigsLocal(): SavedAgentConfig[] {
    if (!this.isBrowser()) return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static deleteConfigLocal(id: string): void {
    if (!this.isBrowser()) return;
    const configs = this.getConfigsLocal().filter(c => c.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
  }

  private static addToRecentLocal(config: Omit<SavedAgentConfig, 'id' | 'createdAt' | 'lastUsed'>): void {
    if (!this.isBrowser()) return;

    const recent = this.getRecentLocal();
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

  private static getRecentLocal(): SavedAgentConfig[] {
    if (!this.isBrowser()) return [];
    const data = localStorage.getItem(this.RECENT_KEY);
    return data ? JSON.parse(data) : [];
  }
}
