# Capability: Agent Coordination

## ADDED Requirements

### Requirement: Hierarchical Agent Relationships

The system SHALL support parent-child relationships between agents to enable coordinated multi-agent workflows.

#### Scenario: Child agent created with parent reference
- **WHEN** a child agent is created via `POST /api/agents` with `parentAgentId` specified
- **THEN** the agent MUST be stored with `parent_agent_id` foreign key referencing the parent
- **AND** the parent agent MUST exist in the database
- **AND** the relationship MUST enforce CASCADE deletion (deleting parent deletes children)

#### Scenario: Agent tree queried
- **WHEN** `GET /api/agents/{id}/tree` is called for an agent
- **THEN** the response MUST include the agent's full hierarchy (all descendants)
- **AND** each node MUST include depth, child count, and completion status
- **AND** aggregate progress percentage MUST be calculated across all descendants

#### Scenario: Coordinator agent type
- **WHEN** an agent is created with `agent_type: 'coordinator'`
- **THEN** the agent MUST be permitted to spawn child agents
- **AND** the agent MUST have access to task decomposition capabilities
- **AND** coordinator agents MUST NOT be allowed to spawn other coordinator agents (max depth limit)

#### Scenario: Tree depth limit enforced
- **WHEN** attempting to create an agent that would exceed maximum tree depth (5 levels)
- **THEN** the system MUST reject the request with 400 Bad Request
- **AND** the error message MUST indicate current depth and maximum depth

#### Scenario: Parent-child lifecycle coordination
- **WHEN** a parent agent is stopped via `POST /api/agents/{id}/stop`
- **THEN** all child agents MUST receive stop signals
- **AND** all descendants MUST transition to "stopped" status
- **AND** the operation MUST complete within 5 seconds

### Requirement: Task Decomposition

The system SHALL enable coordinator agents to analyze complex tasks and generate subtask specifications.

#### Scenario: Task decomposition requested
- **WHEN** `POST /api/agents/{id}/decompose` is called with a task description
- **THEN** the coordinator agent MUST analyze the task using Claude SDK
- **AND** the response MUST include an array of subtasks with id, description, directory, dependencies, tools, and estimated duration
- **AND** the response MUST include a dependency graph (nodes and edges)
- **AND** the decomposition MUST complete within 30 seconds

#### Scenario: Subtask dependencies validated
- **WHEN** subtasks are generated with dependency specifications
- **THEN** the system MUST validate the dependency graph is acyclic (no circular dependencies)
- **AND** if a cycle is detected, the system MUST return 400 Bad Request with the cycle path
- **AND** topological sort MUST determine valid execution order

#### Scenario: Execution batches computed
- **WHEN** subtasks with dependencies are submitted
- **THEN** the system MUST compute execution batches (groups that can run in parallel)
- **AND** each batch MUST only contain subtasks whose dependencies are satisfied by previous batches
- **AND** the batch order MUST be returned in the decompose response

#### Scenario: Subtask specification format
- **WHEN** subtasks are created
- **THEN** each subtask MUST have: unique id, description (string), directory (path), dependencies (array of subtask ids), tools (array of tool names)
- **AND** each subtask SHOULD have: estimatedDuration (number in minutes)
- **AND** directory MUST be within or equal to parent agent's directory scope

### Requirement: Child Agent Spawning

The system SHALL enable coordinator agents to spawn child agents based on subtask specifications.

#### Scenario: Child agents spawned from subtasks
- **WHEN** `POST /api/agents/{id}/children` is called with subtasks array
- **THEN** the system MUST create one child agent per subtask
- **AND** each child MUST have `parent_agent_id` set to coordinator's id
- **AND** each child MUST have `subtask_description` set from subtask description
- **AND** each child MUST be configured with subtask's directory and tools
- **AND** all spawning MUST complete within 5 seconds for 10 agents

#### Scenario: Sequential execution strategy
- **WHEN** orchestration policy specifies `strategy: 'sequential'`
- **THEN** child agents MUST be started one at a time in topologically sorted order
- **AND** each child MUST wait for previous child to complete before starting
- **AND** parent MUST track completion sequentially

