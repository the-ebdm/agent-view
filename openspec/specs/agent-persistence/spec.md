# agent-persistence Specification

## Purpose
TBD - created by archiving change add-sqlite-persistence. Update Purpose after archive.
## Requirements
### Requirement: Agent Session Persistence

The system SHALL persist all agent session data to SQLite database to survive server restarts.

#### Scenario: Agent session created
- **WHEN** a new agent session is created via `AgentSessionManager.createSession()`
- **THEN** the session data MUST be inserted into the `agents` table with id, name, prompt, directory, status, lifecycle_state, tool_permissions, start_time, and timestamps

#### Scenario: Agent session updated
- **WHEN** an agent's status, lifecycle_state, or end_time is updated via `AgentSessionManager.updateStatus()` or lifecycle methods
- **THEN** the corresponding database row MUST be updated atomically

#### Scenario: Agent session retrieved
- **WHEN** `AgentSessionManager.getSession(id)` is called
- **THEN** the session MUST be retrieved from the database if not in memory

#### Scenario: All active agents retrieved
- **WHEN** `AgentSessionManager.getAllActiveAgents()` is called
- **THEN** all agents with lifecycle_state IN ('running', 'paused') MUST be returned from the database

#### Scenario: Agent moved to history
- **WHEN** an agent completes, errors, or is stopped
- **THEN** the agent's status and end_time MUST be updated in the database
- **AND** the agent MUST remain queryable via `getHistoricalSession()`

### Requirement: Agent Session Recovery

The system SHALL restore active agent sessions from database on server startup.

#### Scenario: Server restart with active agents
- **WHEN** the Node.js process starts
- **THEN** all agents with lifecycle_state IN ('running', 'paused') MUST be loaded from database
- **AND** agents with lifecycle_state = 'running' MUST be restored to the active agents map
- **AND** agents with lifecycle_state = 'paused' MUST be restored in paused state

#### Scenario: Server restart with no active agents
- **WHEN** the Node.js process starts
- **AND** no agents have lifecycle_state IN ('running', 'paused')
- **THEN** the system MUST initialize with an empty active agents map

#### Scenario: Recovery failure
- **WHEN** database recovery fails during startup
- **THEN** the system MUST log the error
- **AND** the system MUST initialize with an empty state (graceful degradation)
- **AND** the /api/health/database endpoint MUST report the failure

### Requirement: Database Schema - Agents Table

The system SHALL maintain an `agents` table with the following schema:

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  directory TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('idle', 'running', 'completed', 'error', 'interrupted')),
  lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN ('running', 'paused', 'stopped', 'error')),
  tool_permissions TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  worktree_id TEXT REFERENCES worktrees(id) ON DELETE SET NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  paused_time INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
```

#### Scenario: Agents table indexes
- **WHEN** the agents table is created
- **THEN** indexes MUST be created on status, lifecycle_state, start_time, project_id, and worktree_id columns for query performance

#### Scenario: Agent linked to project
- **WHEN** an agent is created with a project_id
- **THEN** the project_id MUST reference a valid project in the projects table

#### Scenario: Agent linked to worktree
- **WHEN** an agent is created with a worktree_id
- **THEN** the worktree_id MUST reference a valid worktree in the worktrees table
- **AND** the agent MUST also have project_id set (denormalized for performance)

#### Scenario: Project deleted sets agent project_id to NULL
- **WHEN** a project is deleted (archived)
- **THEN** all agents with that project_id MUST have their project_id set to NULL (ON DELETE SET NULL)

#### Scenario: Worktree deleted sets agent worktree_id to NULL
- **WHEN** a worktree is deleted
- **THEN** all agents with that worktree_id MUST have their worktree_id set to NULL (ON DELETE SET NULL)
- **AND** agents MUST retain their project_id

### Requirement: Agents Repository

The system SHALL provide an `AgentsRepository` class with type-safe data access methods.

#### Scenario: Create agent record
- **WHEN** `AgentsRepository.create(agent)` is called
- **THEN** the agent MUST be inserted into the database
- **AND** the operation MUST use a prepared statement

#### Scenario: Find agent by ID
- **WHEN** `AgentsRepository.findById(id)` is called
- **THEN** the agent record MUST be returned if found, otherwise undefined

#### Scenario: Find all active agents
- **WHEN** `AgentsRepository.findActive()` is called
- **THEN** all agents with lifecycle_state IN ('running', 'paused') MUST be returned
- **AND** results MUST be ordered by start_time DESC

#### Scenario: Update agent
- **WHEN** `AgentsRepository.update(id, updates)` is called
- **THEN** only the specified fields MUST be updated
- **AND** updated_at timestamp MUST be set to current time

#### Scenario: Delete agent
- **WHEN** `AgentsRepository.delete(id)` is called
- **THEN** the agent record MUST be deleted
- **AND** all related messages, metrics, and snapshots MUST be cascade deleted via foreign keys

