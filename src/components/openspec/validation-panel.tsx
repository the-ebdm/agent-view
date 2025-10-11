/**
 * Validation Panel Component
 * Displays validation errors with file, line, and message details
 */

'use client';

import React, { useState } from 'react';

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning' | 'info';
  file?: string;
  line?: number;
}

interface ValidationPanelProps {
  errors: ValidationError[];
  isCollapsed?: boolean;
  onToggle?: () => void;
  onJumpToError?: (error: ValidationError) => void;
  className?: string;
}

export function ValidationPanel({
  errors,
  isCollapsed: controlledCollapsed,
  onToggle,
  onJumpToError,
  className = '',
}: ValidationPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  if (errors.length === 0) {
    return null;
  }

  // Group errors by severity
  const errorsByServerity = {
    error: errors.filter(e => e.severity === 'error'),
    warning: errors.filter(e => e.severity === 'warning'),
    info: errors.filter(e => e.severity === 'info'),
  };

  const errorCount = errorsByServerity.error.length;
  const warningCount = errorsByServerity.warning.length;

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-semibold">
            {errorCount > 0 && `${errorCount} Error${errorCount > 1 ? 's' : ''}`}
            {errorCount > 0 && warningCount > 0 && ', '}
            {warningCount > 0 && `${warningCount} Warning${warningCount > 1 ? 's' : ''}`}
          </span>
        </div>
        <span className={`text-red-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
          ▼
        </span>
      </button>

      {/* Error List */}
      {!isCollapsed && (
        <div className="max-h-96 overflow-y-auto bg-white">
          {errorsByServerity.error.length > 0 && (
            <ErrorSection
              title="Errors"
              errors={errorsByServerity.error}
              severity="error"
              onJumpToError={onJumpToError}
            />
          )}
          {errorsByServerity.warning.length > 0 && (
            <ErrorSection
              title="Warnings"
              errors={errorsByServerity.warning}
              severity="warning"
              onJumpToError={onJumpToError}
            />
          )}
          {errorsByServerity.info.length > 0 && (
            <ErrorSection
              title="Info"
              errors={errorsByServerity.info}
              severity="info"
              onJumpToError={onJumpToError}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Error section within the panel
 */
interface ErrorSectionProps {
  title: string;
  errors: ValidationError[];
  severity: 'error' | 'warning' | 'info';
  onJumpToError?: (error: ValidationError) => void;
}

function ErrorSection({ title, errors, severity, onJumpToError }: ErrorSectionProps) {
  const severityStyles = {
    error: {
      bg: 'bg-red-50',
      text: 'text-red-900',
      border: 'border-red-200',
      icon: '❌',
    },
    warning: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      border: 'border-yellow-200',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      border: 'border-blue-200',
      icon: 'ℹ️',
    },
  };

  const style = severityStyles[severity];

  return (
    <div className="border-b last:border-b-0">
      <div className={`px-4 py-2 ${style.bg} border-b ${style.border}`}>
        <h4 className={`text-sm font-semibold ${style.text}`}>{title}</h4>
      </div>
      <div className="divide-y">
        {errors.map((error, index) => (
          <div
            key={index}
            className="px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                {/* File and line info */}
                {(error.file || error.line) && (
                  <div className="flex items-center gap-2 mb-1">
                    {error.file && (
                      <code className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                        {error.file}
                      </code>
                    )}
                    {error.line && (
                      <span className="text-xs text-gray-500">
                        Line {error.line}
                      </span>
                    )}
                  </div>
                )}

                {/* Error message */}
                <p className="text-sm text-gray-800 break-words">
                  {error.message}
                </p>

                {/* Jump to error button */}
                {onJumpToError && (error.file || error.line) && (
                  <button
                    onClick={() => onJumpToError(error)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    Jump to error →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline error marker (for editor line highlighting)
 */
interface InlineErrorMarkerProps {
  error: ValidationError;
  onClick?: () => void;
}

export function InlineErrorMarker({ error, onClick }: InlineErrorMarkerProps) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs cursor-pointer hover:bg-red-200 transition-colors"
      onClick={onClick}
      title={error.message}
    >
      <span>❌</span>
      <span className="font-medium">Error</span>
    </div>
  );
}

/**
 * Empty state when no errors
 */
export function ValidationSuccess() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
      <span className="text-lg">✅</span>
      <span className="text-sm font-medium text-green-800">
        All validations passed
      </span>
    </div>
  );
}
