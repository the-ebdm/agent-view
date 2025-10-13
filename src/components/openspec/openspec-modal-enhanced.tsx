/**
 * Enhanced OpenSpec Modal Component
 * Includes editor, validation, task checklist, and slash commands
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import { MarkdownEditor } from './markdown-editor';
import { TaskChecklist } from './task-checklist';
import { ValidationIndicator, ValidationStatus } from './validation-indicator';
import { ApplyChangeButton, ArchiveChangeButton } from './slash-command-button';
import type { OpenSpecEntity, ChangeProposal, ValidationError } from '@/types/openspec';

interface OpenSpecModalProps {
  entity: OpenSpecEntity;
  onClose: () => void;
  onUpdate?: () => void;
  projectDirectory?: string;
}

type ViewMode = 'view' | 'edit';
type TabType = 'proposal' | 'design' | 'tasks' | 'content';

export function OpenSpecModalEnhanced({ entity, onClose, onUpdate, projectDirectory }: OpenSpecModalProps) {
  const [content, setContent] = useState<{
    proposal?: string;
    design?: string;
    tasks?: string;
  } | string>('');
  const [activeTab, setActiveTab] = useState<TabType>(
    entity.type === 'spec' ? 'content' : 'proposal'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Validation state
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('pending');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const isMultiFile = typeof content === 'object';
  const isChange = entity.type === 'change';
  const changeEntity = entity as ChangeProposal;

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setError(null);

      try {
        // Build URL with directory parameter
        const params = new URLSearchParams();
        if (projectDirectory) {
          params.set('directory', projectDirectory);
        }
        const queryString = params.toString() ? `?${params.toString()}` : '';

        if (entity.type === 'spec') {
          const response = await fetch(`/api/openspec/spec/${entity.id}${queryString}`);
          if (!response.ok) throw new Error('Failed to fetch spec');

          const data = await response.json();
          setContent(data.content || '');
        } else if (entity.type === 'change' || entity.type === 'archive') {
          const basePath = entity.type === 'change' ? 'change' : 'archive';
          const response = await fetch(`/api/openspec/${basePath}/${entity.id}${queryString}`);
          if (!response.ok) throw new Error('Failed to fetch change');

          const data = await response.json();
          setContent({
            proposal: data.proposal || '',
            design: data.design || '',
            tasks: data.tasks || '',
          });

          // Initialize validation status for changes
          if (entity.type === 'change') {
            setValidationStatus((changeEntity as ChangeProposal).validationStatus);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [entity, projectDirectory]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && viewMode === 'view') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewMode]);

  // Handle content update
  const handleContentChange = useCallback((newContent: string) => {
    if (isMultiFile) {
      setContent(prev => ({
        ...(prev as any),
        [activeTab]: newContent,
      }));
    } else {
      setContent(newContent);
    }
  }, [activeTab, isMultiFile]);

  // Handle save
  const handleSave = useCallback(async (contentToSave: string) => {
    setIsSaving(true);

    try {
      const endpoint = entity.type === 'spec'
        ? `/api/openspec/spec/${entity.id}`
        : `/api/openspec/change/${entity.id}`;

      const body = entity.type === 'spec'
        ? { content: contentToSave, directory: projectDirectory }
        : { content: contentToSave, file: activeTab, directory: projectDirectory };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save');

      onUpdate?.();
    } catch (err: any) {
      console.error('Save error:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [entity, activeTab, onUpdate, projectDirectory]);

  // Handle validation
  const handleValidate = useCallback(async () => {
    if (!isChange) return;

    setValidationStatus('validating');

    try {
      const response = await fetch(`/api/openspec/validate/${entity.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Validation failed');

      const result = await response.json();
      setValidationStatus(result.valid ? 'valid' : 'invalid');
      setValidationErrors(result.errors || []);
    } catch (err: any) {
      setValidationStatus('invalid');
      setValidationErrors([{ message: err.message || 'Validation error', severity: 'error' }]);
    }
  }, [entity, isChange]);

  // Get current tab content
  const getCurrentContent = useCallback((): string => {
    if (isMultiFile) {
      return (content as any)[activeTab] || '';
    }
    return content as string;
  }, [content, activeTab, isMultiFile]);

  // Render content area
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400">Error: {error}</div>
        </div>
      );
    }

    // Task checklist for tasks tab
    if (activeTab === 'tasks' && isMultiFile) {
      const tasksContent = (content as any).tasks || '';

      if (viewMode === 'edit') {
        return (
          <MarkdownEditor
            content={tasksContent}
            onChange={handleContentChange}
            onSave={handleSave}
            validationStatus={validationStatus}
            validationErrors={validationErrors}
            onValidate={handleValidate}
          />
        );
      } else {
        return (
          <TaskChecklist
            content={tasksContent}
            onChange={handleContentChange}
            onSave={handleSave}
            showProgress
          />
        );
      }
    }

    // Editor mode
    if (viewMode === 'edit') {
      return (
        <MarkdownEditor
          content={getCurrentContent()}
          onChange={handleContentChange}
          onSave={handleSave}
          validationStatus={isChange ? validationStatus : undefined}
          validationErrors={isChange ? validationErrors : undefined}
          onValidate={isChange ? handleValidate : undefined}
        />
      );
    }

    // View mode
    return <MarkdownRenderer content={getCurrentContent()} />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 p-4"
      onClick={viewMode === 'view' ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {entity.type === 'spec' ? '📋' : entity.type === 'archive' ? '📦' : '🔄'}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{entity.name}</h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{entity.id}</p>
                {isChange && (
                  <ValidationIndicator
                    status={validationStatus}
                    errorCount={validationErrors.length}
                    compact
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit/View toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'view' ? 'edit' : 'view')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {viewMode === 'edit' ? '👁️ View' : '✏️ Edit'}
            </button>

            {/* Validate button (for changes) */}
            {isChange && viewMode === 'view' && (
              <button
                onClick={handleValidate}
                disabled={validationStatus === 'validating'}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validationStatus === 'validating' ? '⏳ Validating...' : '✓ Validate'}
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs (for multi-file entities) */}
        {isMultiFile && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex gap-2">
              <TabButton
                active={activeTab === 'proposal'}
                onClick={() => setActiveTab('proposal')}
              >
                Proposal
              </TabButton>
              <TabButton
                active={activeTab === 'design'}
                onClick={() => setActiveTab('design')}
              >
                Design
              </TabButton>
              <TabButton
                active={activeTab === 'tasks'}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </TabButton>
            </div>

            {/* Slash command buttons (for changes only) */}
            {isChange && viewMode === 'view' && (
              <div className="flex gap-2">
                <ApplyChangeButton
                  changeId={entity.id}
                  variant="secondary"
                  onSuccess={() => {
                    onUpdate?.();
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Apply</span>
                  </span>
                </ApplyChangeButton>

                {changeEntity.status === 'completed' && (
                  <ArchiveChangeButton
                    changeId={entity.id}
                    onSuccess={() => {
                      onUpdate?.();
                      onClose();
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>📦</span>
                      <span>Archive</span>
                    </span>
                  </ArchiveChangeButton>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-hidden ${viewMode === 'edit' ? '' : 'overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-900/50'}`}>
          {renderContent()}
        </div>

        {/* Footer (view mode only) */}
        {viewMode === 'view' && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tab button component
 */
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
