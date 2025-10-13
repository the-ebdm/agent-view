'use client';

import { useMemo } from 'react';
import { useAgentStream } from './use-agent-stream';
import type { TodoItem } from '@/types/agent';

interface UseAgentTodosResult {
  todos: TodoItem[];
  progress: {
    completed: number;
    total: number;
  };
  hasTodos: boolean;
}

/**
 * Hook to extract and track agent todos from the message stream.
 *
 * Parses TodoWrite tool_use messages from the agent's message stream
 * and returns the current todo list with progress metrics.
 *
 * @param agentId - The ID of the agent to track todos for
 * @returns Object containing todos array, progress metrics, and hasTodos flag
 */
export function useAgentTodos(agentId: string | null): UseAgentTodosResult {
  const { messages } = useAgentStream(agentId);

  const todos = useMemo(() => {
    try {
      // Find all TodoWrite messages in the stream
      const todoMessages = messages.filter(
        (m) => m.type === 'tool_use' && m.toolName === 'TodoWrite'
      );

      // No TodoWrite messages found
      if (todoMessages.length === 0) {
        return [];
      }

      // Get the most recent todo list (agent may update todos multiple times)
      const latestTodo = todoMessages[todoMessages.length - 1];
      const todosData = latestTodo?.toolParams?.todos;

      // Validate that todos is an array
      if (!Array.isArray(todosData)) {
        console.warn('TodoWrite data is not an array:', todosData);
        return [];
      }

      // Validate and filter todo items
      const validTodos = todosData.filter((todo): todo is TodoItem => {
        // Check that all required fields exist and have correct types
        const hasValidContent = typeof todo?.content === 'string' && todo.content.length > 0;
        const hasValidActiveForm = typeof todo?.activeForm === 'string' && todo.activeForm.length > 0;
        const hasValidStatus = ['pending', 'in_progress', 'completed'].includes(todo?.status);

        if (!hasValidContent || !hasValidActiveForm || !hasValidStatus) {
          console.warn('Malformed todo item:', todo);
          return false;
        }

        return true;
      });

      return validTodos;
    } catch (error) {
      console.warn('Failed to parse todos from message stream:', error);
      return [];
    }
  }, [messages]);

  const progress = useMemo(() => {
    const completed = todos.filter((todo) => todo.status === 'completed').length;
    const total = todos.length;
    return { completed, total };
  }, [todos]);

  const hasTodos = todos.length > 0;

  return { todos, progress, hasTodos };
}
