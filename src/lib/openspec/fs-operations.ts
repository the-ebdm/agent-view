/**
 * OpenSpec File System Operations
 * Secure file operations with path validation and rate limiting
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Security: Define allowed base directory
const OPENSPEC_BASE_DIR = path.join(process.cwd(), 'openspec');

// Rate limiting: Track file operations per user
const operationCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_OPERATIONS_PER_MINUTE = 100;

/**
 * Validate and normalize file path to prevent directory traversal
 * @throws Error if path is invalid or outside openspec directory
 */
export function validatePath(filePath: string): string {
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
export async function readOpenSpecFile(filePath: string): Promise<string> {
  checkRateLimit();

  const validPath = validatePath(filePath);

  try {
    const content = await fs.readFile(validPath, 'utf-8');
    return content;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Write OpenSpec file with validation
 */
export async function writeOpenSpecFile(
  filePath: string,
  content: string
): Promise<void> {
  checkRateLimit();

  const validPath = validatePath(filePath);

  try {
    // Ensure directory exists
    const dir = path.dirname(validPath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(validPath, content, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

/**
 * List files in OpenSpec directory
 */
export async function listOpenSpecFiles(directory: string): Promise<string[]> {
  checkRateLimit();

  const validPath = validatePath(directory);

  try {
    const entries = await fs.readdir(validPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(directory, entry.name));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * List directories in OpenSpec directory
 */
export async function listOpenSpecDirectories(directory: string): Promise<string[]> {
  checkRateLimit();

  const validPath = validatePath(directory);

  try {
    const entries = await fs.readdir(validPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => path.join(directory, entry.name));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw new Error(`Failed to list directories: ${error.message}`);
  }
}

/**
 * Create change directory structure
 */
export async function createChangeDirectory(changeId: string): Promise<void> {
  checkRateLimit();

  const changePath = path.join('changes', changeId);
  const validPath = validatePath(changePath);

  try {
    await fs.mkdir(validPath, { recursive: true });

    // Create placeholder files
    const proposalTemplate = `# ${changeId}\n\n## Why\n\n## What Changes\n\n## Impact\n`;
    const designTemplate = `# Design: ${changeId}\n\n## Context\n\n## Goals / Non-Goals\n\n## Decisions\n`;
    const tasksTemplate = `# Implementation Tasks: ${changeId}\n\n- [ ] Task 1\n`;

    await writeOpenSpecFile(path.join(changePath, 'proposal.md'), proposalTemplate);
    await writeOpenSpecFile(path.join(changePath, 'design.md'), designTemplate);
    await writeOpenSpecFile(path.join(changePath, 'tasks.md'), tasksTemplate);
  } catch (error: any) {
    throw new Error(`Failed to create change directory: ${error.message}`);
  }
}

/**
 * Move change to archive
 */
export async function moveToArchive(changeId: string): Promise<void> {
  checkRateLimit();

  const sourcePath = validatePath(path.join('changes', changeId));
  const destPath = validatePath(path.join('changes', 'archive', changeId));

  try {
    // Ensure archive directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Move directory
    await fs.rename(sourcePath, destPath);
  } catch (error: any) {
    throw new Error(`Failed to archive change: ${error.message}`);
  }
}

/**
 * Delete OpenSpec file or directory
 */
export async function deleteOpenSpec(filePath: string): Promise<void> {
  checkRateLimit();

  const validPath = validatePath(filePath);

  try {
    const stats = await fs.stat(validPath);

    if (stats.isDirectory()) {
      await fs.rm(validPath, { recursive: true, force: true });
    } else {
      await fs.unlink(validPath);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return; // Already deleted
    }
    throw new Error(`Failed to delete: ${error.message}`);
  }
}

/**
 * Parse markdown file with frontmatter
 */
export async function parseMarkdownFile(filePath: string) {
  const content = await readOpenSpecFile(filePath);
  const { data, content: markdown } = matter(content);

  return {
    frontmatter: data,
    markdown,
  };
}

/**
 * Check if file or directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    const validPath = validatePath(filePath);
    await fs.access(validPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file statistics
 */
export async function getFileStats(filePath: string) {
  checkRateLimit();

  const validPath = validatePath(filePath);

  try {
    const stats = await fs.stat(validPath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  } catch (error: any) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
}
