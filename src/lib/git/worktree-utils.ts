/**
 * Git Worktree Utilities
 *
 * Utilities for detecting and parsing git worktrees.
 * Handles both main repositories and secondary worktrees.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';

export interface GitInfo {
  isGitRepo: boolean;
  isMainWorktree: boolean;
  gitDir: string | null;
  mainRepoPath: string | null;
  branch: string | null;
  worktreeName: string | null;
}

/**
 * Detect git repository information for a directory
 * Returns detailed information about the git setup
 */
export function detectGitInfo(directory: string): GitInfo {
  const gitPath = join(directory, '.git');

  // Not a git repository
  if (!existsSync(gitPath)) {
    return {
      isGitRepo: false,
      isMainWorktree: false,
      gitDir: null,
      mainRepoPath: null,
      branch: null,
      worktreeName: null,
    };
  }

  const gitStat = statSync(gitPath);

  // Main repository (.git is a directory)
  if (gitStat.isDirectory()) {
    const branch = readBranchFromGitDir(gitPath);
    return {
      isGitRepo: true,
      isMainWorktree: true,
      gitDir: gitPath,
      mainRepoPath: directory,
      branch,
      worktreeName: 'main',
    };
  }

  // Worktree (.git is a file)
  if (gitStat.isFile()) {
    const gitFileContent = readFileSync(gitPath, 'utf-8').trim();
    const gitdirMatch = gitFileContent.match(/^gitdir:\s*(.+)$/);

    if (!gitdirMatch) {
      // Invalid .git file
      return {
        isGitRepo: false,
        isMainWorktree: false,
        gitDir: null,
        mainRepoPath: null,
        branch: null,
        worktreeName: null,
      };
    }

    const worktreeGitDir = gitdirMatch[1];
    const mainRepoPath = findMainRepoPath(worktreeGitDir);
    const branch = readBranchFromGitDir(worktreeGitDir);
    const worktreeName = extractWorktreeName(worktreeGitDir);

    return {
      isGitRepo: true,
      isMainWorktree: false,
      gitDir: worktreeGitDir,
      mainRepoPath,
      branch,
      worktreeName,
    };
  }

  // Unknown git setup
  return {
    isGitRepo: false,
    isMainWorktree: false,
    gitDir: null,
    mainRepoPath: null,
    branch: null,
    worktreeName: null,
  };
}

/**
 * Check if a directory is a git repository (main or worktree)
 */
export function isGitRepository(directory: string): boolean {
  const gitPath = join(directory, '.git');
  return existsSync(gitPath);
}

/**
 * Check if a directory is the main worktree (.git is a directory)
 */
export function isMainWorktree(directory: string): boolean {
  const gitPath = join(directory, '.git');
  if (!existsSync(gitPath)) {
    return false;
  }
  return statSync(gitPath).isDirectory();
}

/**
 * Check if a directory is a secondary worktree (.git is a file)
 */
export function isSecondaryWorktree(directory: string): boolean {
  const gitPath = join(directory, '.git');
  if (!existsSync(gitPath)) {
    return false;
  }
  return statSync(gitPath).isFile();
}

/**
 * Find the main repository path from a worktree's git directory
 * Example: /path/to/main-repo/.git/worktrees/feature-branch → /path/to/main-repo
 */
function findMainRepoPath(worktreeGitDir: string): string | null {
  try {
    // worktreeGitDir is like: /path/to/main-repo/.git/worktrees/feature-branch
    // We need to go up to /path/to/main-repo/.git and then up one more level
    const parts = worktreeGitDir.split('/');
    const worktreesIndex = parts.lastIndexOf('worktrees');

    if (worktreesIndex === -1) {
      return null;
    }

    // Go up to the .git directory
    const gitDirParts = parts.slice(0, worktreesIndex);
    const gitDir = gitDirParts.join('/');

    // Main repo is parent of .git directory
    const mainRepoPath = dirname(gitDir);
    return mainRepoPath;
  } catch (error) {
    console.error('[Git Utils] Error finding main repo path:', error);
    return null;
  }
}

/**
 * Extract worktree name from git directory path
 * Example: /path/to/main-repo/.git/worktrees/feature-branch → feature-branch
 */
function extractWorktreeName(worktreeGitDir: string): string {
  try {
    const parts = worktreeGitDir.split('/');
    const worktreesIndex = parts.lastIndexOf('worktrees');

    if (worktreesIndex === -1 || worktreesIndex === parts.length - 1) {
      return basename(worktreeGitDir);
    }

    // Return the directory name after 'worktrees'
    return parts[worktreesIndex + 1];
  } catch (error) {
    console.error('[Git Utils] Error extracting worktree name:', error);
    return basename(worktreeGitDir);
  }
}

/**
 * Read the current branch name from a git directory
 * Works for both main repositories and worktrees
 */
function readBranchFromGitDir(gitDir: string): string | null {
  try {
    const headPath = join(gitDir, 'HEAD');

    if (!existsSync(headPath)) {
      return null;
    }

    const headContent = readFileSync(headPath, 'utf-8').trim();

    // HEAD is a reference: ref: refs/heads/main
    const refMatch = headContent.match(/^ref:\s*refs\/heads\/(.+)$/);
    if (refMatch) {
      return refMatch[1];
    }

    // HEAD is a commit hash (detached HEAD state)
    if (/^[0-9a-f]{40}$/i.test(headContent)) {
      return null; // detached HEAD
    }

    return null;
  } catch (error) {
    console.error('[Git Utils] Error reading branch:', error);
    return null;
  }
}

/**
 * Get the main repository path for any git directory (main or worktree)
 */
export function getMainRepoPath(directory: string): string | null {
  const gitInfo = detectGitInfo(directory);

  if (!gitInfo.isGitRepo) {
    return null;
  }

  return gitInfo.mainRepoPath;
}

/**
 * Get the current branch name for a git directory
 */
export function getCurrentBranch(directory: string): string | null {
  const gitInfo = detectGitInfo(directory);

  if (!gitInfo.isGitRepo) {
    return null;
  }

  return gitInfo.branch;
}

/**
 * Get a display name for the worktree
 * For main worktree: returns 'main' or the branch name
 * For secondary worktree: returns the worktree directory name
 */
export function getWorktreeName(directory: string): string {
  const gitInfo = detectGitInfo(directory);

  if (!gitInfo.isGitRepo) {
    return basename(directory);
  }

  if (gitInfo.isMainWorktree) {
    return gitInfo.branch || 'main';
  }

  return gitInfo.worktreeName || basename(directory);
}
