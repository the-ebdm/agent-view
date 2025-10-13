/**
 * Git Timestamp Utilities
 *
 * Extract accurate commit timestamps from git history for OpenSpec files.
 * Provides fallback to filesystem timestamps when git information is unavailable.
 *
 * @module git-utils
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/** Timeout for git command execution to prevent hanging (2 seconds) */
const GIT_COMMAND_TIMEOUT = 2000;

/**
 * Get git timestamp for a specific file.
 *
 * Executes `git log -1 --format=%ct` to retrieve the Unix timestamp of the
 * last commit that modified the specified file. Falls back to filesystem
 * modification time if git command fails or file is not tracked by git.
 *
 * @param filePath - Path to file relative to project root (e.g., "openspec/specs/capability.md")
 * @returns Promise resolving to Date of last commit, or filesystem mtime, or null on error
 *
 * @example
 * const timestamp = await getGitTimestamp('openspec/specs/agent-management/spec.md');
 * console.log(`Last modified: ${timestamp?.toISOString()}`);
 */
export async function getGitTimestamp(filePath: string): Promise<Date | null> {
  try {
    // Get last commit timestamp for file (Unix timestamp)
    const { stdout } = await execAsync(
      `git log -1 --format=%ct "${filePath}"`,
      {
        cwd: process.cwd(),
        timeout: GIT_COMMAND_TIMEOUT
      }
    );

    const timestamp = parseInt(stdout.trim(), 10);
    if (timestamp > 0) {
      return new Date(timestamp * 1000);
    }

    // If no git timestamp, fallback to filesystem mtime
    return await getFilesystemTimestamp(filePath);
  } catch (error) {
    console.warn(`[GitUtils] Failed to get git timestamp for ${filePath}, falling back to filesystem:`, error);
    return await getFilesystemTimestamp(filePath);
  }
}

/**
 * Get git timestamp for a directory (most recent commit affecting any file in directory).
 *
 * Executes `git log -1 --format=%ct -- <dirPath>` to retrieve the Unix timestamp
 * of the most recent commit that affected any file within the specified directory.
 * Falls back to directory's filesystem modification time if git command fails.
 *
 * @param dirPath - Path to directory relative to project root (e.g., "openspec/changes/add-feature")
 * @returns Promise resolving to Date of most recent commit, or filesystem mtime, or null on error
 *
 * @example
 * const timestamp = await getDirectoryTimestamp('openspec/changes/add-openspec-database-cache');
 * console.log(`Directory last changed: ${timestamp?.toISOString()}`);
 */
export async function getDirectoryTimestamp(dirPath: string): Promise<Date | null> {
  try {
    // Get most recent commit in directory
    const { stdout } = await execAsync(
      `git log -1 --format=%ct -- "${dirPath}"`,
      {
        cwd: process.cwd(),
        timeout: GIT_COMMAND_TIMEOUT
      }
    );

    const timestamp = parseInt(stdout.trim(), 10);
    if (timestamp > 0) {
      return new Date(timestamp * 1000);
    }

    // If no git timestamp, fallback to filesystem mtime
    return await getDirectoryFilesystemTimestamp(dirPath);
  } catch (error) {
    console.warn(`[GitUtils] Failed to get directory timestamp for ${dirPath}, falling back to filesystem:`, error);
    return await getDirectoryFilesystemTimestamp(dirPath);
  }
}

/**
 * Get current git SHA for a file.
 *
 * Executes `git log -1 --format=%H` to retrieve the full SHA hash of the
 * last commit that modified the specified file. Useful for conflict detection
 * and change tracking.
 *
 * @param filePath - Path to file relative to project root
 * @returns Promise resolving to git SHA string (40 hex characters), or null if error
 *
 * @example
 * const sha = await getGitSHA('openspec/changes/add-feature/proposal.md');
 * console.log(`Last commit SHA: ${sha}`);
 */
