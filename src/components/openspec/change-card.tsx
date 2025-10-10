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
    <div className="flex flex-col items-end gap-1">
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}`}
      >
        {formatStatus(change.status)}
      </span>
      <span className="text-lg">{validationIcon}</span>
    </div>
  );

  const stats = (
    <>
      <span className="flex items-center gap-1">
        <span className="font-medium">{change.completedTaskCount}</span>
        <span>/</span>
        <span>{change.taskCount}</span>
        <span>tasks</span>
      </span>
      <span className="text-gray-300">•</span>
      <div className="flex-1 max-w-[120px]">
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${change.progressPercentage}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium">{change.progressPercentage}%</span>
    </>
  );

  const actions = (
    <>
      <button
        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
        onClick={() => onView(change)}
      >
        View
      </button>
      {onEdit && (
        <button
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
          onClick={() => onEdit(change)}
        >
          Edit
        </button>
      )}
      {onValidate && (
        <button
          className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100"
          onClick={() => onValidate(change)}
        >
          Validate
        </button>
      )}
      {onArchive && change.status === 'completed' && (
        <button
          className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
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
      return 'bg-green-100 text-green-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
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
