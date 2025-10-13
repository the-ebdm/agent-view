/**
 * API Route: Validate OpenSpec Change
 * POST /api/openspec/validate/[id]
 *
 * Runs strict validation on a change proposal and returns formatted errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateChange } from '@/lib/openspec/cli-wrapper';
import { getOpenSpecRepository } from '@/lib/database/repositories/openspec';
import crypto from 'crypto';

// In-memory cache for validation results (30s TTL)
interface CacheEntry {
  result: any;
  timestamp: number;
  contentHash: string;
}

const validationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

// Rate limiting: max 10 validations per second per ID
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX = 10;

// Debouncing: 500ms delay before validation
const debouncePending = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY_MS = 500;

/**
 * Check rate limit for validation requests
 */
function checkRateLimit(id: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(id);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimits.set(id, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  entry.count++;
  return true;
}

/**
 * Get cached validation result if valid
 */
function getCachedResult(id: string, contentHash: string): any | null {
  const cached = validationCache.get(id);

  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    validationCache.delete(id);
    return null;
  }

  if (cached.contentHash === contentHash) {
    return cached.result;
  }

  return null;
}

/**
 * Set validation result in cache
 */
function setCachedResult(id: string, contentHash: string, result: any): void {
  validationCache.set(id, {
    result,
    contentHash,
    timestamp: Date.now(),
  });
}

/**
 * Compute content hash for caching
 */
function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * POST /api/openspec/validate/[id]
 * Validate a change proposal
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid change ID format' },
        { status: 400 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before validating again.' },
        { status: 429 }
      );
    }

    // Parse request body for content hash (optional)
    let contentHash = '';
    try {
      const body = await req.json();
      contentHash = body.contentHash || '';
    } catch {
      // No body or invalid JSON - proceed without content hash
    }

    // Check cache if content hash provided
    if (contentHash) {
      const cached = getCachedResult(id, contentHash);
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
        });
      }
    }

    // Run validation (with timeout handling built into cli-wrapper)
    const validationResult = await validateChange(id);

    // Format result for UI
    const formattedResult = {
      changeId: id,
      valid: validationResult.valid,
      errors: validationResult.errors.map(error => ({
        message: error.message,
        severity: error.severity || 'error',
        file: extractFileFromError(error.message),
        line: extractLineFromError(error.message),
      })),
      errorCount: validationResult.errors.length,
      timestamp: validationResult.timestamp,
      cached: false,
    };

    // Store validation result in database
    try {
      const repo = getOpenSpecRepository();
      const validationStatus = validationResult.valid ? 'valid' : 'invalid';
      const validationErrors = validationResult.errors.length > 0
        ? JSON.stringify(validationResult.errors.map(e => e.message))
        : null;

      repo.updateChangeValidation(id, validationStatus as any, validationErrors || undefined);
      console.log(`[Validation API] Stored validation result for ${id}: ${validationStatus}`);
    } catch (dbError) {
      console.warn('[Validation API] Failed to store validation result in database:', dbError);
      // Non-fatal - continue with response
    }

    // Cache result if content hash provided
    if (contentHash) {
      setCachedResult(id, contentHash, formattedResult);
    }

    return NextResponse.json(formattedResult);

  } catch (error: any) {
    console.error('[Validation API] Error:', error);

    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Extract file path from validation error message
 */
function extractFileFromError(message: string): string | undefined {
  // Try to match patterns like "openspec/changes/xxx/specs/yyy.md"
  const fileMatch = message.match(/openspec\/[^\s:]+\.md/);
  return fileMatch ? fileMatch[0] : undefined;
}

/**
 * Helper: Extract line number from validation error message
 */
function extractLineFromError(message: string): number | undefined {
  // Try to match patterns like "line 42" or ":42:"
  const lineMatch = message.match(/(?:line\s+|:)(\d+)/i);
  return lineMatch ? parseInt(lineMatch[1], 10) : undefined;
}

/**
 * GET /api/openspec/validate/[id]
 * Get cached validation status (doesn't trigger new validation)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid change ID format' },
        { status: 400 }
      );
    }

    // Check cache (any entry for this ID)
    const cached = validationCache.get(id);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age <= CACHE_TTL_MS) {
        return NextResponse.json({
          ...cached.result,
          cached: true,
          cacheAge: age,
        });
      }
    }

    // No cached result
    return NextResponse.json(
      {
        changeId: id,
        valid: null,
        errors: [],
        errorCount: 0,
        cached: false,
        message: 'No cached validation result. Trigger POST to validate.',
      },
      { status: 404 }
    );

  } catch (error: any) {
    console.error('[Validation API GET] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get validation status',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
