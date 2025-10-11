/**
 * Validation Indicator Component
 * Shows validation status with icons and error counts
 */

'use client';

import React from 'react';

export type ValidationStatus = 'pending' | 'validating' | 'valid' | 'invalid' | null;

interface ValidationIndicatorProps {
  status: ValidationStatus;
  errorCount?: number;
  timestamp?: Date;
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  Exclude<ValidationStatus, null>,
  {
    icon: string;
    label: string;
    className: string;
    bgClassName: string;
  }
> = {
  pending: {
    icon: '⏳',
    label: 'Not validated',
    className: 'text-gray-500',
    bgClassName: 'bg-gray-100',
  },
  validating: {
    icon: '🔄',
    label: 'Validating...',
    className: 'text-blue-600 animate-spin',
    bgClassName: 'bg-blue-50',
  },
  valid: {
    icon: '✅',
    label: 'Valid',
    className: 'text-green-600',
    bgClassName: 'bg-green-50',
  },
  invalid: {
    icon: '❌',
    label: 'Invalid',
    className: 'text-red-600',
    bgClassName: 'bg-red-50',
  },
};

export function ValidationIndicator({
  status,
  errorCount = 0,
  timestamp,
  className = '',
  showText = true,
  compact = false,
}: ValidationIndicatorProps) {
  if (!status) {
    return null;
  }

  const config = STATUS_CONFIG[status];

  // Format timestamp
  const timeAgo = timestamp ? formatTimeAgo(timestamp) : null;

  if (compact) {
    // Compact mode: just icon
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        title={`${config.label}${errorCount > 0 ? ` (${errorCount} error${errorCount > 1 ? 's' : ''})` : ''}`}
      >
        <span className={`text-lg ${config.className}`}>
          {config.icon}
        </span>
      </span>
    );
  }

  // Full mode: icon + text + error count
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bgClassName}`}>
        <span className={`text-base ${config.className}`}>
          {config.icon}
        </span>
        {showText && (
          <span className={`text-sm font-medium ${config.className}`}>
            {config.label}
          </span>
        )}
        {status === 'invalid' && errorCount > 0 && (
          <span className={`text-xs font-semibold ${config.className}`}>
            ({errorCount})
          </span>
        )}
      </span>
      {timeAgo && (
        <span className="text-xs text-gray-500">
          {timeAgo}
        </span>
      )}
    </div>
  );
}

/**
 * Format timestamp as relative time
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString();
}

/**
 * Small inline validation badge (for cards)
 */
export function ValidationBadge({
  status,
  errorCount,
  className = '',
}: Pick<ValidationIndicatorProps, 'status' | 'errorCount' | 'className'>) {
  if (!status || status === 'pending') {
    return null;
  }

  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgClassName} ${config.className} ${className}`}
      title={config.label}
    >
      <span>{config.icon}</span>
      {status === 'invalid' && errorCount !== undefined && errorCount > 0 && (
        <span>{errorCount}</span>
      )}
    </div>
  );
}