#### Scenario: Parallel execution strategy
- **WHEN** orchestration policy specifies `strategy: 'parallel'`
- **THEN** all child agents MUST be started simultaneously
- **AND** parent MUST wait for all children to complete
- **AND** `maxConcurrentChildren` limit MUST be enforced

#### Scenario: Hybrid execution strategy
- **WHEN** orchestration policy specifies `strategy: 'hybrid'`
- **THEN** child agents MUST be started in dependency-aware batches
- **AND** within each batch, agents MUST run in parallel (up to maxConcurrentChildren)
- **AND** next batch MUST wait for previous batch to complete

#### Scenario: Max concurrent children enforced
- **WHEN** more than `maxConcurrentChildren` agents are ready to execute
- **THEN** the system MUST queue excess agents
- **AND** queued agents MUST start as running agents complete
- **AND** the system MUST prioritize critical path tasks

### Requirement: Inter-Agent Event Bus

The system SHALL provide a message bus for event-driven agent coordination.

#### Scenario: Coordination event published
- **WHEN** an agent publishes a coordination event via message bus
- **THEN** the event MUST be persisted to `coordination_events` table
- **AND** the event MUST include: id, agent_id, event_type, payload (JSON), timestamp
- **AND** subscribers MUST be notified within 100ms
- **AND** the event MUST be available for streaming via SSE

#### Scenario: Event subscription by type
- **WHEN** a coordinator subscribes to event type (e.g., `task_completed`)
- **THEN** the coordinator MUST receive all events of that type from any agent
- **AND** events MUST be delivered in chronological order
- **AND** the subscription MUST remain active until unsubscribed or agent terminates

#### Scenario: Event subscription by agent
- **WHEN** an agent subscribes to events from a specific agent ID
- **THEN** the subscriber MUST receive only events from that agent
- **AND** the subscription MUST support filtering by event type
- **AND** events from other agents MUST NOT be delivered

#### Scenario: Event types supported
- **WHEN** agents publish events
- **THEN** the system MUST support event types: `task_started`, `task_completed`, `task_failed`, `output_available`, `dependency_met`, `waiting_for_dependency`, `coordination_timeout`
- **AND** each event type MUST have a defined payload schema
- **AND** custom event types MAY be supported for extensibility

#### Scenario: Event streaming via SSE
- **WHEN** `GET /api/agents/{id}/events?stream=true` is called
- **THEN** the system MUST stream events as Server-Sent Events
- **AND** events MUST be formatted as JSON in SSE data field
- **AND** the stream MUST include historical events before real-time events
- **AND** the stream MUST remain open until client disconnects

### Requirement: Shared Context

The system SHALL provide shared memory for agents in a hierarchy to exchange data.

#### Scenario: Context value stored
- **WHEN** an agent stores a value in shared context via `sharedContext.set(key, value)`
- **THEN** the value MUST be persisted to `shared_context` table
- **AND** the entry MUST be scoped to the parent_agent_id (top-level ancestor)
- **AND** the value MUST be serialized as JSON
- **AND** duplicate keys MUST update existing entry with new value and updated timestamp

#### Scenario: Context value retrieved
- **WHEN** an agent retrieves a value via `sharedContext.get(key)`
- **THEN** the system MUST return the value from shared context table
- **AND** the value MUST be deserialized from JSON
- **AND** if key does not exist, NULL MUST be returned
- **AND** retrieval MUST complete within 100ms

#### Scenario: All context retrieved
- **WHEN** an agent calls `sharedContext.getAll()`
- **THEN** the system MUST return all key-value pairs for the agent tree
- **AND** the result MUST be a JSON object with all keys and values
- **AND** the operation MUST complete within 200ms

#### Scenario: Context cleanup on completion
- **WHEN** a parent agent completes (all children finished)
- **THEN** the system SHOULD delete all shared_context entries for that parent_agent_id
- **AND** cleanup MUST be asynchronous (not block completion)
- **AND** cleanup MUST log any errors but not fail agent completion

