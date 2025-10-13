# Design: Agent Collaboration & Task Decomposition

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Agent Tree   │  │ Dependency   │  │ Event Timeline       │  │
│  │ View         │  │ Graph        │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                         │
│  /api/agents/{id}/children  /api/agents/{id}/tree               │
│  /api/agents/{id}/events    /api/agents/{id}/decompose          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Orchestration Engine                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Coordinator  │  │ Dependency   │  │ Execution Strategy   │  │
│  │ Agent        │  │ Graph        │  │ (Sequential/Parallel)│  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Message Bus & Context                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ Event Pub/Sub            │  │ Shared Context Store     │    │
│  │ (In-Memory + Persisted)  │  │ (Agent → Agent Data)     │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Agent Execution Layer (SDK)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │Agent 1  │  │Agent 2  │  │Agent 3  │  │Agent 4  │  ...       │
│  │(Parent) │  │(Child)  │  │(Child)  │  │(Child)  │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (SQLite)                           │
│  agents table: id, parent_agent_id, agent_type, subtask_desc    │
│  coordination_events: event_type, agent_id, payload, timestamp  │
│  shared_context: parent_agent_id, key, value, created_at        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Database Schema Changes

```sql
-- Add columns to agents table
ALTER TABLE agents ADD COLUMN parent_agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE agents ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'standard'; -- 'standard' or 'coordinator'
ALTER TABLE agents ADD COLUMN subtask_description TEXT;
ALTER TABLE agents ADD COLUMN coordination_state TEXT; -- JSON string

-- Indexes for performance
CREATE INDEX idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX idx_agents_type ON agents(agent_type);

-- Coordination events table
CREATE TABLE coordination_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON string
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_events_agent ON coordination_events(agent_id);
CREATE INDEX idx_events_timestamp ON coordination_events(timestamp);

-- Shared context table
CREATE TABLE shared_context (
  id TEXT PRIMARY KEY,
  parent_agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  context_key TEXT NOT NULL,
  context_value TEXT NOT NULL, -- JSON string
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(parent_agent_id, context_key)
);

CREATE INDEX idx_context_parent ON shared_context(parent_agent_id);
```

### TypeScript Types

```typescript
// Agent types
type AgentType = 'standard' | 'coordinator';

interface Subtask {
  id: string;
  description: string;
  directory: string;
  dependencies: string[]; // subtask IDs
  tools: string[]; // tool names to enable
  estimatedDuration?: number; // minutes
}

interface OrchestrationPolicy {
  strategy: 'sequential' | 'parallel' | 'hybrid';
  maxConcurrentChildren: number;
  retryOnFailure: boolean;
  maxRetries: number;
  coordinationTimeout: number; // seconds
  failFast: boolean; // stop all on first failure
}

interface CoordinationState {
  subtasks: Subtask[];
  completedSubtasks: string[];
  failedSubtasks: string[];
  activeSubtasks: string[];
  policy: OrchestrationPolicy;
}

interface AgentHierarchy {
  agent: Agent;
  children: AgentHierarchy[];
  depth: number;
  totalDescendants: number;
}

// Event types
type CoordinationEventType =
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'output_available'
  | 'dependency_met'
  | 'waiting_for_dependency'
  | 'coordination_timeout';

interface CoordinationEvent {
  id: string;
  agentId: string;
  type: CoordinationEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}
```

## Component Design

### 1. Coordinator Agent

**Purpose**: Analyzes complex tasks and spawns specialized child agents.

**System Prompt Template**:
```
You are a coordinator agent responsible for decomposing complex development tasks into subtasks and spawning specialized agents to handle them.

Given the following task:
{userTask}

Analyze the task and produce a decomposition plan in the following JSON format:
{
  "subtasks": [
    {
      "id": "unique-id",
      "description": "Clear description of what this subtask accomplishes",
      "directory": "path/to/working/directory",
      "dependencies": ["id-of-required-subtask"],
      "tools": ["Read", "Write", "Bash"],
      "estimatedDuration": 15
    }
  ],
  "policy": {
    "strategy": "parallel",
    "maxConcurrentChildren": 3
  }
}

Consider:
- Breaking tasks by concern (backend, frontend, tests, docs)
- Identifying dependencies (e.g., migrations before API, API before UI)
- Assigning appropriate tools for each subtask
- Estimating realistic durations
```

