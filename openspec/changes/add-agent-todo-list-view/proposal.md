# Proposal: Agent Todo List View

## Change ID
`add-agent-todo-list-view`

## Motivation

The Claude Agent SDK includes built-in todo functionality via the `TodoWrite` tool, which agents use to track multi-step tasks and communicate progress. Currently, Agent View does not surface these todos in the UI, leaving users blind to:

1. **Task breakdown** - How agents decompose complex requests into steps
2. **Progress tracking** - Which tasks are pending, in progress, or completed
3. **Current activity** - What the agent is actively working on (via `activeForm`)
4. **Remaining work** - How many steps remain before completion

This creates a significant gap in user experience, especially for long-running agents performing complex multi-step workflows. Users must rely solely on message streams to understand agent progress, which is less structured and harder to scan quickly.

The SDK documentation explicitly demonstrates todo tracking patterns (as shown in the user-provided examples), and the SDK's `TodoWrite` tool is designed to be parsed and displayed by host applications. Agent View should leverage this capability to provide real-time progress visualization.

## User Impact

**Before:** Users viewing an agent working on a complex task like "Optimize my React app performance" must:
- Scroll through message streams to understand what's happening
- Infer progress from tool use messages
- Miss the structured task breakdown the agent creates internally

**After:** Users will see:
- A dedicated todo list section in the agent interaction modal
- Visual progress indicators (✅ completed, 🔧 in progress, ⭕ pending)
- Real-time updates as the agent progresses through tasks
- Completion percentage and current activity status
- Clear visibility into remaining work

## Goals

1. **Display agent todos** in the agent interaction modal UI
2. **Real-time updates** reflecting todo state changes from the SDK
3. **Progress visualization** showing completed/in-progress/pending tasks
4. **Mobile-responsive design** optimized for smartphone monitoring
5. **Minimal UI footprint** - collapsible section that doesn't overwhelm the interface

## Non-Goals

1. **User-editable todos** - Todos remain read-only, agent-managed
2. **Manual todo creation** - Only SDK-generated todos are displayed
3. **Todo history persistence** - Shows only current agent's active todos
4. **Cross-agent todo aggregation** - Each agent's todos are independent
5. **Todo-based agent control** - No ability to pause/skip tasks directly

## Overview

This change adds a new **todo list display component** to the agent interaction modal. It parses `tool_use` messages from the agent stream where `name === "TodoWrite"` and renders the todo data in a structured, collapsible UI section.

### Key Components

1. **TodoListView component** - Displays todos with status icons and progress bar
2. **Message stream parsing** - Extracts `TodoWrite` tool calls from message stream
3. **State management** - Tracks current todo list state per agent
4. **UI integration** - Adds collapsible section to `AgentInteractionModal`

### Data Flow

```
SDK Agent Stream → TodoWrite tool_use → Parse todos → Update state → Render TodoListView
```

### UI Layout

The todo list will appear in the agent interaction modal as a collapsible section positioned between the header and message stream:

```
[Agent Header]
[Approval Banner (if present)]
[Todo List Section] ← NEW (collapsible)
  ├─ Progress: 3/5 completed
  ├─ 1. ✅ Analyze component structure (completed)
  ├─ 2. ✅ Implement memoization (completed)
  ├─ 3. 🔧 Adding virtualization (in progress)
  ├─ 4. ⭕ Optimize image loading (pending)
  └─ 5. ⭕ Review bundle size (pending)
[Messages Area]
[Input Area]
```

## Related Changes

- **Depends on:** None (uses existing message stream infrastructure)
- **Enables future:** Task-based agent control, todo persistence, linear integration
- **Related specs:** `dashboard-ui` (agent modal), `streaming-output` (message parsing)

## Alternatives Considered

### 1. Parse from text messages instead of tool_use
**Rejected:** Fragile, requires text parsing heuristics, breaks if SDK changes message format

### 2. Dedicated /api/agents/{id}/todos endpoint
**Rejected:** Redundant with existing stream, adds complexity, requires state synchronization

### 3. Always-visible (non-collapsible) section
**Rejected:** Takes up too much screen space on mobile, not all agents use todos

### 4. Separate todos tab/view
**Rejected:** Reduces visibility, requires navigation, breaks real-time flow

## Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SDK todo format changes | High | Low | Version-check SDK, graceful degradation |
| Message stream parsing errors | Medium | Low | Defensive parsing, fallback to no todos |
| Performance with many todos | Low | Low | Limit display to 20 items, virtualize if needed |
| Mobile layout space constraints | Medium | Medium | Collapsible by default on mobile |

## Success Metrics

1. **Functional:** Todos display correctly for agents using TodoWrite tool
2. **Performance:** No perceptible lag when rendering 10+ todo items
3. **Mobile:** Todo list is readable and interactive on 375px width screens
4. **Adoption:** Users find todo view useful (qualitative feedback)

## Timeline

- **Spec review:** 1 day
- **Implementation:** 2-3 days
- **Testing:** 1 day
- **Total:** ~1 week

## Open Questions

1. Should the todo section be collapsed or expanded by default?
   - **Proposed:** Expanded when todos exist, hidden when no todos

2. Should we persist collapse state in localStorage?
   - **Proposed:** Yes (following existing pattern for input collapse state)

3. How should we handle agents that never use TodoWrite?
   - **Proposed:** Section doesn't render at all (zero UI footprint)

4. Should we show historical todos after agent completes?
   - **Proposed:** Yes, keep final todo state visible in history view
