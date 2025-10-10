/**
 * OpenSpec Card Component
 * Base card for displaying OpenSpec entities (specs, changes, archives)
 */

'use client';

import React from 'react';
import type { OpenSpecEntity } from '@/types/openspec';

interface OpenSpecCardProps {
  entity: OpenSpecEntity;
  icon: React.ReactNode;
  stats?: React.ReactNode;
  statusIndicator?: React.ReactNode;
  onView: () => void;
  actions?: React.ReactNode;
}

export function OpenSpecCard({
  entity,
  icon,
  stats,
  statusIndicator,
  onView,
  actions,
}: OpenSpecCardProps) {
  return (
    <div
      className="group relative flex flex-col rounded-lg border border-gray-700 dark:border-gray-700 bg-gray-900/50 dark:bg-gray-900/50 p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-500 cursor-pointer"
      onClick={onView}
    >
      {/* Header with icon and name */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white dark:text-white truncate">
              {entity.name}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 truncate mt-0.5">
              {entity.id}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        {statusIndicator && (
          <div className="flex-shrink-0">{statusIndicator}</div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-300 dark:text-gray-300">
          {stats}
        </div>
      )}

      {/* Actions (show on hover) */}
      {actions && (
        <div className="mt-3 pt-3 border-t border-gray-700 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        </div>
      )}

      {/* Last updated */}
      {entity.updatedAt && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
          Updated {formatRelativeTime(entity.updatedAt)}
        </div>
      )}
    </div>
  );
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Unknown';
  }

  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) {
    return dateObj.toLocaleDateString();
  }
  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
  if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  }
  if (diffMin > 0) {
    return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
