# Design: Agent Todo List View

## Architectural Overview

This change introduces a **client-side todo list parser and renderer** that extracts todo data from the existing agent message stream and displays it in a structured UI component within the agent interaction modal.

## Design Principles

1. **Stream-based parsing** - Leverage existing message stream infrastructure, no new API endpoints
2. **Progressive enhancement** - Gracefully degrade if TodoWrite data is malformed or absent
3. **Mobile-first** - Optimize for small screens with collapsible, compact design
4. **Zero backend changes** - Purely UI enhancement, backend remains unchanged
5. **Real-time updates** - Reflect todo state changes as they stream from the SDK

## Component Architecture

### 1. Todo List View Component

**File:** `src/components/features/agent-todo-list.tsx`

```typescript
interface TodoItem {
  content: string;        // "Run tests"
  activeForm: string;     // "Running tests"
  status: 'pending' | 'in_progress' | 'completed';
}

interface TodoListViewProps {
  todos: TodoItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function TodoListView(props: TodoListViewProps): JSX.Element
```

**Responsibilities:**
- Render todo list with status icons
- Show progress bar (X/Y completed)
- Handle collapse/expand toggle
- Display "in progress" todo with `activeForm` text
- Render empty state when no todos

**UI States:**
- **No todos:** Component doesn't render (null)
- **Has todos, expanded:** Full list visible with progress bar
- **Has todos, collapsed:** Just progress summary "3/5 completed" with expand button

### 2. Todo State Hook

**File:** `src/hooks/use-agent-todos.ts`

```typescript
export function useAgentTodos(agentId: string): {
  todos: TodoItem[];
  progress: { completed: number; total: number };
  hasTodos: boolean;
}
```

**Responsibilities:**
- Subscribe to agent message stream via `useAgentStream`
- Parse `TodoWrite` tool_use messages
- Extract `todos` array from `tool_use.input.todos`
- Maintain current todo list state
- Calculate progress metrics

**Parsing Logic:**
```typescript
// Find latest TodoWrite message in stream
const todoMessages = messages.filter(
  m => m.type === 'tool_use' && m.toolName === 'TodoWrite'
);

// Get most recent todo list
const latestTodo = todoMessages[todoMessages.length - 1];
const todos = latestTodo?.toolParams?.todos ?? [];
```

### 3. Integration with Agent Interaction Modal

**File:** `src/components/features/agent-interaction-modal.tsx` (existing)

**Changes:**
- Import `TodoListView` and `useAgentTodos`
- Add todo section between approval banner and messages area
- Wire up collapse state with localStorage (key: `agent-todo-collapsed`)

**Layout Order:**
1. Header (agent name, status, controls)
2. Approval banner (if pending approvals)
3. **Todo list section** ← NEW
4. Messages area (AgentOutputStream)
5. Input area (collapsible)

## Data Model

### TodoWrite Tool Schema (from SDK)

Based on the SDK documentation and typical usage:

```typescript
// SDK emits tool_use messages like:
{
  type: "tool_use",
  name: "TodoWrite",
  input: {
    todos: [
      {
        content: "Analyze component structure",
        activeForm: "Analyzing component structure",
        status: "completed"
      },
      {
        content: "Implement memoization",
        activeForm: "Implementing memoization",
        status: "in_progress"
      },
      {
        content: "Add virtualization",
        activeForm: "Adding virtualization",
        status: "pending"
      }
    ]
  }
}
```

### Extended AgentMessage Type

**File:** `src/types/agent.ts` (existing)

**Changes:**
```typescript
export interface AgentMessage {
  type: MessageType;
  content: string;
  timestamp: number;
  toolName?: string;
  toolParams?: Record<string, unknown>; // Already exists, contains todos
}
```

**No changes needed** - `toolParams` already captures the todo data.

## UI Design Specifications

### Visual Design

**Icons:**
- ✅ Completed (green)
- 🔧 In Progress (blue/yellow, animated)
- ⭕ Pending (gray)

**Progress Bar:**
- Linear bar showing completion percentage
- Text: "3/5 completed" or "5/5 completed ✨"
- Color gradient: gray → green as progress increases

**Collapse Behavior:**
- Collapsed: Shows only "📋 Tasks: 3/5 completed ▼"
- Expanded: Shows full list with progress bar

### Mobile Optimization

**Constraints:**
- Minimum width: 375px (iPhone SE)
- Touch targets: 44px minimum height
- Font size: 14px for list items, 12px for progress text

**Mobile-specific adjustments:**
- Collapsed by default on < 640px width
- Single column list (no multi-column layout)
- Larger touch target for collapse toggle

### Responsive Breakpoints

```css
/* Desktop (default) */
.todo-list { padding: 1rem; }

/* Tablet */
@media (max-width: 768px) {
  .todo-list { padding: 0.75rem; }
}

/* Mobile */
@media (max-width: 640px) {
  .todo-list { padding: 0.5rem; }
  .todo-list-collapsed { default: true; }
}
```

## State Management

### Local State (Component)

```typescript
// In AgentInteractionModal
const [isTodoCollapsed, setIsTodoCollapsed] = useState(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('agent-todo-collapsed');
    return saved === 'true';
  }
  return false; // Expanded by default on desktop
});
```

### Derived State (Hook)

```typescript
// In useAgentTodos
const todos = useMemo(() => {
  const todoMessages = messages.filter(
    m => m.type === 'tool_use' && m.toolName === 'TodoWrite'
  );

  if (todoMessages.length === 0) return [];

  const latestTodo = todoMessages[todoMessages.length - 1];
  return latestTodo?.toolParams?.todos ?? [];
}, [messages]);
```

