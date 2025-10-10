// Phase 2: Tool Permission System

import type { ToolName, ToolPermission, ToolPermissionPreset } from '@/types/agent';

// Define all available tools
export const ALL_TOOLS: ToolName[] = [
  'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task', 'WebFetch', 'WebSearch'
];

// Tool permission presets
export const TOOL_PRESETS: Record<ToolPermissionPreset, { tools: ToolName[]; description: string }> = {
  'read-only': {
    tools: ['Read', 'Grep', 'Glob'],
    description: 'Safe for exploration and analysis. Cannot modify files or execute commands.'
  },
  'standard': {
    tools: ['Read', 'Grep', 'Glob', 'WebFetch'],
    description: 'Safe tools for development. Can search and fetch but cannot modify files.'
  },
  'full-access': {
    tools: ALL_TOOLS,
    description: 'Complete access. Use with caution. Can modify files and execute commands.'
  },
  'custom': {
    tools: [],
    description: 'Manual control over each tool. Select specific tools for fine-grained access.'
  }
};

// Dangerous tools that require warnings
export const DANGEROUS_TOOLS: ToolName[] = ['Bash', 'Write', 'Edit'];

/**
 * Get tools allowed by a preset
 */
export function getToolsForPreset(preset: ToolPermissionPreset): ToolName[] {
  return TOOL_PRESETS[preset].tools;
}

/**
 * Get description for a preset
 */
export function getPresetDescription(preset: ToolPermissionPreset): string {
  return TOOL_PRESETS[preset].description;
}

/**
 * Validate tool permission configuration
 */
export function validateToolPermission(permission: ToolPermission): { valid: boolean; error?: string } {
  // Check preset is valid
  if (!['read-only', 'standard', 'full-access', 'custom'].includes(permission.preset)) {
    return {
      valid: false,
      error: `Invalid preset: ${permission.preset}. Valid presets: read-only, standard, full-access, custom`
    };
  }

  // Custom preset requires tools array
  if (permission.preset === 'custom') {
    if (!permission.tools) {
      return {
        valid: false,
        error: "Custom preset requires 'tools' array"
      };
    }

    if (permission.tools.length === 0) {
      return {
        valid: false,
        error: 'Custom preset must include at least one tool'
      };
    }

    // Validate each tool name
    const invalidTools = permission.tools.filter(tool => !ALL_TOOLS.includes(tool));
    if (invalidTools.length > 0) {
      return {
        valid: false,
        error: `Invalid tools: ${invalidTools.join(', ')}. Valid tools: ${ALL_TOOLS.join(', ')}`
      };
    }
  }

  return { valid: true };
}

/**
 * Check if a tool is allowed by the permission config
 */
export function isToolAllowed(toolName: ToolName, permission: ToolPermission): boolean {
  if (permission.preset === 'custom') {
    return permission.tools?.includes(toolName) ?? false;
  }

  const allowedTools = getToolsForPreset(permission.preset);
  return allowedTools.includes(toolName);
}

/**
 * Get default tool permission (standard preset)
 */
export function getDefaultToolPermission(): ToolPermission {
  return { preset: 'standard' };
}

/**
 * Tool descriptions for tooltips
 */
export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  Read: 'Read file contents',
  Write: 'Create or overwrite files',
  Edit: 'Modify existing files',
  Bash: 'Execute shell commands',
  Grep: 'Search file contents',
  Glob: 'Find files by pattern',
  Task: 'Spawn sub-agents',
  WebFetch: 'Fetch web page contents',
  WebSearch: 'Search the web'
};

/**
 * Check if a tool is dangerous and requires warnings
 */
export function isDangerousTool(toolName: ToolName): boolean {
  return DANGEROUS_TOOLS.includes(toolName);
}

/**
 * Check if permission config includes dangerous tools
 */
export function hasDangerousTools(permission: ToolPermission): boolean {
  const allowedTools = permission.preset === 'custom'
    ? (permission.tools ?? [])
    : getToolsForPreset(permission.preset);

  return allowedTools.some(tool => DANGEROUS_TOOLS.includes(tool));
}
