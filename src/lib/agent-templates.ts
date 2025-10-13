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
  category: 'development' | 'review' | 'documentation' | 'testing' | 'analysis';
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // OpenSpec Workflow Templates
  {
    id: 'openspec-proposal',
    name: 'OpenSpec: New Change Proposal',
    description: 'Create a structured change proposal using OpenSpec',
    icon: '📋',
    prompt: 'Use /openspec:proposal to create a new change proposal for:\n[Describe the change/feature]\n\nThe agent will:\n1. Create a properly structured proposal document\n2. Validate it against OpenSpec schema\n3. Help you refine the proposal\n4. Prepare it for review\n\nThis ensures changes are documented and trackable.',
    toolPreset: 'standard',
    category: 'development',
  },
  {
    id: 'openspec-implement',
    name: 'OpenSpec: Implement Approved Change',
    description: 'Implement a change from an approved OpenSpec proposal',
    icon: '⚙️',
    prompt: 'Use /openspec:apply to implement the approved proposal:\n[Proposal ID or name]\n\nThe agent will:\n1. Read the approved proposal specification\n2. Implement changes according to the plan\n3. Run tests and validation\n4. Update the proposal status\n5. Keep the spec synced with actual implementation\n\nThis ensures implementation matches the approved design.',
    toolPreset: 'standard',
    category: 'development',
  },

  // Document-Generating Analysis Templates
  {
    id: 'code-review-doc',
    name: 'Code Review Report',
    description: 'Generate or update a comprehensive code review document',
    icon: '🔍',
    prompt: 'Create or update a code review document at docs/reviews/code-review-YYYY-MM-DD.md\n\nAnalyze the codebase and document:\n- Code quality and adherence to best practices\n- Potential bugs or issues with file:line references\n- Performance concerns with specific examples\n- Security vulnerabilities and remediation steps\n- Technical debt items with priority levels\n\nUpdate the existing review document if one exists, adding new findings and marking resolved issues.\n\nThis creates a living document that tracks code quality over time.',
    toolPreset: 'standard',
    category: 'review',
  },
  {
    id: 'security-audit-doc',
    name: 'Security Audit Report',
    description: 'Generate or update a security audit document',
    icon: '🔒',
    prompt: 'Create or update a security audit document at docs/security/audit-YYYY-MM-DD.md\n\nConduct a security audit and document:\n- OWASP Top 10 vulnerability checks\n- Authentication/authorization review\n- Data validation and sanitization\n- Sensitive data exposure risks\n- Dependency vulnerabilities (check package.json)\n- Security configuration issues\n\nFor each finding include:\n- Severity level (Critical/High/Medium/Low)\n- Affected files and line numbers\n- Exploitation scenario\n- Remediation steps with code examples\n\nUpdate existing audit document if present, tracking when issues were found and resolved.',
    toolPreset: 'standard',
    category: 'analysis',
  },
  {
    id: 'performance-analysis-doc',
    name: 'Performance Analysis Report',
    description: 'Generate or update a performance analysis document',
    icon: '⚡',
    prompt: 'Create or update a performance analysis document at docs/performance/analysis-YYYY-MM-DD.md\n\nAnalyze and document:\n- Performance bottlenecks with profiling data\n- Memory leaks and excessive allocations\n- Inefficient algorithms (time/space complexity)\n- Database query performance issues\n- Bundle size and load time analysis\n- API response time concerns\n\nFor each issue document:\n- Current metrics (time, memory, etc.)\n- Root cause with code references\n- Impact on user experience\n- Optimization recommendations with expected gains\n- Priority level for fixes\n\nUpdate existing analysis, comparing metrics over time.',
    toolPreset: 'standard',
    category: 'analysis',
  },
  {
    id: 'architecture-doc',
    name: 'Architecture Documentation',
    description: 'Generate or update architecture documentation',
    icon: '🏗️',
    prompt: 'Create or update architecture documentation at docs/ARCHITECTURE.md\n\nDocument the system architecture:\n- High-level system overview\n- Component relationships and data flow\n- Key design decisions and rationale\n- Technology stack and dependencies\n- Directory structure and organization\n- API contracts and interfaces\n- Database schema and models\n- Deployment architecture\n\nUse Mermaid diagrams where helpful. Keep documentation in sync with actual codebase.',
    toolPreset: 'standard',
    category: 'documentation',
  },
  {
    id: 'dead-code-analysis',
    name: 'Dead Code Analysis Report',
    description: 'Identify and document unused code for cleanup',
    icon: '🧹',
    prompt: 'Create or update a dead code analysis document at docs/analysis/dead-code-YYYY-MM-DD.md\n\nAnalyze and document:\n- Unused functions, classes, and components\n- Unreachable code paths\n- Unused imports and dependencies\n- Commented-out code blocks\n- Deprecated functions still in codebase\n- Duplicate implementations\n\nFor each finding include:\n- File path and line numbers\n- Type (unused export, unreachable, deprecated, etc.)\n- Last referenced/modified date (if determinable)\n- Safe to remove? (Yes/No/Needs review)\n- Dependencies and risk assessment\n- Estimated LOC savings\n\nPrioritize findings by:\n1. Completely unused exports with no external dependencies\n2. Internal dead code with clear boundaries\n3. Risky removals that need careful review\n\nProvide removal commands/scripts where possible.\nUpdate existing analysis, tracking what was removed since last scan.',
    toolPreset: 'standard',
    category: 'analysis',
  },

  // Quick Action Templates
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Investigate and fix a specific bug',
    icon: '🐛',
    prompt: 'Find and fix the following bug:\n[Describe the bug, include error messages and reproduction steps]\n\nSteps:\n1. Locate the issue in the code\n2. Identify root cause\n3. Implement fix with explanation\n4. Add/update tests to prevent regression\n5. Verify the fix works',
    toolPreset: 'standard',
    category: 'development',
  },
  {
    id: 'dependency-update',
    name: 'Update Dependencies',
    description: 'Update and test project dependencies safely',
    icon: '📦',
    prompt: 'Update project dependencies safely:\n\n1. Check for outdated packages\n2. Review changelogs for breaking changes\n3. Update package.json/lock files\n4. Run full test suite\n5. Fix any compatibility issues\n6. Document any API changes needed\n\nBe conservative - update patch versions first, then minor, then major.',
    toolPreset: 'standard',
    category: 'development',
  },
  {
    id: 'add-tests',
    name: 'Add Test Coverage',
    description: 'Add tests for specific components or features',
    icon: '🧪',
    prompt: 'Add comprehensive test coverage for:\n[Specify components/features]\n\nCreate tests that cover:\n- Happy path scenarios\n- Edge cases and boundary conditions\n- Error handling\n- Integration points\n\nFollow existing test patterns in the codebase.\nAim for meaningful coverage, not just high percentages.',
    toolPreset: 'standard',
    category: 'testing',
  },

  // Blank Template
  {
    id: 'custom',
    name: 'Custom Task',
    description: 'Start with a blank prompt for ad-hoc tasks',
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
