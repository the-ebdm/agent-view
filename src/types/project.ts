/**
 * Project Types
 *
 * Defines TypeScript interfaces for projects and worktrees.
 */

/**
 * Tool permissions object structure
 */
export type ToolPermissions = Record<string, boolean | unknown>;

/**
 * Project entity
 * Represents a software project that can contain multiple worktrees
 */
export interface Project {
  id: string;
  name: string;
  directory: string;
  description?: string;
  openspecPath?: string;
  defaultToolPermissions?: ToolPermissions;
  isFavorite: boolean;
  tags?: string[];
  agentCount: number;
  activeAgentCount: number;
  worktreeCount: number;
  lastUsed?: number;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

/**
 * Worktree entity
 * Represents a git worktree within a project
 */
export interface Worktree {
  id: string;
  projectId: string;
  name: string;
  directory: string;
  branch?: string;
  isMain: boolean;
  agentCount: number;
  activeAgentCount: number;
  lastUsed?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  directory: string;
  description?: string;
  openspecPath?: string;
  defaultToolPermissions?: ToolPermissions;
  isFavorite?: boolean;
  tags?: string[];
}

/**
 * Input for updating an existing project
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  openspecPath?: string;
  defaultToolPermissions?: ToolPermissions;
  isFavorite?: boolean;
  tags?: string[];
  archivedAt?: number;
}

/**
 * Input for creating a new worktree
 */
export interface CreateWorktreeInput {
  projectId: string;
  name: string;
  directory: string;
  branch?: string;
  isMain?: boolean;
}

/**
 * Input for updating an existing worktree
 */
export interface UpdateWorktreeInput {
  name?: string;
  branch?: string;
  isMain?: boolean;
}
