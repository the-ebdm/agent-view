/**
 * Archive Card Component
 * Display card for archived changes (read-only)
 */

'use client';

import React from 'react';
import { OpenSpecCard } from './openspec-card';
import type { ArchivedChange } from '@/types/openspec';

interface ArchiveCardProps {
  archive: ArchivedChange;
  onView: (archive: ArchivedChange) => void;
}

export function ArchiveCard({ archive, onView }: ArchiveCardProps) {
  const stats = (
    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
        Archived
      </span>
      <span className="text-xs">{formatDate(archive.archivedAt)}</span>
    </span>
  );

  const actions = (
    <button
      className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
      onClick={() => onView(archive)}
    >
      View
    </button>
  );

  return (
    <OpenSpecCard
      entity={archive}
      icon={<span>📦</span>}
      stats={stats}
      onView={() => onView(archive)}
      actions={actions}
    />
  );
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}
