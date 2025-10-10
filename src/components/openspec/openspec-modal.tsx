/**
 * OpenSpec Modal Component
 * Modal for viewing OpenSpec entities (specs, changes, archives)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import type { OpenSpecEntity, ChangeProposal } from '@/types/openspec';

interface OpenSpecModalProps {
  entity: OpenSpecEntity;
  onClose: () => void;
}

export function OpenSpecModal({ entity, onClose }: OpenSpecModalProps) {
  const [content, setContent] = useState<{
    proposal?: string;
    design?: string;
    tasks?: string;
  } | string>('');
  const [activeTab, setActiveTab] = useState<'proposal' | 'design' | 'tasks'>('proposal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setError(null);

      try {
        if (entity.type === 'spec') {
          // Fetch spec content
          const response = await fetch(`/api/openspec/spec/${entity.id}`);
          if (!response.ok) throw new Error('Failed to fetch spec');

          const data = await response.json();
          setContent(data.content || '');
        } else if (entity.type === 'change' || entity.type === 'archive') {
          // Fetch change content (proposal, design, tasks)
          const basePath = entity.type === 'change' ? 'change' : 'archive';
          const response = await fetch(`/api/openspec/${basePath}/${entity.id}`);
          if (!response.ok) throw new Error('Failed to fetch change');

          const data = await response.json();
          setContent({
            proposal: data.proposal || '',
            design: data.design || '',
            tasks: data.tasks || '',
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [entity]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isMultiFile = typeof content === 'object';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {entity.type === 'spec' ? '📋' : entity.type === 'archive' ? '📦' : '🔄'}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white dark:text-white">{entity.name}</h2>
              <p className="text-sm text-gray-400 dark:text-gray-400">{entity.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs (for changes/archives) */}
        {isMultiFile && (
          <div className="flex gap-2 px-6 py-3 border-b border-gray-700 dark:border-gray-700 bg-gray-900/50 dark:bg-gray-900/50">
            <button
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeTab === 'proposal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('proposal')}
            >
              Proposal
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeTab === 'design'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('design')}
            >
              Design
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-900/50 dark:bg-gray-900/50">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400 dark:text-gray-400">Loading...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400">Error: {error}</div>
            </div>
          )}

          {!loading && !error && (
            <MarkdownRenderer
              content={isMultiFile ? content[activeTab] || '' : content}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-700 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
