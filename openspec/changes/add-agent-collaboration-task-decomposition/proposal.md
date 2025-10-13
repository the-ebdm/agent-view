# Add Agent Collaboration & Task Decomposition

## Why

Agent View currently manages multiple independent Claude agents working on separate tasks, but lacks mechanisms for agents to collaborate on complex, interdependent work. This limits the platform's ability to handle:

1. **Complex multi-step workflows** - Large tasks that require breaking down into coordinated subtasks
2. **Specialized agent roles** - Backend, frontend, testing, and documentation agents working together
3. **Dependency management** - Agents that must wait for or build upon other agents' outputs
4. **Hierarchical task organization** - Parent-child relationships between tasks and agents
5. **Result aggregation** - Combining outputs from multiple specialized agents into coherent deliverables

Many real-world development workflows naturally decompose into specialized concerns:
- Building a feature requires database migrations, API endpoints, UI components, and tests
- Refactoring requires analysis, implementation, test updates, and documentation
- Bug fixing requires reproduction, root cause analysis, fix implementation, and verification

Without collaboration capabilities, developers must manually coordinate these interdependent pieces, losing the automation benefits that multi-agent orchestration should provide.

## What Changes

### 1. Hierarchical Agent Relationships
- **Parent-child linking** - `parent_agent_id` foreign key in agents table
- **Agent hierarchy queries** - API endpoints to fetch agent trees and descendants
- **Coordinator agents** - Special agent type that spawns and manages child agents
- **Subtask tracking** - Associate each child agent with a specific subtask description
- **Visual hierarchy** - Tree/graph view in UI showing agent relationships

### 2. Task Decomposition System
- **Decomposition prompt template** - System prompt for breaking down complex tasks
- **Subtask specification** - Structured format for defining child agent tasks (description, directory, dependencies, tools)
- **Automatic spawning** - Coordinator agents can spawn child agents via new SDK wrapper
- **Dependency graph** - Define which subtasks depend on others (sequential vs parallel execution)
- **Progress aggregation** - Parent agent tracks completion percentage across children

### 3. Inter-Agent Communication
- **Message bus** - Shared communication channel for agent coordination
- **Event publishing** - Agents emit events (task_started, task_completed, output_available, error_occurred)
- **Event subscription** - Agents subscribe to relevant events from dependencies
- **Shared context** - Optional shared memory space for passing data between agents
- **Handoff protocol** - Standardized way for agents to signal completion and pass results

### 4. Orchestration Policies
- **Execution strategies** - Sequential, parallel, or hybrid execution modes
- **Resource management** - Limit concurrent child agents to respect API rate limits
- **Failure handling** - Retry policies, fallback strategies, graceful degradation
- **Coordination timeouts** - Maximum wait times for dependent agents
- **Result validation** - Parent verifies child outputs before proceeding

### 5. UI Enhancements
- **Task tree visualization** - Collapsible tree showing agent hierarchy
- **Dependency graph view** - Visual graph with nodes (agents) and edges (dependencies)
- **Aggregate progress indicators** - Overall completion across agent tree
- **Event timeline** - Chronological view of coordination events
- **Manual intervention controls** - Ability to retry failed subtasks or adjust decomposition

## Impact

### New Capabilities
- `agent-coordination` - Hierarchical agent relationships and task decomposition
- `inter-agent-messaging` - Event bus and shared context for agent communication
- `orchestration-policies` - Configurable execution strategies and failure handling
- `collaboration-ui` - Visualization and controls for multi-agent workflows

### Affected Specs
- `agent-management` - Extend with parent/child relationships and coordinator agents
- `agent-persistence` - Store hierarchy, dependencies, and coordination state
- `agent-lifecycle-control` - Coordinate lifecycle across agent trees
- `streaming-output` - Stream coordination events alongside agent outputs
- `dashboard-ui` - Add hierarchy visualization and aggregate progress views

### Affected Code
- `src/lib/database/schema.ts` - Add parent_agent_id, subtask fields
- `src/types/agent.ts` - Add AgentHierarchy, Subtask, CoordinationEvent types
- `src/lib/agent-sdk/coordinator.ts` - New: Task decomposition and child spawning
- `src/lib/agent-coordination/` - New directory:
  - `message-bus.ts` - Event publishing and subscription
  - `dependency-graph.ts` - Dependency resolution and execution ordering
  - `orchestration-engine.ts` - Execution strategy implementation
  - `shared-context.ts` - Shared memory management
- `src/app/api/agents/[id]/children/route.ts` - New: Spawn and query child agents
- `src/app/api/agents/[id]/events/route.ts` - New: Coordination event streaming
- `src/components/features/agent-tree.tsx` - New: Hierarchical visualization
- `src/components/features/dependency-graph.tsx` - New: Graph visualization
- `src/components/features/agent-card.tsx` - Show parent/child indicators

### Dependencies
- **New**: `dagre` or `elk.js` - Graph layout algorithm for dependency visualization
- **New**: `react-flow` or `d3` - Interactive graph rendering
- **Existing**: Claude Agent SDK (extend usage for coordinator patterns)

### Breaking Changes
- None - purely additive feature set
- Existing standalone agents continue working without modification
- Agent coordination is opt-in via explicit coordinator agent creation

### Migration Path
Not applicable - new functionality only. Existing agents remain independent unless explicitly organized into hierarchies.

## Design Considerations

### Coordinator Agent Pattern
Coordinator agents use a specialized prompt that:
1. Analyzes the high-level task
2. Identifies logical subtasks and their dependencies
3. Generates subtask specifications (description, tools needed, directory scope)
4. Spawns child agents with appropriate configurations
5. Monitors child progress and handles coordination
6. Aggregates results and produces final deliverable

### Event Bus Architecture
- **In-memory for MVP** - Simple pub/sub within Node.js process
- **Message format**: `{ type, agentId, timestamp, payload }`
- **Subscriptions**: Agents register for specific event types from specific agents
- **Persistence**: Log events to database for debugging and replay

### Dependency Resolution
- **DAG validation** - Ensure no circular dependencies
- **Topological sort** - Determine execution order for sequential dependencies
- **Parallel batching** - Group independent tasks for concurrent execution
- **Dynamic re-planning** - Adjust execution based on failures or new information

### User Experience
- **Automatic mode** - User provides high-level task, coordinator handles everything
- **Manual mode** - User explicitly defines subtasks and dependencies
- **Hybrid mode** - Coordinator proposes decomposition, user reviews/edits before execution
- **Transparency** - Always show full agent tree and coordination events
