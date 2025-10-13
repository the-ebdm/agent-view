/**
 * API Route: Execute Slash Commands
 * POST /api/slash-command
 *
 * Executes OpenSpec slash commands with security whitelisting and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeSlashCommand } from '@/lib/openspec/cli-wrapper';

// Whitelist of allowed slash commands
const ALLOWED_COMMANDS = [
  'proposal',
  'apply',
  'archive',
];

interface SlashCommandRequest {
  command: string; // e.g., "proposal", "apply", "archive"
  args?: string; // e.g., "change-id" or "change-id --flag"
}

interface AuditLogEntry {
  timestamp: Date;
  command: string;
  args: string;
  success: boolean;
  duration: number;
}

// In-memory audit log (in production, use database or logging service)
const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_LOG_SIZE = 1000;

/**
 * Add entry to audit log
 */
function logCommand(entry: Omit<AuditLogEntry, 'timestamp'>) {
  auditLog.push({
    ...entry,
    timestamp: new Date(),
  });

  // Keep audit log from growing indefinitely
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }
}

/**
 * Validate command is in whitelist
 */
function isCommandAllowed(command: string): boolean {
  const cleanCommand = command
    .replace('/openspec:', '')
    .replace('openspec:', '')
    .trim();

  return ALLOWED_COMMANDS.includes(cleanCommand);
}

/**
 * POST /api/slash-command
 * Execute a whitelisted slash command
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let body: SlashCommandRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { command, args = '' } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'Missing required field: command' },
        { status: 400 }
      );
    }

    // Validate command is allowed
    if (!isCommandAllowed(command)) {
      logCommand({
        command,
        args,
        success: false,
        duration: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Command not allowed',
          message: `Only the following commands are allowed: ${ALLOWED_COMMANDS.join(', ')}`,
          allowedCommands: ALLOWED_COMMANDS,
        },
        { status: 403 }
      );
    }

    // Execute command via CLI wrapper
    const result = await executeSlashCommand(command, args);

    // Log execution
    logCommand({
      command,
      args,
      success: result.success,
      duration: Date.now() - startTime,
    });

    // Return result
    return NextResponse.json({
      success: result.success,
      command,
      args,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      duration: Date.now() - startTime,
    });

  } catch (error: unknown) {
    console.error('[Slash Command API] Error:', error);

    // Log error
    logCommand({
      command: 'unknown',
      args: '',
      success: false,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: 'Command execution failed',
        message: error instanceof Error ? error.message : String(error) || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/slash-command
 * Get audit log and available commands
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Return recent audit log entries
    const recentEntries = auditLog.slice(-Math.min(limit, 100));

    return NextResponse.json({
      allowedCommands: ALLOWED_COMMANDS,
      auditLog: recentEntries,
      totalExecutions: auditLog.length,
    });

  } catch (error: unknown) {
    console.error('[Slash Command API GET] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get command info',
        message: error instanceof Error ? error.message : String(error) || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
