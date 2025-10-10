/**
 * OpenSpec CLI Wrapper
 * Executes openspec CLI commands with security, timeouts, and error handling
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { CLIResult, CapabilitySpec, ChangeProposal, ArchivedChange } from '@/types/openspec';

const execAsync = promisify(exec);

// Security: Timeout for CLI commands (5s default, 10s max)
const DEFAULT_TIMEOUT = 5000;
const MAX_TIMEOUT = 10000;

/**
 * Execute openspec CLI command with timeout and error handling
 */
async function executeOpenSpecCommand(
  command: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<CLIResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: Math.min(timeout, MAX_TIMEOUT),
      cwd: process.cwd(),
      encoding: 'utf-8',
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code || 1,
    };
  }
}

/**
 * List all capability specs in openspec/specs/
 */
export async function listSpecs(): Promise<CapabilitySpec[]> {
  const result = await executeOpenSpecCommand('openspec list --specs');

  if (!result.success) {
    console.error('Failed to list specs:', result.stderr);
    return [];
  }

  try {
    // Parse text output (format: "spec-name")
    const lines = result.stdout.split('\n').filter(line => line.trim() && !line.startsWith('Specs:'));

    return lines.map(line => {
      const name = line.trim().split(/\s+/)[0]; // Get first word as name
      return {
        id: name,
        type: 'spec' as const,
        name,
        path: `openspec/specs/${name}.md`,
        requirementCount: 0,
        scenarioCount: 0,
        content: '',
        updatedAt: new Date(),
      };
    });
  } catch (error) {
    console.error('Failed to parse specs:', error);
    return [];
  }
}

/**
 * List all active changes in openspec/changes/
 */
export async function listChanges(): Promise<ChangeProposal[]> {
  const result = await executeOpenSpecCommand('openspec list');

  if (!result.success) {
    console.error('Failed to list changes:', result.stderr);
    return [];
  }

  try {
    // Parse text output (format: "  change-name   X/Y tasks" or "  change-name   ✓ Complete")
    const lines = result.stdout.split('\n').filter(line => line.trim() && !line.startsWith('Changes:'));

    return lines.map(line => {
      const trimmed = line.trim();
      const parts = trimmed.split(/\s{2,}/); // Split on multiple spaces
      const id = parts[0];
      const statusText = parts[1] || '';

      // Parse tasks from "64/109 tasks" format
      const taskMatch = statusText.match(/(\d+)\/(\d+)\s+tasks/);
      let completedTaskCount = 0;
      let taskCount = 0;
      let status: 'pending' | 'in_progress' | 'completed' = 'pending';

      if (taskMatch) {
        completedTaskCount = parseInt(taskMatch[1]);
        taskCount = parseInt(taskMatch[2]);
        if (completedTaskCount === 0) status = 'pending';
        else if (completedTaskCount < taskCount) status = 'in_progress';
        else status = 'completed';
      } else if (statusText.includes('Complete')) {
        status = 'completed';
        completedTaskCount = 1;
        taskCount = 1;
      }

      const progressPercentage = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

      return {
        id,
        type: 'change' as const,
        name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        path: `openspec/changes/${id}`,
        status,
        validationStatus: 'pending' as const,
        progressPercentage,
        taskCount,
        completedTaskCount,
        updatedAt: new Date(),
      };
    });
  } catch (error) {
    console.error('Failed to parse changes:', error);
    return [];
  }
}

/**
 * List all archived changes in openspec/changes/archive/
 */
export async function listArchives(): Promise<ArchivedChange[]> {
  // OpenSpec CLI doesn't have --archived flag, use fs to read archive directory
  try {
    const fs = require('fs');
    const path = require('path');
    const archivePath = path.join(process.cwd(), 'openspec', 'changes', 'archive');

    if (!fs.existsSync(archivePath)) {
      return [];
    }

    const entries = fs.readdirSync(archivePath, { withFileTypes: true });
    return entries
      .filter((entry: any) => entry.isDirectory())
      .map((entry: any) => ({
        id: entry.name,
        type: 'archive' as const,
        name: entry.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        path: `openspec/changes/archive/${entry.name}`,
        archivedAt: new Date(),
        updatedAt: new Date(),
      }));
  } catch (error) {
    console.error('Failed to list archives:', error);
    return [];
  }
}

/**
 * Validate a change by ID
 */
export async function validateChange(id: string) {
  const result = await executeOpenSpecCommand(
    `openspec validate ${id} --strict`,
    10000 // Validation may take longer
  );

  try {
    // OpenSpec validate outputs text, not JSON
    // Success if exit code is 0 and no errors in output
    const valid = result.success && !result.stderr.includes('error');

    return {
      valid,
      errors: valid ? [] : [{
        message: result.stderr || result.stdout || 'Validation failed',
        severity: 'error' as const,
      }],
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        message: 'Failed to run validation',
        severity: 'error' as const,
      }],
      timestamp: new Date(),
    };
  }
}

/**
 * Show detailed information about a change
 */
export async function showChange(id: string) {
  const result = await executeOpenSpecCommand(`openspec show ${id}`);

  if (!result.success) {
    throw new Error(`Failed to show change: ${result.stderr}`);
  }

  // OpenSpec show outputs formatted text, not JSON
  // Return the raw output for now
  return {
    id,
    output: result.stdout,
  };
}

/**
 * Show detailed information about a spec
 */
export async function showSpec(id: string) {
  const result = await executeOpenSpecCommand(`openspec show ${id} --type spec`);

  if (!result.success) {
    throw new Error(`Failed to show spec: ${result.stderr}`);
  }

  // OpenSpec show outputs formatted text, not JSON
  // Return the raw output for now
  return {
    id,
    output: result.stdout,
  };
}

/**
 * Execute a slash command (proposal, apply, archive)
 */
export async function executeSlashCommand(
  command: string,
  args: string = ''
): Promise<CLIResult> {
  // Security: Whitelist only openspec commands
  const allowedCommands = ['proposal', 'apply', 'archive'];
  const commandName = command.replace('/openspec:', '').replace('openspec:', '');

  if (!allowedCommands.includes(commandName)) {
    return {
      success: false,
      stdout: '',
      stderr: `Command '${commandName}' is not allowed`,
      exitCode: 1,
    };
  }

  const fullCommand = `openspec ${commandName} ${args}`.trim();
  return executeOpenSpecCommand(fullCommand, 30000); // Longer timeout for workflow commands
}

/**
 * Helper: Derive change status from task completion
 */
function deriveChangeStatus(tasks: any[]): 'pending' | 'in_progress' | 'completed' {
  if (!tasks || tasks.length === 0) return 'pending';

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = completedCount / tasks.length;

  if (progress === 0) return 'pending';
  if (progress === 1) return 'completed';
  return 'in_progress';
}

/**
 * Helper: Calculate task completion percentage
 */
function calculateProgress(tasks: any[]): number {
  if (!tasks || tasks.length === 0) return 0;

  const completedCount = tasks.filter(t => t.completed).length;
  return Math.round((completedCount / tasks.length) * 100);
}
