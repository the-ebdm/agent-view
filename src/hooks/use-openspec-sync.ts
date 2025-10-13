'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Sync status information from the API
 */
export interface OpenSpecSyncStatus {
  lastSyncedAt: string | null;
  isStale: boolean;
  counts: {
    specs: number;
    changes: number;
    archives: number;
  };
}

/**
 * Result of manual sync operation
 */
export interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    specs: { added: number; updated: number; removed: number };
    changes: { added: number; updated: number; removed: number };
    archives: { added: number; updated: number; removed: number };
  };
  errors?: string[];
  duration?: number;
}

/**
 * Hook for managing OpenSpec sync status and operations
 */
export function useOpenSpecSync(options?: { autoRefresh?: boolean; refreshInterval?: number }) {
  const [syncStatus, setSyncStatus] = useState<OpenSpecSyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const autoRefresh = options?.autoRefresh ?? true;
  const refreshInterval = options?.refreshInterval ?? 30000; // 30 seconds default

  /**
   * Fetch current sync status from API
   */
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/openspec/sync');
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      const data = await response.json();
      setSyncStatus(data);
      setError(null);
    } catch (err) {
      console.error('[useOpenSpecSync] Failed to fetch sync status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status');
    }
  }, []);

  /**
   * Trigger manual sync operation
   */
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/openspec/sync', {
        method: 'POST',
      });

      const result: SyncResult = await response.json();
      setLastSyncResult(result);

      // Refresh status after sync completes
      await fetchSyncStatus();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setIsSyncing(false);
    }
  }, [fetchSyncStatus]);

  /**
   * Clear last sync result (for dismissing notifications)
   */
  const clearSyncResult = useCallback(() => {
    setLastSyncResult(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  // Auto-refresh sync status
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSyncStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSyncStatus]);

  return {
    syncStatus,
    isSyncing,
    error,
    lastSyncResult,
    triggerSync,
    refreshStatus: fetchSyncStatus,
    clearSyncResult,
  };
}
