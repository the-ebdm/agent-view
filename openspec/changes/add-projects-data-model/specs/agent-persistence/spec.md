## MODIFIED Requirements

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
