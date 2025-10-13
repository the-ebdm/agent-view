'use client';

import React from 'react';
import type { TodoItem } from '@/types/agent';

interface TodoListViewProps {
  todos: TodoItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Displays agent todos in a collapsible list with progress tracking.
 *
 * Shows real-time task status with visual indicators:
 * - ✅ Completed tasks (green)
 * - 🔧 In-progress tasks (blue/yellow, with activeForm)
 * - ⭕ Pending tasks (gray)
 *
 * Includes a progress bar and completion percentage.
 */
export function TodoListView({ todos, isCollapsed, onToggleCollapse }: TodoListViewProps) {
  if (todos.length === 0) {
    return null;
  }

  const completed = todos.filter((todo) => todo.status === 'completed').length;
  const total = todos.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allCompleted = completed === total;

  // Status icon mapping
  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔧';
      case 'pending':
        return '⭕';
    }
  };

  return (
    <section
      aria-label="Agent task list"
      className="mx-3 mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50"
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        className="w-full px-3 py-2 sm:py-2 md:py-2 min-h-[44px] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">📋</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Tasks: {completed}/{total} completed {allCompleted && '✨'}
          </span>
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-xs">
          {isCollapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* Expanded Todo List */}
      {!isCollapsed && (
        <div className="px-2 sm:px-3 pb-2 sm:pb-3 transition-all duration-200">
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 transition-all duration-300"
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
              {percentage}% complete
            </div>
          </div>

          {/* Todo List */}
          <ul role="list" className="space-y-2">
            {todos.map((todo, index) => {
              const isInProgress = todo.status === 'in_progress';
              const displayText = isInProgress ? todo.activeForm : todo.content;

              return (
                <li
                  key={`${todo.content}-${index}`}
                  role="listitem"
                  aria-label={`${todo.content}, ${todo.status.replace('_', ' ')}`}
                  className={`flex items-start gap-2 text-sm transition-all duration-200 ${
                    isInProgress
                      ? 'font-semibold text-blue-700 dark:text-blue-400'
                      : todo.status === 'completed'
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      isInProgress ? 'animate-pulse' : ''
                    }`}
                  >
                    {getStatusIcon(todo.status)}
                  </span>
                  <span className="flex-1 break-words">{displayText}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