**Implementation** (`lib/agent-sdk/coordinator.ts`):
```typescript
export class CoordinatorAgent {
  async decomposeTask(task: string): Promise<CoordinationState> {
    // Use Claude SDK to analyze task with decomposition prompt
    // Parse response into Subtask[] and OrchestrationPolicy
    // Validate dependency DAG
    // Return coordination state
  }

  async spawnChildAgents(subtasks: Subtask[], policy: OrchestrationPolicy): Promise<void> {
    // Create child agents based on execution strategy
    // Link to parent via parent_agent_id
    // Subscribe to child events
    // Start execution according to policy
  }
}
```

### 2. Message Bus

**Purpose**: Enable event-driven communication between agents.

**Implementation** (`lib/agent-coordination/message-bus.ts`):
```typescript
type EventHandler = (event: CoordinationEvent) => void | Promise<void>;

export class MessageBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: CoordinationEvent[] = [];

  // Publish an event
  async publish(event: CoordinationEvent): Promise<void> {
    // Persist to database
    await db.insert(coordination_events).values(event);

    // Add to in-memory log
    this.eventLog.push(event);

    // Notify subscribers
    const handlers = this.subscribers.get(event.type) || new Set();
    await Promise.all([...handlers].map(h => h(event)));
  }

  // Subscribe to event types
  subscribe(eventType: CoordinationEventType, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);
  }

  // Get events for specific agent
  getEventsByAgent(agentId: string): CoordinationEvent[] {
    return this.eventLog.filter(e => e.agentId === agentId);
  }
}
```

### 3. Dependency Graph

**Purpose**: Resolve execution order and manage dependencies.

**Implementation** (`lib/agent-coordination/dependency-graph.ts`):
```typescript
export class DependencyGraph {
  private nodes: Map<string, Subtask> = new Map();
  private edges: Map<string, Set<string>> = new Map(); // subtask -> dependencies

  constructor(subtasks: Subtask[]) {
    subtasks.forEach(st => {
      this.nodes.set(st.id, st);
      this.edges.set(st.id, new Set(st.dependencies));
    });
  }

  // Validate no circular dependencies
  validate(): { valid: boolean; cycle?: string[] } {
    // DFS cycle detection
    // Return cycle path if found
  }

  // Get execution order (topological sort)
  getExecutionOrder(): string[][] {
    // Returns array of arrays (batches that can run in parallel)
    // Example: [['task1', 'task2'], ['task3'], ['task4', 'task5']]
  }

  // Check if subtask dependencies are met
  canExecute(subtaskId: string, completed: Set<string>): boolean {
    const deps = this.edges.get(subtaskId) || new Set();
    return [...deps].every(dep => completed.has(dep));
  }
}
```

### 4. Orchestration Engine

**Purpose**: Execute subtasks according to strategy and policy.

**Implementation** (`lib/agent-coordination/orchestration-engine.ts`):
```typescript
export class OrchestrationEngine {
  constructor(
    private messageBus: MessageBus,
    private graph: DependencyGraph,
    private policy: OrchestrationPolicy
  ) {}

  async execute(parentAgentId: string, subtasks: Subtask[]): Promise<void> {
    if (this.policy.strategy === 'sequential') {
      await this.executeSequential(parentAgentId, subtasks);
    } else if (this.policy.strategy === 'parallel') {
      await this.executeParallel(parentAgentId, subtasks);
    } else {
      await this.executeHybrid(parentAgentId, subtasks);
    }
  }

  private async executeSequential(parentAgentId: string, subtasks: Subtask[]): Promise<void> {
    const order = this.graph.getExecutionOrder().flat();
    for (const subtaskId of order) {
      const subtask = subtasks.find(st => st.id === subtaskId)!;
      await this.spawnAndWait(parentAgentId, subtask);
    }
  }

  private async executeParallel(parentAgentId: string, subtasks: Subtask[]): Promise<void> {
    const promises = subtasks.map(st => this.spawnAndWait(parentAgentId, st));
    await Promise.all(promises);
  }

  private async executeHybrid(parentAgentId: string, subtasks: Subtask[]): Promise<void> {
    const batches = this.graph.getExecutionOrder();
    for (const batch of batches) {
      const batchTasks = batch.map(id => subtasks.find(st => st.id === id)!);
      const promises = batchTasks.map(st => this.spawnAndWait(parentAgentId, st));
      await Promise.all(promises);
    }
  }

  private async spawnAndWait(parentAgentId: string, subtask: Subtask): Promise<void> {
    // Create child agent with subtask configuration
    const childAgent = await createAgent({
      parentAgentId,
      description: subtask.description,
      directory: subtask.directory,
      allowedTools: subtask.tools,
      agentType: 'standard'
    });

    // Subscribe to completion event
    return new Promise((resolve, reject) => {
      this.messageBus.subscribe('task_completed', (event) => {
        if (event.agentId === childAgent.id) {
          resolve();
        }
      });

      this.messageBus.subscribe('task_failed', (event) => {
        if (event.agentId === childAgent.id) {
          reject(new Error(`Subtask ${subtask.id} failed`));
        }
      });

      // Start agent execution
      startAgent(childAgent.id);
    });
  }
}
```

