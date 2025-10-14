/**
 * Admin Reconcile API Endpoint
 *
 * POST /api/admin/reconcile
 *
 * Triggers count reconciliation for projects and worktrees.
 * Fixes drifted agent/worktree counts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectsRepository } from '@/lib/database/repositories/projects';
import { getWorktreesRepository } from '@/lib/database/repositories/worktrees';

/**
 * Reconcile request body
 */
interface ReconcileRequest {
  projectId?: string;
}

/**
 * Reconcile response
 */
interface ReconcileResponse {
  success: boolean;
  projectsCorrected: number;
  worktreesCorrected: number;
  totalCorrected: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ReconcileRequest = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine, reconcile all
      body = {};
    }

    const { projectId } = body;

    // Get repositories
    const projectsRepo = getProjectsRepository();
    const worktreesRepo = getWorktreesRepository();

    // Reconcile counts
    const startTime = Date.now();
    const projectsCorrected = projectsRepo.reconcileCounts(projectId);
    const worktreesCorrected = worktreesRepo.reconcileCounts();
    const duration = Date.now() - startTime;

    console.log(`[Admin Reconcile] Reconciled counts in ${duration}ms:`, {
      projectsCorrected,
      worktreesCorrected,
      projectId: projectId || 'all',
    });

    const response: ReconcileResponse = {
      success: true,
      projectsCorrected,
      worktreesCorrected,
      totalCorrected: projectsCorrected + worktreesCorrected,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[Admin Reconcile] Error:', error);
    return NextResponse.json(
      {
        success: false,
        projectsCorrected: 0,
        worktreesCorrected: 0,
        totalCorrected: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ReconcileResponse,
      { status: 500 }
    );
  }
}
