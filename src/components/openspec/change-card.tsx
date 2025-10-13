/**
 * Change Card Component
 * Display card for change proposals with progress tracking
 */

'use client';

import React from 'react';
import { OpenSpecCard } from './openspec-card';
import type { ChangeProposal, ValidationStatus } from '@/types/openspec';

interface ChangeCardProps {
  change: ChangeProposal;
  onView: (change: ChangeProposal) => void;
  onEdit?: (change: ChangeProposal) => void;
  onValidate?: (change: ChangeProposal) => void;
  onArchive?: (change: ChangeProposal) => void;
}

export function ChangeCard({ change, onView, onEdit, onValidate, onArchive }: ChangeCardProps) {
  const statusColor = getStatusColor(change.status);
  const validationIcon = getValidationIcon(change.validationStatus);

  const statusIndicator = (
    <div className="flex flex-col items-end gap-2">
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${statusColor}`}
      >
        {formatStatus(change.status)}
      </span>
      <span className="text-xl">{validationIcon}</span>
    </div>
  );

  const stats = (
    <>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-gray-900 dark:text-white">{change.completedTaskCount}</span>
        <span className="text-gray-400 dark:text-gray-500">/</span>
        <span className="text-gray-700 dark:text-gray-300">{change.taskCount}</span>
        <span className="text-gray-600 dark:text-gray-400">tasks</span>
      </span>
      <span className="text-gray-300 dark:text-gray-600">•</span>
      <div className="flex-1 max-w-[140px] flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-300 rounded-full ${getProgressColor(change.progressPercentage)}`}
            style={{ width: `${change.progressPercentage}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[35px]">
          {change.progressPercentage}%
        </span>
      </div>
    </>
  );

  const actions = (
    <>
      <button
        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-150"
        onClick={() => onView(change)}
      >
        View
      </button>
      {onEdit && (
        <button
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
          onClick={() => onEdit(change)}
        >
          Edit
        </button>
      )}
      {onValidate && (
        <button
          className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors duration-150"
          onClick={() => onValidate(change)}
        >
          Validate
        </button>
      )}
      {onArchive && change.status === 'completed' && (
        <button
          className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors duration-150"
          onClick={() => onArchive(change)}
        >
          Archive
        </button>
      )}
    </>
  );

  return (
    <OpenSpecCard
      entity={change}
      icon={<span>🔄</span>}
      stats={stats}
      statusIndicator={statusIndicator}
      onView={() => onView(change)}
      actions={actions}
    />
  );
}

function getStatusColor(status: ChangeProposal['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800';
    case 'in_progress':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    case 'pending':
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
  }
}

function getProgressColor(percentage: number): string {
  if (percentage === 100) {
    return 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700';
  } else if (percentage >= 50) {
    return 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700';
  } else if (percentage > 0) {
    return 'bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-600 dark:to-orange-600';
  } else {
    return 'bg-gray-400 dark:bg-gray-600';
  }
}

function formatStatus(status: ChangeProposal['status']): string {
  switch (status) {
    case 'completed':
      return 'Complete';
    case 'in_progress':
      return 'In Progress';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

function getValidationIcon(status: ValidationStatus): string {
  switch (status) {
    case 'valid':
      return '✅';
    case 'invalid':
      return '❌';
    case 'validating':
      return '🔄';
    case 'pending':
      return '⏳';
    default:
      return '⏳';
  }
}