### 5. Shared Context

**Purpose**: Allow agents to share data without tight coupling.

**Implementation** (`lib/agent-coordination/shared-context.ts`):
```typescript
export class SharedContextManager {
  async set(parentAgentId: string, key: string, value: unknown): Promise<void> {
    const now = Date.now();
    await db.insert(shared_context).values({
      id: generateId(),
      parent_agent_id: parentAgentId,
      context_key: key,
      context_value: JSON.stringify(value),
      created_at: now,
      updated_at: now
    }).onConflictDoUpdate({
      target: [shared_context.parent_agent_id, shared_context.context_key],
      set: {
        context_value: JSON.stringify(value),
        updated_at: now
      }
    });
  }

  async get<T>(parentAgentId: string, key: string): Promise<T | null> {
    const row = await db.select()
      .from(shared_context)
      .where(eq(shared_context.parent_agent_id, parentAgentId))
      .where(eq(shared_context.context_key, key))
      .limit(1);

    return row[0] ? JSON.parse(row[0].context_value) : null;
  }

  async getAll(parentAgentId: string): Promise<Record<string, unknown>> {
    const rows = await db.select()
      .from(shared_context)
      .where(eq(shared_context.parent_agent_id, parentAgentId));

    return Object.fromEntries(
      rows.map(r => [r.context_key, JSON.parse(r.context_value)])
    );
  }

  async cleanup(parentAgentId: string): Promise<void> {
    await db.delete(shared_context)
      .where(eq(shared_context.parent_agent_id, parentAgentId));
  }
}
```

## User Workflows

### Workflow 1: Automatic Decomposition

1. User clicks "Create Coordinator Agent"
2. User provides high-level task: "Build user authentication system"
3. Coordinator agent analyzes and produces decomposition plan
4. UI shows proposed subtasks and dependencies in tree/graph view
5. User reviews and approves (or edits) the plan
6. Coordinator spawns child agents according to strategy
7. UI updates in real-time showing progress across tree
8. Coordinator aggregates results when all children complete

### Workflow 2: Manual Decomposition

1. User creates parent agent manually
2. User defines subtasks via UI form (description, directory, dependencies, tools)
3. UI validates dependency graph (checks for cycles)
4. User selects execution strategy (sequential/parallel/hybrid)
5. User triggers execution
6. Parent agent spawns children and coordinates via message bus
7. User monitors progress and intervenes if needed (retry, spawn additional)

### Workflow 3: Failure Recovery

1. Child agent fails during execution
2. Coordinator receives `task_failed` event
3. If policy allows retry: Coordinator respawns failed agent
4. If retry exhausted or failFast enabled: Coordinator pauses tree
5. User receives notification in UI
6. User reviews error and chooses: Retry, Skip, or Abort
7. Coordinator resumes execution based on user decision

## Performance Considerations

### Rate Limiting
- Track active requests across entire agent tree
- Implement queue system if concurrent limit reached
- Prioritize critical path tasks over parallel nice-to-haves

### Memory Management
- Clean up shared context after tree completion
- Archive old coordination events (> 7 days)
- Limit max tree depth to prevent runaway spawning

### Database Optimization
- Use database transactions for atomic tree operations
- Index foreign keys and timestamp columns
- Consider materialized view for tree aggregates (total progress)

## Security Considerations

- Validate parent_agent_id exists before spawning children
- Enforce same directory boundaries for child agents as parent
- Prevent coordinator agents from spawning other coordinators (limit depth)
- Sanitize subtask descriptions (prevent injection attacks)
- Rate limit coordinator decomposition requests (prevent abuse)
