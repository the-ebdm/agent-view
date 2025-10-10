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
    <span className="flex items-center gap-1 text-gray-500">
      <span>Archived</span>
      <span>{formatDate(archive.archivedAt)}</span>
    </span>
  );

  const actions = (
    <button
      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
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
