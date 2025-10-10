# Implementation Tasks - Phase 2: Multi-Agent Orchestration

## 1. Type System Extensions

- [x] 1.1 Add `AgentName` type (auto-generated + editable)
- [x] 1.2 Add `ToolPermission` type and `ToolPermissionPreset` enum
- [x] 1.3 Add `AgentLifecycleState` enum (running, paused, stopped, error)
- [x] 1.4 Extend `AgentSession` with `name`, `toolPermissions`, `lifecycleState` fields
- [x] 1.5 Add `AgentMetrics` type (elapsed time, message count, last activity)

## 2. Session Manager Refactor

- [x] 2.1 Remove single-agent enforcement (delete `currentAgentId`, `terminateSession` on spawn)
- [x] 2.2 Add `activeAgents: Map<string, AgentSession>` for concurrent tracking
- [x] 2.3 Implement `pauseAgent(id: string)` method
- [x] 2.4 Implement `resumeAgent(id: string)` method
- [x] 2.5 Implement `stopAgent(id: string)` method (graceful shutdown)
- [x] 2.6 Add `getAllActiveAgents()` method
- [x] 2.7 Add `getAgentMetrics(id: string)` method
- [x] 2.8 Update `createSession()` to accept `name` and `toolPermissions` parameters

## 3. SDK Wrapper Enhancements

- [x] 3.1 Support multiple concurrent `query()` instances (one per agent)
- [ ] 3.2 Store query generator instances per agent ID
- [ ] 3.3 Implement pause via generator suspension (store last yielded value)
- [ ] 3.4 Implement resume via generator continuation
- [x] 3.5 Pass `toolPermissions` to SDK query options
- [ ] 3.6 Add cleanup for stopped agents (close streams, clear references)
- [ ] 3.7 Handle agent errors during lifecycle transitions

## 4. Tool Permission System

- [x] 4.1 Define tool permission presets (read-only, standard, full-access)
- [x] 4.2 Create tool allowlist validation function
- [x] 4.3 Map permission preset to SDK tool configuration
- [x] 4.4 Store permissions in agent session metadata
- [ ] 4.5 Validate tool usage against permissions during streaming

## 5. API Routes - New Endpoints

- [x] 5.1 Create `/api/agents` (GET) - list all active agents
- [x] 5.2 Create `/api/agents/[id]/pause` (POST) - pause agent
- [x] 5.3 Create `/api/agents/[id]/resume` (POST) - resume agent
- [x] 5.4 Create `/api/agents/[id]/stop` (POST) - stop agent
- [x] 5.5 Create `/api/agents/[id]/restart` (POST) - restart with same config
- [x] 5.6 Create `/api/agents/[id]/rename` (PUT) - update agent name

## 6. API Routes - Modified Endpoints

- [x] 6.1 Update `/api/agents/spawn` to accept `name` parameter (optional)
- [x] 6.2 Update `/api/agents/spawn` to accept `toolPermissions` parameter
- [x] 6.3 Update `/api/agents/[id]/status` to include lifecycle state and metrics
- [ ] 6.4 Update `/api/agents/[id]/stream` to support paused state (queue messages)

## 7. Agent Naming System

- [x] 7.1 Create `generateAgentName()` utility (e.g., "Agent Bold Lion", "Agent Clever Leopard")
- [x] 7.2 Validate user-provided names (max length, allowed characters)
- [x] 7.3 Ensure name uniqueness across active agents
- [ ] 7.4 Display auto-generated names with edit icon
- [ ] 7.5 Implement inline name editing in UI

## 8. State Management

- [ ] 8.1 Create React Context for active agents (`ActiveAgentsContext`)
- [ ] 8.2 Create `useActiveAgents()` hook for accessing context
- [ ] 8.3 Implement agent state synchronization (poll or SSE)
- [ ] 8.4 Add optimistic updates for lifecycle actions
- [ ] 8.5 Handle concurrent state updates gracefully

## 9. New UI Components

- [ ] 9.1 Create `AgentCard` component
  - Display: name, status badge, directory, message count, elapsed time
  - Actions: pause/resume/stop buttons
  - Hover: show full prompt preview
  - Click: expand full output
- [ ] 9.2 Create `ActiveAgentsDashboard` component
  - Grid layout (desktop): 2-3 columns
  - Vertical carousel (mobile)
  - Empty state: "No active agents"
  - Sort/filter options
- [ ] 9.3 Create `AgentControls` component
  - Pause/resume/stop/restart buttons
  - Disabled states based on lifecycle
  - Loading indicators
- [ ] 9.4 Create `ToolPermissionsForm` component
  - Preset selector (read-only, standard, full-access, custom)
  - Custom: checkboxes for each tool
  - Tool descriptions on hover
  - Warning for dangerous tools (Bash, Write, Edit)