#### Scenario: Context isolated by tree
- **WHEN** multiple coordinator agents are running
- **THEN** each coordinator's shared context MUST be isolated
- **AND** children MUST only access their parent tree's context
- **AND** context from other agent trees MUST NOT be accessible

### Requirement: Orchestration Policies

The system SHALL support configurable execution strategies and failure handling.

#### Scenario: Orchestration policy defined
- **WHEN** a coordinator agent is created with orchestrationPolicy
- **THEN** the policy MUST include: strategy ('sequential', 'parallel', 'hybrid'), maxConcurrentChildren (number)
- **AND** the policy SHOULD include: retryOnFailure (boolean), maxRetries (number), coordinationTimeout (seconds), failFast (boolean)
- **AND** default values MUST be applied for missing fields

#### Scenario: Retry on failure enabled
- **WHEN** a child agent fails and `retryOnFailure: true` in policy
- **THEN** the coordinator MUST respawn the failed agent automatically
- **AND** the retry count MUST be tracked per subtask
- **AND** if retries exceed `maxRetries`, the coordinator MUST pause for user intervention
- **AND** a `task_failed` event MUST be published with retry information

#### Scenario: Fail-fast enabled
- **WHEN** a child agent fails and `failFast: true` in policy
- **THEN** the coordinator MUST immediately stop all running children
- **AND** queued agents MUST NOT be started
- **AND** the coordinator MUST transition to "failed" status
- **AND** user MUST be notified of failure

#### Scenario: Coordination timeout enforced
- **WHEN** a child agent waits for dependency longer than `coordinationTimeout`
- **THEN** the system MUST publish a `coordination_timeout` event
- **AND** the waiting agent MUST transition to "paused" status
- **AND** the coordinator MUST pause execution
- **AND** user MUST be able to manually resolve or skip dependency

#### Scenario: Rate limiting across tree
- **WHEN** multiple child agents are running concurrently
- **THEN** the system MUST track total active API requests across entire tree
- **AND** if global rate limit is reached, new agents MUST be queued
- **AND** queued agents MUST start as capacity becomes available
- **AND** rate limit tracking MUST account for all agents in hierarchy

## MODIFIED Requirements

### Requirement: Agent Persistence

The system SHALL persist agent hierarchies and coordination state to SQLite database.

#### Scenario: Parent agent ID stored
- **WHEN** an agent with parent_agent_id is created
- **THEN** the parent_agent_id MUST be stored in agents table
- **AND** the foreign key constraint MUST reference agents(id)
- **AND** CASCADE deletion MUST be configured

#### Scenario: Agent type stored
- **WHEN** an agent is created
- **THEN** the agent_type ('standard' or 'coordinator') MUST be stored
- **AND** default value MUST be 'standard'
- **AND** the field MUST be indexed for efficient filtering

#### Scenario: Subtask description stored
- **WHEN** a child agent is spawned from subtask
- **THEN** the subtask_description MUST be stored in agents table
- **AND** the description MUST be accessible when retrieving agent details

#### Scenario: Coordination state persisted
- **WHEN** a coordinator's orchestration state changes (subtasks completed, failed, etc.)
- **THEN** the coordination_state MUST be updated in agents table as JSON
- **AND** the state MUST include: subtasks array, completedSubtasks, failedSubtasks, activeSubtasks, orchestrationPolicy

### Requirement: Agent Lifecycle Control

The system SHALL coordinate agent lifecycle operations across hierarchies.

#### Scenario: Tree-wide stop operation
- **WHEN** `POST /api/agents/{id}/tree/stop` is called
- **THEN** the parent agent MUST transition to "stopping" state
- **AND** all descendant agents MUST receive stop signals
- **AND** all agents MUST transition to "stopped" when operation completes
- **AND** the operation MUST complete within 10 seconds

#### Scenario: Retry failed subtasks
- **WHEN** `POST /api/agents/{id}/tree/retry` is called
- **THEN** the system MUST identify all failed child agents
- **AND** each failed agent MUST be respawned with same configuration
- **AND** retry count MUST be incremented
- **AND** new agent IDs MUST be generated (old agents remain in history)
