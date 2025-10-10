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
      <span className="flex items-center gap-1">
        <span className="font-medium">{spec.requirementCount}</span>
        <span>requirements</span>
      </span>
      <span className="text-gray-300">•</span>
      <span className="flex items-center gap-1">
        <span className="font-medium">{spec.scenarioCount}</span>
        <span>scenarios</span>
      </span>
    </>
  );

  const actions = (
    <>
      <button
        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
        onClick={() => onView(spec)}
      >
        View
      </button>
      {onEdit && (
        <button
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
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