## Performance Considerations

### Message Parsing

**Concern:** Filtering messages on every render could be expensive with large message arrays.

**Solution:**
- Use `useMemo` to cache parsed todos
- Only recompute when `messages` array reference changes
- `useAgentStream` already optimizes message updates

### Rendering Large Todo Lists

**Concern:** Agents might create 50+ todo items (unlikely but possible).

**Solution:**
- Initial implementation: Render all items (simple, fast for reasonable sizes)
- Future optimization: Virtualize list if > 20 items (react-window)
- Pagination/grouping: "Show more" button for > 10 items

### Real-time Updates

**Concern:** Todo updates shouldn't cause janky animations or layout shifts.

**Solution:**
- Use CSS transitions for status icon changes
- Avoid full list re-mount, only update changed items
- React keys based on `content` for stable identity

## Error Handling

### Malformed TodoWrite Data

**Scenario:** SDK sends invalid todo structure

**Handling:**
```typescript
try {
  const todos = latestTodo?.toolParams?.todos;
  if (!Array.isArray(todos)) return [];

  // Validate each todo item
  return todos.filter(todo =>
    typeof todo.content === 'string' &&
    typeof todo.activeForm === 'string' &&
    ['pending', 'in_progress', 'completed'].includes(todo.status)
  );
} catch (error) {
  console.warn('Failed to parse todos:', error);
  return []; // Graceful degradation
}
```

### Missing TodoWrite Messages

**Scenario:** Agent never uses TodoWrite tool

**Handling:**
- `hasTodos === false` → Component returns `null`
- Zero UI footprint, no empty state shown

### SDK Version Incompatibility

**Scenario:** SDK changes TodoWrite schema in future version

**Handling:**
- Defensive parsing with optional chaining
- Schema validation before rendering
- Fallback to empty array on parse failure
- Log warning to console for debugging

## Testing Strategy

### Unit Tests

**File:** `src/hooks/use-agent-todos.test.ts`

Test cases:
- Parse todos from TodoWrite messages
- Return empty array when no TodoWrite messages
- Handle malformed todo data gracefully
- Calculate progress correctly
- Update when new TodoWrite messages arrive

**File:** `src/components/features/agent-todo-list.test.tsx`

Test cases:
- Render todo list with all statuses
- Show correct status icons
- Display progress bar with correct percentage
- Toggle collapse/expand
- Handle empty todo array

### Integration Tests

**Scenario:** End-to-end todo display flow
1. Spawn agent with multi-step prompt
2. Wait for agent to emit TodoWrite message
3. Verify todo list appears in modal
4. Verify todos update as agent progresses
5. Verify final state shows all completed

### Manual Testing Checklist

- [ ] Todos display in agent modal
- [ ] Status icons render correctly
- [ ] Progress bar updates in real-time
- [ ] Collapse/expand works
- [ ] Mobile responsive (375px width)
- [ ] Dark mode styling
- [ ] No console errors on parse failures
- [ ] Handles agent with no todos gracefully

## Future Enhancements

### Phase 1 (This Change)
- Basic todo list display
- Real-time updates
- Collapse/expand
- Progress visualization

### Phase 2 (Future)
- Persistent todo history (save final state in agent history)
- Task-based filtering (show only pending/completed)
- Time estimates per task (if SDK provides)

### Phase 3 (Future)
- Task-based agent control (pause at specific task)
- Manual task marking (override agent status)
- Linear integration (sync todos with Linear tasks)

### Phase 4 (Future)
- Cross-agent todo aggregation (project-level view)
- Todo analytics (common task patterns)
- AI-suggested task breakdowns (pre-spawn preview)

## Dependencies

### Internal
- `useAgentStream` hook (existing)
- `AgentInteractionModal` component (existing)
- `AgentMessage` type (existing)

### External
- None (uses existing React, Tailwind CSS)

### SDK Compatibility
- Requires Claude Agent SDK with `TodoWrite` tool
- Compatible with SDK versions: 0.x.x (current)
- No SDK API changes required

## Migration Strategy

**Zero migration required** - This is a purely additive UI change.

- No database schema changes
- No API contract changes
- No breaking changes to existing components
- Feature flag: Not needed (graceful degradation handles absence of todos)

## Rollout Plan

1. **Implement** todo list component and hook
2. **Test** with agents that use TodoWrite tool
3. **Deploy** to production (no feature flag needed)
4. **Monitor** console logs for parsing errors
5. **Gather feedback** from users on todo display usefulness

## Accessibility

### Keyboard Navigation
- Tab: Focus collapse/expand button
- Enter/Space: Toggle collapse
- Tab: Focus through todo items (if needed)

### Screen Readers
- Collapse button: "Expand task list, 3 of 5 completed"
- Todo items: "Task 1, Analyze component structure, completed"
- Progress: "3 of 5 tasks completed"

### ARIA Labels
```html
<section aria-label="Agent task list">
  <button aria-expanded={!isCollapsed}>
    Tasks: {completed}/{total} completed
  </button>
  <ul role="list">
    <li role="listitem" aria-label={`${todo.content}, ${todo.status}`}>
      ...
    </li>
  </ul>
</section>
```

## Security Considerations

**No security concerns** - Todos are read-only display of agent-generated data.

- No user input
- No XSS risk (React escapes content by default)
- No authorization changes
- No sensitive data in todos (agent-generated task descriptions)

## Backwards Compatibility

**Fully backwards compatible:**
- Existing agents without todos: Component doesn't render
- Existing message streams: No changes to stream format
- Old SDK versions: Gracefully degrades if TodoWrite not used
- Agent history: Existing history entries work unchanged
