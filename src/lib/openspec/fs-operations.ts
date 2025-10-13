/**
 * OpenSpec File System Operations
 * Secure file operations with path validation and rate limiting
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Security: Define default base directory
const DEFAULT_OPENSPEC_BASE_DIR = path.join(process.cwd(), 'openspec');

// Rate limiting: Track file operations per user
const operationCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_OPERATIONS_PER_MINUTE = 100;

/**
 * Get OpenSpec base directory for a project
 */
function getOpenSpecBaseDir(projectDir?: string): string {
  if (projectDir) {
    return path.join(projectDir, 'openspec');
  }
  return DEFAULT_OPENSPEC_BASE_DIR;
}

/**
 * Validate and normalize file path to prevent directory traversal
 * @throws Error if path is invalid or outside openspec directory
 */
export function validatePath(filePath: string, projectDir?: string): string {
  const OPENSPEC_BASE_DIR = getOpenSpecBaseDir(projectDir);

  // Normalize the path
  const normalizedPath = path.normalize(filePath);

  // Resolve to absolute path
  const absolutePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.join(OPENSPEC_BASE_DIR, normalizedPath);

  // Security: Ensure path is within openspec directory
  const relative = path.relative(OPENSPEC_BASE_DIR, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Access denied: Path outside openspec directory');
  }

  return absolutePath;
}

/**
 * Rate limit file operations
 * @throws Error if rate limit exceeded
 */
function checkRateLimit(userId: string = 'default'): void {
  const now = Date.now();
  const userLimits = operationCounts.get(userId);

  if (!userLimits || now > userLimits.resetTime) {
    // Reset counter every minute
    operationCounts.set(userId, {
      count: 1,
      resetTime: now + 60000,
    });
    return;
  }

  if (userLimits.count >= MAX_OPERATIONS_PER_MINUTE) {
    throw new Error('Rate limit exceeded: Too many file operations');
  }

  userLimits.count++;
}

/**
 * Read OpenSpec file with path validation
 */
export async function readOpenSpecFile(filePath: string, projectDir?: string): Promise<string> {
  checkRateLimit();

  const validPath = validatePath(filePath, projectDir);

  try {
    const content = await fs.readFile(validPath, 'utf-8');
    return content;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read file: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Write OpenSpec file with validation
 */
export async function writeOpenSpecFile(
  filePath: string,
  content: string,
  projectDir?: string
): Promise<void> {
  checkRateLimit();

  const validPath = validatePath(filePath, projectDir);

  try {
    // Ensure directory exists
    const dir = path.dirname(validPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(validPath, content, 'utf-8');
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(`Failed to write file: ${err.message || 'Unknown error'}`);
  }
}

/**
 * List files in OpenSpec directory
 */
export async function listOpenSpecFiles(directory: string, projectDir?: string): Promise<string[]> {
  checkRateLimit();

  const validPath = validatePath(directory, projectDir);

  try {
    const entries = await fs.readdir(validPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(directory, entry.name));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to list files: ${err.message || 'Unknown error'}`);
  }
}

/**
 * List directories in OpenSpec directory
 */
export async function listOpenSpecDirectories(directory: string, projectDir?: string): Promise<string[]> {
  checkRateLimit();

  const validPath = validatePath(directory, projectDir);

  try {
    const entries = await fs.readdir(validPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => path.join(directory, entry.name));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to list directories: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Create change directory structure
 */
export async function createChangeDirectory(changeId: string, projectDir?: string): Promise<void> {
  checkRateLimit();

  const changePath = path.join('changes', changeId);
  const validPath = validatePath(changePath, projectDir);

  try {
    await fs.mkdir(validPath, { recursive: true });

    // Create placeholder files
    const proposalTemplate = `# ${changeId}\n\n## Why\n\n## What Changes\n\n## Impact\n`;
    const designTemplate = `# Design: ${changeId}\n\n## Context\n\n## Goals / Non-Goals\n\n## Decisions\n`;
    const tasksTemplate = `# Implementation Tasks: ${changeId}\n\n- [ ] Task 1\n`;

    await writeOpenSpecFile(path.join(changePath, 'proposal.md'), proposalTemplate, projectDir);
    await writeOpenSpecFile(path.join(changePath, 'design.md'), designTemplate, projectDir);
    await writeOpenSpecFile(path.join(changePath, 'tasks.md'), tasksTemplate, projectDir);
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(`Failed to create change directory: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Move change to archive
 */
export async function moveToArchive(changeId: string, projectDir?: string): Promise<void> {
  checkRateLimit();

  const sourcePath = validatePath(path.join('changes', changeId), projectDir);
  const destPath = validatePath(path.join('changes', 'archive', changeId), projectDir);

  try {
    // Ensure archive directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Move directory
    await fs.rename(sourcePath, destPath);
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(`Failed to archive change: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Delete OpenSpec file or directory
 */
export async function deleteOpenSpec(filePath: string, projectDir?: string): Promise<void> {
  checkRateLimit();

  const validPath = validatePath(filePath, projectDir);

  try {
    const stats = await fs.stat(validPath);

    if (stats.isDirectory()) {
      await fs.rm(validPath, { recursive: true, force: true });
    } else {
      await fs.unlink(validPath);
    }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ENOENT') {
      return; // Already deleted
    }
    throw new Error(`Failed to delete: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Parse markdown file with frontmatter
 */
export async function parseMarkdownFile(filePath: string, projectDir?: string) {
  const content = await readOpenSpecFile(filePath, projectDir);
  const { data, content: markdown } = matter(content);

  return {
    frontmatter: data,
    markdown,
  };
}

/**
 * Check if file or directory exists
 */
export async function exists(filePath: string, projectDir?: string): Promise<boolean> {
  try {
    const validPath = validatePath(filePath, projectDir);
    await fs.access(validPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file statistics
 */
export async function getFileStats(filePath: string, projectDir?: string) {
  checkRateLimit();

  const validPath = validatePath(filePath, projectDir);

  try {
    const stats = await fs.stat(validPath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    throw new Error(`Failed to get file stats: ${err.message || 'Unknown error'}`);
  }
}
