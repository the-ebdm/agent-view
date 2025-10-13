# Tasks: Agent Todo List View

## Overview

Implementation tasks for adding a structured todo list display to the agent interaction modal. Tasks are ordered for sequential delivery with user-visible progress at each milestone.

---

## Phase 1: Core Todo Parsing (Foundation)

- [x] 1.1 Create todo types

  - File: `src/types/agent.ts`
  - Add `TodoItem` interface
  - TypeScript compiles without errors
  - User-visible: None (internal type only)

- [x] 1.2 Implement useAgentTodos hook

  - File: `src/hooks/use-agent-todos.ts` (new)
  - Create hook that subscribes to `useAgentStream(agentId)`
  - Parse TodoWrite tool_use messages from message stream
  - Extract todos array from `toolParams.todos`
  - Return `{ todos, progress, hasTodos }`
  - Hook returns empty array when no TodoWrite messages
  - Hook returns todos when TodoWrite messages exist
  - Progress calculation is correct (completed/total)
  - User-visible: None (hook only, no UI)

- [x] 1.3 Add defensive parsing and error handling
  - File: `src/hooks/use-agent-todos.ts`
  - Validate todos array structure
  - Filter out malformed todo items
  - Handle missing/invalid fields gracefully
  - Log warnings for malformed data
  - Return empty array on parse errors
  - Hook handles malformed TodoWrite messages without crashing
  - Console warnings appear for invalid data
  - No errors thrown for missing fields
  - User-visible: None (error handling only)

---

## Phase 2: Todo List Component (UI Foundation)

- [x] 2.1 Create TodoListView component

  - File: `src/components/features/agent-todo-list.tsx` (new)
  - Create functional component with props: `{ todos, isCollapsed, onToggleCollapse }`
  - Implement basic list rendering with map over todos
  - Add status icon rendering (✅ 🔧 ⭕)
  - Style with Tailwind CSS classes
  - Component renders todos with correct icons
  - Component accepts props without TypeScript errors
  - User-visible: Component exists but not yet integrated in modal

- [x] 2.2 Add progress bar and metrics

  - File: `src/components/features/agent-todo-list.tsx`
  - Calculate completed/total counts from todos prop
  - Render progress bar with percentage width
  - Display "X/Y completed" text
  - Add sparkle emoji (✨) when all completed
  - Style progress bar with green/gray colors
  - Progress bar width matches completion percentage
  - Progress text displays correct counts
  - Sparkle appears only when 100% complete
  - User-visible: Progress metrics visible in component

- [x] 2.3 Implement collapse/expand functionality

  - File: `src/components/features/agent-todo-list.tsx`
  - Render collapse button with ▼/▲ indicator
  - Show only progress summary when collapsed
  - Show full todo list when expanded
  - Call `onToggleCollapse` prop on button click
  - Add smooth CSS transitions
  - Collapse button toggles between states
  - Collapsed view shows only summary
  - Expanded view shows full list
  - Transitions are smooth
  - User-visible: Collapse/expand interaction works

- [x] 2.4 Style for dark mode
  - File: `src/components/features/agent-todo-list.tsx`
  - Add `dark:` Tailwind variants for all colors
  - Use `dark:bg-gray-800` for backgrounds
  - Use `dark:text-gray-100` for text
  - Use `dark:border-gray-700` for borders
  - Test in dark mode
  - Component renders correctly in dark mode
  - Text is legible with sufficient contrast
  - No color clashes or broken styling
  - User-visible: Dark mode support complete

---

## Phase 3: Modal Integration (User-Facing Feature)

- [x] 3.1 Integrate TodoListView into AgentInteractionModal

  - File: `src/components/features/agent-interaction-modal.tsx`
  - Import `TodoListView` and `useAgentTodos`
  - Call `useAgentTodos(agent.id)` hook
  - Add todo list section between approval banner and messages area
  - Conditionally render based on `hasTodos`
  - Wire up collapse state with useState
  - Todo list appears in modal when agent has todos
  - Todo list does not appear when agent has no todos
  - Todo list positioned correctly in layout
  - User-visible: **✅ Todo list now visible in agent modal!**

- [x] 3.2 Add localStorage persistence for collapse state

  - File: `src/components/features/agent-interaction-modal.tsx`
  - Load initial collapse state from `localStorage.getItem('agent-todo-collapsed')`
  - Save collapse state on toggle via `localStorage.setItem('agent-todo-collapsed', ...)`
  - Use same pattern as existing input collapse state
  - Collapse state persists across page refreshes
  - Default to expanded on desktop, collapsed on mobile (< 640px)
  - User-visible: Collapse preference remembered