- [ ] 9.5 Create `AgentSelector` component
  - Dropdown to switch between agents
  - Shows agent name and status
  - Used in expanded output view

## 10. Modified UI Components

- [ ] 10.1 Update `AgentSpawnForm` to include name input (optional, placeholder: "Auto-generate")
- [ ] 10.2 Update `AgentSpawnForm` to include `ToolPermissionsForm`
- [ ] 10.3 Update `AgentOutputStream` to show agent selector when viewing specific agent
- [ ] 10.4 Update `AgentOutputStream` to handle paused state (show "Agent paused" banner)
- [ ] 10.5 Update `AgentHistoryList` to distinguish active vs historical agents

## 11. Dashboard Layout Redesign

- [ ] 11.1 Replace two-column layout with card grid
- [ ] 11.2 Position spawn form as floating action button (FAB) or top-right drawer
- [ ] 11.3 Implement expanded view (click card → full-screen output + controls)
- [ ] 11.4 Add "collapse" button to return to dashboard
- [ ] 11.5 Implement mobile-responsive card layout (1 column stack)
- [ ] 11.6 Add keyboard shortcuts (Esc to collapse, numbers 1-9 to select agents)

## 12. Custom Hooks

- [ ] 12.1 Create `useAgentLifecycle()` hook
  - Methods: pause, resume, stop, restart
  - Loading states per action
  - Error handling
- [ ] 12.2 Update `useAgentStream()` to support agent switching
- [ ] 12.3 Create `useAgentMetrics()` hook for real-time metrics
- [ ] 12.4 Create `useToolPermissions()` hook for permission management

## 13. Real-time Updates

- [ ] 13.1 Implement SSE endpoint for active agents list updates
- [ ] 13.2 Update agent cards in real-time (status, metrics)
- [ ] 13.3 Handle agent completion notifications
- [ ] 13.4 Show toast notifications for lifecycle events
- [ ] 13.5 Implement connection recovery for SSE

## 14. Resource Management UI

- [ ] 14.1 Add agent counter to header ("5 active agents")
- [ ] 14.2 Show warning when 10+ agents are active
- [ ] 14.3 Add "Stop All Agents" button (with confirmation)
- [ ] 14.4 Display memory/CPU warnings (if detectable)
- [ ] 14.5 Implement "Clear Completed" action (remove stopped agents from view)

## 15. Error Handling

- [ ] 15.1 Handle pause failures (agent already paused, agent completed)
- [ ] 15.2 Handle resume failures (agent not paused, agent errored)
- [ ] 15.3 Handle stop failures (agent already stopped)
- [ ] 15.4 Handle tool permission violations (show which tool was blocked)
- [ ] 15.5 Display lifecycle errors in agent card with retry option

## 16. Testing - Backend

- [ ] 16.1 Test spawning 5 concurrent agents with different directories
- [ ] 16.2 Test pause/resume cycle for single agent
- [ ] 16.3 Test stopping agent while running
- [ ] 16.4 Test restarting agent with same configuration
- [ ] 16.5 Test tool permission enforcement (block unauthorized tools)
- [ ] 16.6 Test session cleanup after agent stop

## 17. Testing - Frontend

- [ ] 17.1 Test dashboard card layout with 1, 5, 10, 20 agents
- [ ] 17.2 Test expanding/collapsing agent view
- [ ] 17.3 Test lifecycle controls from agent card
- [ ] 17.4 Test tool permissions form (presets + custom)
- [ ] 17.5 Test agent naming (auto-generate + edit)
- [ ] 17.6 Test mobile responsive layout with multiple agents

## 18. Testing - Integration

- [ ] 18.1 Test concurrent streaming from multiple agents
- [ ] 18.2 Test pausing one agent while others run
- [ ] 18.3 Test stopping multiple agents simultaneously
- [ ] 18.4 Test spawning agent while others are paused
- [ ] 18.5 Test agent name conflicts and uniqueness
- [ ] 18.6 Test history integration (stopped agents appear in history)

## 19. Performance Optimization

- [ ] 19.1 Implement virtual scrolling for agent list (if 50+ agents)
- [ ] 19.2 Debounce metrics updates (update every 2 seconds max)
- [ ] 19.3 Lazy load agent outputs (only fetch when expanded)
- [ ] 19.4 Implement message pagination for long-running agents
- [ ] 19.5 Add performance monitoring (track render times, memory usage)

## 20. Documentation

- [ ] 20.1 Update README with multi-agent examples
- [ ] 20.2 Document tool permission presets and recommendations
- [ ] 20.3 Add lifecycle control usage guide
- [ ] 20.4 Document keyboard shortcuts
- [ ] 20.5 Add troubleshooting section for common multi-agent issues
- [ ] 20.6 Update architecture diagrams for multi-agent flow
