/**
 * Project Auto-Discovery Service
 *
 * Automatically discovers and creates project and worktree records
 * when agents are spawned in directories.
 */

import { basename } from 'path';
import { existsSync, readFileSync } from 'fs';
import { detectGitInfo } from '../git/worktree-utils';
import { getProjectsRepository } from '../database/repositories/projects';
import { getWorktreesRepository } from '../database/repositories/worktrees';
import type { Project, Worktree } from '@/types/project';

export interface DiscoveryResult {
  project: Project;
  worktree: Worktree | null;
}

/**
 * Discover or create project and worktree for a directory
 * This is the main entry point for auto-discovery during agent spawn
 */
export async function discoverProject(directory: string): Promise<DiscoveryResult> {
  const projectsRepo = getProjectsRepository();
  const worktreesRepo = getWorktreesRepository();

  // Detect git information
  const gitInfo = detectGitInfo(directory);

  if (!gitInfo.isGitRepo) {
    // Not a git repository - create a simple project without worktrees
    const project = await findOrCreateSimpleProject(directory);
    return { project, worktree: null };
  }

  // Git repository - create or find project and worktree
  const mainRepoPath = gitInfo.mainRepoPath!;

  // Find or create the project for the main repository
  let project = projectsRepo.findByDirectory(mainRepoPath);

  if (!project) {
    const projectName = inferProjectName(mainRepoPath);
    const projectDescription = readProjectDescription(mainRepoPath);
    const openspecPath = findOpenspecPath(mainRepoPath);

    project = projectsRepo.create({
      name: projectName,
      directory: mainRepoPath,
      description: projectDescription,
      openspecPath,
    });

    console.log(`[Project Discovery] Created project: ${project.name} at ${mainRepoPath}`);
  }

  // Find or create the worktree
  let worktree = worktreesRepo.findByDirectory(directory);

  if (!worktree) {
    const worktreeName = gitInfo.worktreeName || basename(directory);

    worktree = worktreesRepo.create({
      projectId: project.id,
      name: worktreeName,
      directory: directory,
      branch: gitInfo.branch || undefined,
      isMain: gitInfo.isMainWorktree,
    });

    console.log(`[Project Discovery] Created worktree: ${worktree.name} at ${directory}`);

    // Update project worktree count
    const allWorktrees = worktreesRepo.findByProjectId(project.id);
    projectsRepo.updateCounts(
      project.id,
      project.agentCount,
      project.activeAgentCount,
      allWorktrees.length
    );
  }

  return { project, worktree };
}

/**
 * Find or create a simple project (non-git directory)
 */
async function findOrCreateSimpleProject(directory: string): Promise<Project> {
  const projectsRepo = getProjectsRepository();

  let project = projectsRepo.findByDirectory(directory);

  if (!project) {
    const projectName = inferProjectName(directory);
    const projectDescription = readProjectDescription(directory);

    project = projectsRepo.create({
      name: projectName,
      directory: directory,
      description: projectDescription,
    });

    console.log(`[Project Discovery] Created simple project: ${project.name} at ${directory}`);
  }

  return project;
}

/**
 * Infer project name from directory path
 * Prefers directory name, but checks for package.json name first
 */
function inferProjectName(directory: string): string {
  // Try to read name from package.json
  const packageJsonPath = `${directory}/package.json`;
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.name) {
        return packageJson.name;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Fall back to directory name
  return basename(directory);
}

/**
 * Read project description from CLAUDE.md or README.md
 */
function readProjectDescription(directory: string): string | undefined {
  // Try CLAUDE.md first (project instructions)
  const claudeMdPath = `${directory}/CLAUDE.md`;
  if (existsSync(claudeMdPath)) {
    try {
      const content = readFileSync(claudeMdPath, 'utf-8');
      // Extract first paragraph or first 200 characters
      const firstLine = content.split('\n').find(line => line.trim().length > 0);
      if (firstLine) {
        return firstLine.replace(/^#+ /, '').trim().substring(0, 200);
      }
    } catch {
      // Ignore read errors
    }
  }

  // Try README.md second
  const readmePath = `${directory}/README.md`;
  if (existsSync(readmePath)) {
    try {
      const content = readFileSync(readmePath, 'utf-8');
      // Extract first paragraph or first 200 characters
      const firstLine = content.split('\n').find(line => line.trim().length > 0);
      if (firstLine) {
        return firstLine.replace(/^#+ /, '').trim().substring(0, 200);
      }
    } catch {
      // Ignore read errors
    }
  }

  return undefined;
}

/**
 * Find openspec directory path if it exists
 */
function findOpenspecPath(directory: string): string | undefined {
  const openspecPath = `${directory}/openspec`;
  if (existsSync(openspecPath)) {
    return openspecPath;
  }
  return undefined;
}

/**
 * Update project and worktree usage timestamps
 */
export function updateProjectUsage(projectId: string, worktreeId: string | null): void {
  const projectsRepo = getProjectsRepository();
  const worktreesRepo = getWorktreesRepository();

  projectsRepo.updateLastUsed(projectId);

  if (worktreeId) {
    worktreesRepo.updateLastUsed(worktreeId);
  }
}

/**
 * Update project and worktree agent counts
 * Called when agents are created or destroyed
 */
export function updateAgentCounts(
  projectId: string,
  worktreeId: string | null,
  totalAgents: number,
  activeAgents: number
): void {
  const projectsRepo = getProjectsRepository();
  const worktreesRepo = getWorktreesRepository();

  // Update project counts
  const project = projectsRepo.findById(projectId);
  if (project) {
    const worktrees = worktreesRepo.findByProjectId(projectId);
    projectsRepo.updateCounts(
      projectId,
      totalAgents,
      activeAgents,
      worktrees.length
    );
  }

  // Update worktree counts
  if (worktreeId) {
    worktreesRepo.updateCounts(worktreeId, totalAgents, activeAgents);
  }
}
