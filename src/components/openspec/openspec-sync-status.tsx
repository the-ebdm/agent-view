'use client';

import { useOpenSpecSync } from '@/hooks/use-openspec-sync';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';

/**
 * Format relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * OpenSpec Sync Status Component
 * Displays sync status and provides manual sync button
 */
export function OpenSpecSyncStatus() {
  const { syncStatus, isSyncing, lastSyncResult, triggerSync, clearSyncResult } = useOpenSpecSync({
    autoRefresh: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  const [showNotification, setShowNotification] = useState(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show notification when sync completes
  useEffect(() => {
    if (lastSyncResult) {
      setShowNotification(true);

      // Clear previous timeout if exists
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }

      // Auto-dismiss notification after 5 seconds
      const timeout = setTimeout(() => {
        setShowNotification(false);
        clearSyncResult();
      }, 5000);

      notificationTimeoutRef.current = timeout;
    }

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [lastSyncResult, clearSyncResult]);

  const handleSync = async () => {
    await triggerSync();
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
    clearSyncResult();
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
  };

  if (!syncStatus) {
    return null;
  }

  const isStale = syncStatus.isStale;
  const relativeTime = formatRelativeTime(syncStatus.lastSyncedAt);

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Sync Status Indicator */}
      <div className="flex items-center gap-2">
        {/* Status Icon */}
        {isSyncing ? (
          <span className="animate-spin text-blue-500" title="Syncing...">
            🔄
          </span>
        ) : isStale ? (
          <span className="text-yellow-500" title="Database is stale (>5 min)">
            ⚠️
          </span>
        ) : (
          <span className="text-green-500" title="Database is up to date">
            ✓
          </span>
        )}

        {/* Last Synced Text */}
        <span
          className={`${
            isStale
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {isSyncing ? 'Syncing...' : `Synced ${relativeTime}`}
        </span>

        {/* Entity Counts (on hover) */}
        <span
          className="text-gray-500 dark:text-gray-500"
          title={`Specs: ${syncStatus.counts.specs}, Changes: ${syncStatus.counts.changes}, Archives: ${syncStatus.counts.archives}`}
        >
          ({syncStatus.counts.specs + syncStatus.counts.changes + syncStatus.counts.archives})
        </span>
      </div>

      {/* Sync Button */}
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        title={isStale ? 'Database is stale - click to sync' : 'Manually sync OpenSpec database'}
      >
        {isSyncing ? '⏳ Syncing...' : '🔄 Sync Now'}
      </Button>

      {/* Success/Error Notification (Toast) */}
      {showNotification && lastSyncResult && (
        <div
          className={`fixed bottom-4 right-4 z-50 max-w-md rounded-lg shadow-lg border p-4 animate-slide-up ${
            lastSyncResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {lastSyncResult.success ? '✅' : '❌'}
            </span>
            <div className="flex-1">
              <h4
                className={`font-semibold mb-1 ${
                  lastSyncResult.success
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}
              >
                {lastSyncResult.success ? 'Sync Complete' : 'Sync Failed'}
              </h4>
              <p
                className={`text-sm ${
                  lastSyncResult.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {lastSyncResult.message}
              </p>

              {/* Stats */}
              {lastSyncResult.stats && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>
                    Specs: +{lastSyncResult.stats.specs.added} ~
                    {lastSyncResult.stats.specs.updated} -
                    {lastSyncResult.stats.specs.removed}
                  </div>
                  <div>
                    Changes: +{lastSyncResult.stats.changes.added} ~
                    {lastSyncResult.stats.changes.updated} -
                    {lastSyncResult.stats.changes.removed}
                  </div>
                  <div>
                    Archives: +{lastSyncResult.stats.archives.added} ~
                    {lastSyncResult.stats.archives.updated} -
                    {lastSyncResult.stats.archives.removed}
                  </div>
                  {lastSyncResult.duration && (
                    <div className="mt-1">
                      Completed in {lastSyncResult.duration}ms
                    </div>
                  )}
                </div>
              )}

              {/* Errors */}
              {lastSyncResult.errors && lastSyncResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                  <div className="font-semibold mb-1">Errors:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {lastSyncResult.errors.slice(0, 3).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {lastSyncResult.errors.length > 3 && (
                      <li>
                        ...and {lastSyncResult.errors.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismissNotification}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* CSS for slide-up animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
