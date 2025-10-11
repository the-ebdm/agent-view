/**
 * Task Checklist Component
 * Interactive checklist for tasks.md with progress tracking
 */

'use client';

import React, { useState, useMemo } from 'react';
import { parseTasksMarkdown, updateTaskCheckbox } from '@/lib/openspec/parser';
import type { TaskItem } from '@/types/openspec';

interface TaskChecklistProps {
  content: string;
  onChange: (newContent: string) => void;
  onSave?: (content: string) => Promise<void>;
  readOnly?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function TaskChecklist({
  content,
  onChange,
  onSave,
  readOnly = false,
  showProgress = true,
  className = '',
}: TaskChecklistProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Parse tasks from markdown
  const tasks = useMemo(() => parseTasksMarkdown(content), [content]);

  // Calculate progress
  const { completedCount, totalCount, percentage } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedCount: completed,
      totalCount: total,
      percentage: percent,
    };
  }, [tasks]);

  // Handle checkbox toggle
  const handleToggle = async (taskIndex: number) => {
    if (readOnly) return;

    const task = tasks[taskIndex];
    const newChecked = !task.completed;

    // Update markdown content
    const updatedContent = updateTaskCheckbox(content, taskIndex, newChecked);
    onChange(updatedContent);

    // Auto-save if enabled
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(updatedContent);
      } catch (error) {
        console.error('Failed to save task update:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (tasks.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <p className="text-sm">No tasks found in tasks.md</p>
        <p className="text-xs mt-1">Add tasks using the format: <code>- [ ] Task description</code></p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {completedCount}/{totalCount} tasks
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {isSaving && (
            <p className="text-xs text-gray-500 mt-1">Saving...</p>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {tasks.map((task, index) => (
            <TaskItem
              key={task.index}
              task={task}
              onToggle={() => handleToggle(index)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Summary */}
      {showProgress && (
        <div className="px-4 py-2 border-t bg-gray-50 text-center">
          {percentage === 100 ? (
            <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-2">
              <span>✅</span>
              <span>All tasks completed!</span>
            </p>
          ) : (
            <p className="text-xs text-gray-600">
              {totalCount - completedCount} task{totalCount - completedCount !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual task item
 */
interface TaskItemComponentProps {
  task: TaskItem;
  onToggle: () => void;
  readOnly: boolean;
}

function TaskItem({ task, onToggle, readOnly }: TaskItemComponentProps) {
  // Section-based indentation (if task has a section, indent slightly)
  const indentClass = task.section ? 'ml-4' : '';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${indentClass}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        disabled={readOnly}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* Task text */}
      <label
        onClick={readOnly ? undefined : onToggle}
        className={`flex-1 text-sm cursor-pointer select-none ${
          task.completed ? 'line-through text-gray-500' : 'text-gray-800'
        } ${readOnly ? 'cursor-default' : ''}`}
      >
        {task.content}
      </label>

      {/* Section label (for debugging) */}
      {process.env.NODE_ENV === 'development' && task.section && (
        <span className="text-xs text-gray-400 font-mono">
          {task.section}
        </span>
      )}
    </div>
  );
}

/**
 * Compact progress indicator (for cards)
 */
interface TaskProgressIndicatorProps {
  completedCount: number;
  totalCount: number;
  showBar?: boolean;
  className?: string;
}

export function TaskProgressIndicator({
  completedCount,
  totalCount,
  showBar = true,
  className = '',
}: TaskProgressIndicatorProps) {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = percentage === 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-semibold ${isComplete ? 'text-green-600' : 'text-gray-700'}`}>
          {completedCount}/{totalCount}
        </span>
        <span className="text-xs text-gray-500">tasks</span>
      </div>

      {showBar && (
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
        {percentage}%
      </span>
    </div>
  );
}