- [x] 3.3 Adjust modal layout spacing
  - File: `src/components/features/agent-interaction-modal.tsx`
  - Add consistent spacing between sections
  - Ensure todo list has proper margins/padding
  - Test layout with and without approval banner
  - Verify no layout shifts when todos appear/disappear
  - Modal sections are evenly spaced
  - No jarring layout shifts
  - Layout looks balanced with all section combinations
  - User-visible: Modal layout feels polished

---

## Phase 4: Mobile Optimization (Responsive Design)

- [x] 4.1 Optimize for mobile screens

  - File: `src/components/features/agent-todo-list.tsx`
  - Add responsive padding (1rem → 0.75rem → 0.5rem)
  - Adjust font sizes for mobile (14px minimum)
  - Increase touch target size for collapse button (44px)
  - Test on 375px width (iPhone SE)
  - Todo list readable on 375px width
  - Touch targets are 44px minimum
  - No horizontal scrolling
  - User-visible: Mobile experience optimized

- [x] 4.2 Default to collapsed on mobile
  - File: `src/components/features/agent-interaction-modal.tsx`
  - Detect screen width in initial state calculation
  - Default to collapsed when `window.innerWidth < 640`
  - Override with localStorage if present
  - Todo list collapsed by default on mobile
  - User can still expand if desired
  - Desktop defaults to expanded
  - User-visible: Mobile UI less cluttered by default

---

## Phase 5: Polish and Refinement (Quality)

- [x] 5.1 Add activeForm display for in-progress todos

  - File: `src/components/features/agent-todo-list.tsx`
  - Check if `todo.status === 'in_progress'`
  - Display `todo.activeForm` instead of `todo.content`
  - Add visual emphasis (bold or highlighted)
  - Keep `content` for completed/pending todos
  - In-progress todos show activeForm text
  - Other todos show content text
  - Visual distinction is clear
  - User-visible: Current task is clearly highlighted

- [x] 5.2 Add smooth transitions for status changes

  - File: `src/components/features/agent-todo-list.tsx`
  - Add CSS transitions for icon changes
  - Add color transitions for status updates
  - Use React keys based on `content` for stable identity
  - Test with rapidly changing todo states
  - Status changes animate smoothly
  - No jarring re-renders
  - List remains stable during updates
  - User-visible: Status updates feel polished

- [x] 5.3 Add ARIA labels and accessibility
  - File: `src/components/features/agent-todo-list.tsx`
  - Add `aria-label="Agent task list"` to section
  - Add `aria-expanded={!isCollapsed}` to collapse button
  - Add `role="list"` to todo list
  - Add `role="listitem"` with descriptive labels to each todo
  - Add keyboard support (Enter/Space for toggle)
  - Screen reader announces section correctly
  - Collapse button state is announced
  - Each todo is announced with status
  - Keyboard navigation works
  - User-visible: Accessible to keyboard/screen reader users

---

## Phase 6: Documentation

- [x] 6.1 Update README with todo list feature

  - File: `README.md`
  - Add section describing todo list feature
  - Add screenshot or GIF showing todos in action
  - Mention SDK TodoWrite tool dependency
  - README accurately describes feature
  - Documentation is clear and helpful
  - User-visible: Feature documented

- [x] 6.2 Add inline code comments
  - Files: `src/hooks/use-agent-todos.ts`, `src/components/features/agent-todo-list.tsx`
  - Add JSDoc comments for hook and component
  - Explain parsing logic and error handling
  - Document props and return values
  - Code is well-commented
  - Intent is clear for future maintainers
  - User-visible: None (code comments)

---

## Task Summary

**Total Tasks:** 22
**Estimated Time:**

- Phase 1 (Foundation): 1 day
- Phase 2 (UI Foundation): 1 day
- Phase 3 (Integration): 0.5 days
- Phase 4 (Mobile): 0.5 days
- Phase 5 (Polish): 0.5 days
- Phase 6 (Docs): 0.5 days
- **Total: ~5 days**

**User-Visible Milestones:**

1. ✅ Phase 3.1 - Todo list appears in modal
2. ✅ Phase 4 - Mobile optimization complete
3. ✅ Phase 5 - Polish and refinements complete

**Dependencies:**

- No external dependencies (uses existing infrastructure)
- No blocking dependencies between phases (sequential execution)

**Parallelizable Work:**

- Phase 6 (Testing) can be done concurrently with Phase 5 (Polish)
- Task 6.1 (README) can be done anytime after Phase 3

**Critical Path:**
1.2 → 2.1 → 3.1 → 3.2 → 6.2
