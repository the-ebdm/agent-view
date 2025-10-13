/**
 * Capability Card Component
 * Display card for capability specifications
 */

'use client';

import React from 'react';
import { OpenSpecCard } from './openspec-card';
import type { CapabilitySpec } from '@/types/openspec';

interface CapabilityCardProps {
  spec: CapabilitySpec;
  onView: (spec: CapabilitySpec) => void;
  onEdit?: (spec: CapabilitySpec) => void;
}

export function CapabilityCard({ spec, onView, onEdit }: CapabilityCardProps) {
  const stats = (
    <>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-gray-900 dark:text-white">{spec.requirementCount}</span>
        <span className="text-gray-600 dark:text-gray-400">requirements</span>
      </span>
      <span className="text-gray-300 dark:text-gray-600">•</span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold text-gray-900 dark:text-white">{spec.scenarioCount}</span>
        <span className="text-gray-600 dark:text-gray-400">scenarios</span>
      </span>
    </>
  );

  const actions = (
    <>
      <button
        className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-150"
        onClick={() => onView(spec)}
      >
        View
      </button>
      {onEdit && (
        <button
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-150"
          onClick={() => onEdit(spec)}
        >
          Edit
        </button>
      )}
    </>
  );

  return (
    <OpenSpecCard
      entity={spec}
      icon={<span>📋</span>}
      stats={stats}
      onView={() => onView(spec)}
      actions={actions}
    />
  );
}
