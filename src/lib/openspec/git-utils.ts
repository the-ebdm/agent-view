/**
 * Git Timestamp Utilities
 * Extract accurate commit timestamps from git history for OpenSpec files
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const GIT_COMMAND_TIMEOUT = 2000; // 2 seconds

/**
 * Get git timestamp for a specific file
 * Returns the commit time of the last commit that modified the file
 *
 * @param filePath - Path to file (relative to project root)
 * @returns Date of last commit, or null if not in git or error
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
 * Get git timestamp for a directory (most recent commit affecting any file in directory)
 *
 * @param dirPath - Path to directory (relative to project root)
 * @returns Date of most recent commit in directory, or null if error
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
 * Get current git SHA for a file
 *
 * @param filePath - Path to file (relative to project root)
 * @returns Git SHA of last commit, or null if not in git or error
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
 * Get creation timestamp for a file (first commit)
 *
 * @param filePath - Path to file (relative to project root)
 * @returns Date of first commit, or null if error
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
 * Fallback: Get filesystem modification time
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
 * Fallback: Get most recent filesystem modification time in directory
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
 * Check if a file is tracked by git
 *
 * @param filePath - Path to file (relative to project root)
 * @returns True if file is tracked by git
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
 * Check if repository is clean (no uncommitted changes)
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
