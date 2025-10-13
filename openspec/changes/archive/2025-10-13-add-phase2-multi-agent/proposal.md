# Proposal: Phase 2 - Multi-Agent Orchestration

## Why

Phase 1 established the foundation for managing a single Claude Code agent through a web interface. However, modern development workflows often require multiple simultaneous tasks:

- Running tests while implementing features
- Monitoring production issues while developing fixes
- Researching documentation while coding
- Managing multiple projects/directories simultaneously

**Current Limitations:**
- Only one agent can run at a time (spawning new agent terminates the previous)
- No control over agent lifecycle (can't pause or resume)
- All agents get full tool access (no permission customization)
- Dashboard only shows one agent's output at a time

**User Pain Points:**
- Developers lose context when switching between tasks
- Cannot monitor multiple long-running tasks simultaneously
- No way to temporarily pause an agent without terminating it
- Security risk: all agents have full filesystem/bash access

## What Changes

Extend Agent View to support **unlimited concurrent agents** with full lifecycle control, granular tool permissions, and a dashboard-style UI for monitoring multiple agents.

### Core Capabilities

1. **Multi-Agent Orchestration**
   - Spawn unlimited concurrent agents (manual resource management)
   - Each agent operates independently in its assigned directory
   - Auto-generated names (editable by user)
   - Independent streaming connections per agent

2. **Agent Lifecycle Control**
   - **Pause**: Temporarily suspend agent execution (preserves state)
   - **Resume**: Continue paused agent from where it stopped
   - **Stop**: Terminate agent permanently (moves to history)
   - **Restart**: Stop and spawn new agent with same configuration

3. **Tool Permission Management**
   - Per-agent tool allowlist configuration at spawn time
   - Available tools: Read, Write, Edit, Bash, Grep, Glob, Task, WebFetch, WebSearch
   - Default preset: "Standard" (Read, Grep, Glob, WebFetch - safe tools)
   - Presets: Read-Only, Standard, Full Access, Custom

4. **Dashboard Card UI**
   - Grid layout showing all active agents as cards
   - Each card shows: name, status, directory, message count, elapsed time
   - Click card to expand full output view
   - Mobile: vertical carousel of agent cards
   - Quick actions on cards: pause/resume/stop buttons

### Technical Approach

**Backend:**
- Refactor `AgentSessionManager` to remove single-agent enforcement
- Add `activeAgents: Map<string, AgentSession>` tracking
- Implement lifecycle state machine (running → paused → resumed → stopped)
- Store tool permissions in session metadata
- Add lifecycle control API endpoints

**Frontend:**
- New dashboard card layout with grid
- New components: `AgentCard`, `AgentControls`, `ToolPermissionsForm`, `ActiveAgentsDashboard`
- Modified: `AgentSpawnForm` (add name + permissions), `AgentOutputStream` (agent selector)
- React Context for active agents state sharing

**SDK Integration:**
- Support multiple concurrent `query()` instances
- Implement pause/resume via generator control
- Pass tool permissions to SDK via options
- Handle cleanup for stopped agents

## Impact

### New Specs
- `multi-agent-orchestration` - Concurrent agent management, naming, resource tracking
- `agent-lifecycle-control` - Pause, resume, stop, restart operations
- `tool-permissions` - Per-agent tool allowlist configuration
- `dashboard-ui` - Card-based multi-agent display and interaction

### Modified Specs
- `agent-management` (Phase 1) - Remove single-agent enforcement requirement
- `streaming-output` (Phase 1) - Update to support agent switching

### Breaking Changes
- **Session Manager API**: `createSession()` now returns session without terminating existing
- **Spawn API**: `/api/agents/spawn` accepts new fields: `name`, `toolPermissions`
- **UI Layout**: Dashboard changes from two-column to card grid layout

### Migration Path
1. Existing single-agent code continues to work (Phase 1 remains functional)
2. New multi-agent features are opt-in (default behavior: one agent)
3. Old history compatible with new system (no data migration needed)

### Risks
- **Performance**: Multiple concurrent agents may impact browser/server performance
  - Mitigation: Manual resource management, user controls agent count
- **Complexity**: More complex UI and state management
  - Mitigation: Clear visual hierarchy, dashboard cards simplify monitoring
- **SDK Limitations**: Claude Agent SDK may not support all lifecycle operations
  - Mitigation: Implement pause/resume via generator control, graceful degradation

### Success Metrics
- Can spawn and run 5+ agents concurrently without issues
- Pause/resume works within 2 seconds
- Tool permissions properly enforced (blocked tools return errors)
- Dashboard remains responsive with 10+ agents
- Mobile UI usable with 3+ active agents