export async function getGitSHA(filePath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `git log -1 --format=%H "${filePath}"`,
      {
        cwd: process.cwd(),
        timeout: GIT_COMMAND_TIMEOUT
      }
    );

    const sha = stdout.trim();
    return sha || null;
  } catch (error) {
    console.warn(`[GitUtils] Failed to get git SHA for ${filePath}:`, error);
    return null;
  }
}

/**
 * Get creation timestamp for a file (first commit).
 *
 * Executes `git log --follow --format=%ct --reverse` to retrieve the Unix timestamp
 * of the very first commit that created this file. Uses --follow to track file
 * renames. Falls back to filesystem mtime if git history is unavailable.
 *
 * @param filePath - Path to file relative to project root
 * @returns Promise resolving to Date of first commit, or filesystem mtime, or null on error
 *
 * @example
 * const created = await getGitCreationTimestamp('openspec/specs/capability.md');
 * console.log(`File created: ${created?.toISOString()}`);
 */
export async function getGitCreationTimestamp(filePath: string): Promise<Date | null> {
  try {
    // Get first commit timestamp for file
    const { stdout } = await execAsync(
      `git log --follow --format=%ct --reverse "${filePath}" | head -1`,
      {
        cwd: process.cwd(),
        timeout: GIT_COMMAND_TIMEOUT
      }
    );

    const timestamp = parseInt(stdout.trim(), 10);
    if (timestamp > 0) {
      return new Date(timestamp * 1000);
    }

    // Fallback to last modified time if no git history
    return await getFilesystemTimestamp(filePath);
  } catch (error) {
    console.warn(`[GitUtils] Failed to get creation timestamp for ${filePath}:`, error);
    return await getFilesystemTimestamp(filePath);
  }
}

/**
 * Fallback: Get filesystem modification time.
 *
 * Used when git timestamp extraction fails (file not committed, not in repo, etc.).
 * Returns the mtime from filesystem stat.
 *
 * @param filePath - Path to file
 * @returns Promise resolving to filesystem modification Date, or null on error
 * @internal
 */
async function getFilesystemTimestamp(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch (error) {
    console.warn(`[GitUtils] Failed to get filesystem timestamp for ${filePath}:`, error);
    return null;
  }
}

/**
 * Fallback: Get most recent filesystem modification time in directory.
 *
 * Used when git directory timestamp extraction fails. Returns the mtime
 * of the directory itself from filesystem stat.
 *
 * @param dirPath - Path to directory
 * @returns Promise resolving to filesystem modification Date, or null on error
 * @internal
 */
async function getDirectoryFilesystemTimestamp(dirPath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.mtime;
  } catch (error) {
    console.warn(`[GitUtils] Failed to get directory filesystem timestamp for ${dirPath}:`, error);
    return null;
  }
}

/**
 * Check if a file is tracked by git.
 *
 * Executes `git ls-files --error-unmatch` to determine if the file
 * is currently tracked in the git repository.
 *
 * @param filePath - Path to file relative to project root
 * @returns Promise resolving to true if file is tracked by git, false otherwise
 *
 * @example
 * const isTracked = await isFileInGit('openspec/specs/new-feature.md');
 * if (!isTracked) {
 *   console.log('File not yet committed to git');
 * }
 */
export async function isFileInGit(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `git ls-files --error-unmatch "${filePath}"`,
      {
        cwd: process.cwd(),
        timeout: GIT_COMMAND_TIMEOUT
      }
    );
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if repository is clean (no uncommitted changes).
 *
 * Executes `git status --porcelain` to check for any uncommitted changes
 * (staged or unstaged) in the working directory.
 *
 * @returns Promise resolving to true if repository is clean (no changes), false otherwise
 *
 * @example
 * const isClean = await isRepoClean();
 * if (isClean) {
 *   console.log('No uncommitted changes');
 * }
 */
export async function isRepoClean(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'git status --porcelain',
      {
        cwd: process.cwd(),
        timeout: GIT_COMMAND_TIMEOUT
      }
    );
    return stdout.trim().length === 0;
  } catch (error) {
    console.warn('[GitUtils] Failed to check repo status:', error);
    return false;
  }
}
