# Tasks: Agent Collaboration & Task Decomposition

## Phase 1: Data Model & Core Infrastructure

- [ ] Add `parent_agent_id` column to agents table with foreign key constraint
- [ ] Add `agent_type` column (standard, coordinator) to agents table
- [ ] Add `subtask_description` column for child agent task context
- [ ] Add `coordination_state` JSONB column for storing orchestration metadata
- [ ] Create database indexes on parent_agent_id and agent_type
- [ ] Add TypeScript types: `AgentHierarchy`, `Subtask`, `CoordinationEvent`, `OrchestrationPolicy`
- [ ] Implement agent hierarchy queries (get children, get descendants, get tree)
- [ ] Write database migration script

## Phase 2: Inter-Agent Communication

- [ ] Create message bus infrastructure (`lib/agent-coordination/message-bus.ts`)
- [ ] Implement event types: `task_started`, `task_completed`, `output_available`, `error_occurred`
- [ ] Add event publishing methods (emit events with agent context)
- [ ] Add event subscription system (subscribe by event type and/or agent ID)
- [ ] Implement event persistence to database
- [ ] Create shared context manager (`lib/agent-coordination/shared-context.ts`)
- [ ] Add memory-safe context cleanup when agent trees complete
- [ ] Build event streaming API endpoint (`/api/agents/[id]/events`)

## Phase 3: Task Decomposition Logic

- [ ] Create coordinator agent prompt template (analyze task, identify subtasks)
- [ ] Design subtask specification format (JSON schema for subtask definitions)
- [ ] Implement dependency graph builder (`lib/agent-coordination/dependency-graph.ts`)
- [ ] Add DAG validation (detect circular dependencies)
- [ ] Create topological sort for execution ordering
- [ ] Build parallel batching logic (group independent subtasks)
- [ ] Implement coordinator agent wrapper (`lib/agent-sdk/coordinator.ts`)
- [ ] Add child agent spawning method with hierarchy linking

## Phase 4: Orchestration Engine

- [ ] Create orchestration engine (`lib/agent-coordination/orchestration-engine.ts`)
- [ ] Implement sequential execution strategy
- [ ] Implement parallel execution strategy
- [ ] Implement hybrid execution strategy (respects dependencies)
- [ ] Add resource management (max concurrent children configuration)
- [ ] Implement coordination timeouts (configurable wait times)
- [ ] Add failure handling policies (retry, fallback, fail-fast)
- [ ] Create result aggregation logic (collect outputs from children)
- [ ] Implement parent-child lifecycle coordination (stop tree, pause tree)

## Phase 5: API Endpoints

- [ ] Create `/api/agents/[id]/children` GET endpoint (list child agents)
- [ ] Create `/api/agents/[id]/children` POST endpoint (spawn child agent)
- [ ] Create `/api/agents/[id]/tree` GET endpoint (full hierarchy with status)
- [ ] Create `/api/agents/[id]/decompose` POST endpoint (generate subtask plan)
- [ ] Update existing agent create endpoint to support parent_agent_id parameter
- [ ] Add coordination metadata to agent detail responses
- [ ] Implement tree-wide operations (stop all, retry failed)

## Phase 6: UI Components

- [ ] Create `AgentTree` component (collapsible hierarchy view)
- [ ] Add parent/child indicators to `AgentCard`
- [ ] Create `DependencyGraph` component (visual graph with react-flow or d3)
- [ ] Implement aggregate progress indicator (percentage across tree)
- [ ] Build event timeline component (chronological coordination log)
- [ ] Add "Create Coordinator Agent" button/form to dashboard
- [ ] Create subtask review UI (approve/edit decomposition before execution)
- [ ] Add manual intervention controls (retry subtask, spawn additional child)
- [ ] Implement tree view filtering (show only active, show errors, expand all)

## Phase 7: Testing & Documentation

- [ ] Write unit tests for dependency graph (DAG validation, topological sort)
- [ ] Write unit tests for message bus (pub/sub, event filtering)
- [ ] Write integration tests for coordinator spawning child agents
- [ ] Write integration tests for sequential and parallel orchestration
- [ ] Test failure scenarios (child agent errors, timeouts, resource limits)
- [ ] Create example coordinator prompts for common patterns
- [ ] Document coordinator agent API in spec
- [ ] Add UI screenshots to documentation
- [ ] Write user guide for creating hierarchical workflows

## Phase 8: Polish & Optimization

- [ ] Add loading states for tree operations
- [ ] Implement optimistic UI updates for hierarchy changes
- [ ] Add error boundaries for coordination failures
- [ ] Optimize database queries for large agent trees
- [ ] Add telemetry for coordination performance (time to completion, retry rates)
- [ ] Implement tree-level rate limiting (respect API quotas across all children)
- [ ] Add keyboard shortcuts for tree navigation
- [ ] Create demo video showing end-to-end workflow
