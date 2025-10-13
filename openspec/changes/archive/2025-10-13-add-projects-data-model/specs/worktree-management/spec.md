## ADDED Requirements

### Requirement: Worktree Entity

The system SHALL provide a worktrees entity to represent git worktree directories within projects.

#### Scenario: Worktree belongs to project
- **WHEN** a worktree is created
- **THEN** it MUST have a project_id referencing its parent project

#### Scenario: Worktree identified by directory
- **WHEN** a worktree is queried
- **THEN** the directory path MUST be unique across all worktrees

#### Scenario: Worktree metadata stored
- **WHEN** a worktree is created
- **THEN** it MUST have id, project_id, name, directory, branch, is_main, agent_count, active_agent_count, last_used, created_at, and updated_at fields

###Requirement: Database Schema - Worktrees Table

The system SHALL maintain a `worktrees` table with the following schema:

```sql
CREATE TABLE worktrees (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  directory TEXT NOT NULL UNIQUE,
  branch TEXT,
  is_main INTEGER NOT NULL DEFAULT 0,
  agent_count INTEGER NOT NULL DEFAULT 0,
  active_agent_count INTEGER NOT NULL DEFAULT 0,
  last_used INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, name)
);
```

#### Scenario: Worktrees table indexes
- **WHEN** the worktrees table is created
- **THEN** indexes MUST be created on project_id, directory, and is_main columns

#### Scenario: Worktree name unique within project
- **WHEN** a worktree is created
- **THEN** the name MUST be unique within its parent project (enforced by UNIQUE constraint)

#### Scenario: Worktree cascades on project delete
- **WHEN** a project is deleted (archived)
- **THEN** all its worktrees MUST be cascade deleted (ON DELETE CASCADE)

### Requirement: Agent-Worktree Relationship

The system SHALL link agents to worktrees via foreign key relationship.

#### Scenario: Agent linked to worktree
- **WHEN** an agent is created in a worktree directory
- **THEN** the agent MUST have both project_id and worktree_id set

#### Scenario: Agent linked to main directory
- **WHEN** an agent is created in a project's main directory (not a worktree)
- **THEN** the agent MUST have project_id set and worktree_id pointing to the main worktree

#### Scenario: Worktree deleted
- **WHEN** a worktree is deleted
- **THEN** linked agents' worktree_id MUST be set to NULL (ON DELETE SET NULL)

#### Scenario: Agents table modified for worktrees
- **WHEN** the database schema is migrated to version 2
- **THEN** a worktree_id column MUST be added to the agents table with foreign key constraint

### Requirement: Git Worktree Auto-Discovery

The system SHALL automatically detect git worktrees and create/link worktree entries.

#### Scenario: Agent spawned in git worktree directory
- **WHEN** an agent is spawned with a directory containing a `.git` file (not directory)
- **THEN** the system MUST read the `.git` file to detect worktree
- **AND** the system MUST parse the `gitdir:` path to find main repository
- **AND** the system MUST find or create the parent project for the main repository
- **AND** the system MUST find or create a worktree entry for the agent's directory
- **AND** the agent MUST be linked to both project_id and worktree_id

#### Scenario: Agent spawned in main repository directory
- **WHEN** an agent is spawned with a directory containing a `.git/` directory
- **THEN** the system MUST create or find the project
- **AND** the system MUST create or find the main worktree (is_main = 1)
- **AND** the agent MUST be linked to project_id and the main worktree_id

#### Scenario: Agent spawned in non-git directory
- **WHEN** an agent is spawned with a directory that has no `.git` file or directory
- **THEN** the system MUST create a project without worktrees
- **AND** the agent MUST have project_id set but worktree_id NULL

#### Scenario: Worktree name extracted from git metadata
- **WHEN** a git worktree is discovered
- **THEN** the worktree name MUST be extracted from the git worktree path
- **AND** if the name conflicts within the project, a counter MUST be appended

#### Scenario: Branch name extracted from git worktree
- **WHEN** a git worktree is discovered
- **THEN** the system SHOULD attempt to extract the branch name from git metadata
- **AND** the branch field MUST be populated if available

### Requirement: Main Worktree Creation

The system SHALL automatically create a "main" worktree entry for the primary repository directory.

#### Scenario: Main worktree created for project
- **WHEN** a project is created from a git repository
- **THEN** a main worktree entry MUST be created with is_main = 1
- **AND** the worktree's directory MUST match the project's directory
- **AND** the worktree's name MUST be "main"

#### Scenario: Only one main worktree per project
- **WHEN** worktrees are created for a project
- **THEN** only one worktree MAY have is_main = 1 (enforced in application logic)

### Requirement: Worktrees Repository

The system SHALL provide a `WorktreesRepository` class with type-safe data access methods.

#### Scenario: Create worktree
- **WHEN** `WorktreesRepository.create(worktree)` is called
- **THEN** the worktree MUST be inserted into the database
- **AND** a unique constraint violation MUST be thrown if directory or (project_id, name) already exists

#### Scenario: Find worktree by ID
- **WHEN** `WorktreesRepository.findById(id)` is called
- **THEN** the worktree record MUST be returned if found, otherwise undefined

#### Scenario: Find worktree by directory
- **WHEN** `WorktreesRepository.findByDirectory(directory)` is called
- **THEN** the worktree record MUST be returned if found, otherwise undefined

#### Scenario: Find worktrees by project
- **WHEN** `WorktreesRepository.findByProjectId(projectId)` is called
- **THEN** all worktrees for that project MUST be returned
- **AND** results MUST be ordered by is_main DESC, name ASC

#### Scenario: Find main worktree for project
- **WHEN** `WorktreesRepository.findMainWorktree(projectId)` is called
- **THEN** the worktree with is_main = 1 MUST be returned if exists, otherwise undefined

#### Scenario: Update worktree
- **WHEN** `WorktreesRepository.update(id, updates)` is called
- **THEN** only the specified fields MUST be updated
- **AND** updated_at timestamp MUST be set to current time

#### Scenario: Delete worktree
- **WHEN** `WorktreesRepository.delete(id)` is called
- **THEN** the worktree record MUST be deleted
- **AND** all linked agents' worktree_id MUST be set to NULL

#### Scenario: Increment worktree agent count
- **WHEN** `WorktreesRepository.incrementAgentCount(id)` is called
- **THEN** the agent_count field MUST be incremented by 1

#### Scenario: Update worktree active agent count
- **WHEN** `WorktreesRepository.updateActiveAgentCount(id, delta)` is called
- **THEN** the active_agent_count field MUST be incremented or decremented by delta

### Requirement: Worktree Count Management

The system SHALL track agent counts per worktree for analytics.

#### Scenario: Agent count incremented on spawn
- **WHEN** an agent is spawned in a worktree
- **THEN** the worktree's agent_count MUST be incremented
- **AND** the worktree's last_used MUST be updated

#### Scenario: Active agent count tracked
- **WHEN** an agent starts, stops, pauses, or resumes
- **THEN** the worktree's active_agent_count MUST be updated accordingly

#### Scenario: Project worktree count updated
- **WHEN** a worktree is created or deleted
- **THEN** the parent project's worktree_count MUST be updated

### Requirement: Worktrees API - List Worktrees

The system SHALL provide an API endpoint to list worktrees for a project.

#### Scenario: List worktrees for project
- **WHEN** `GET /api/projects/[projectId]/worktrees` is called
- **THEN** all worktrees for that project MUST be returned
- **AND** results MUST include agent counts
- **AND** results MUST be ordered by is_main DESC, name ASC

#### Scenario: Include agents in worktree list
- **WHEN** `GET /api/projects/[projectId]/worktrees?includeAgents=true` is called
- **THEN** each worktree MUST include a list of its agents

### Requirement: Worktrees API - Get Worktree Details

The system SHALL provide an API endpoint to get worktree details.

#### Scenario: Get worktree by ID
- **WHEN** `GET /api/worktrees/[id]` is called
- **THEN** the worktree details MUST be returned if found
- **AND** the response MUST include list of agents for the worktree

#### Scenario: Get worktree not found
- **WHEN** `GET /api/worktrees/[id]` is called with invalid ID
- **THEN** a 404 error MUST be returned

### Requirement: Worktrees API - Create Worktree

The system SHALL provide an API endpoint to manually create worktrees.

#### Scenario: Create worktree manually
- **WHEN** `POST /api/projects/[projectId]/worktrees` is called with name and directory
- **THEN** a new worktree MUST be created
- **AND** the worktree MUST be linked to the specified project

#### Scenario: Create worktree with duplicate directory
- **WHEN** `POST /api/projects/[projectId]/worktrees` is called with directory that already exists
- **THEN** a 409 conflict error MUST be returned

#### Scenario: Create worktree with duplicate name
- **WHEN** `POST /api/projects/[projectId]/worktrees` is called with name that exists in project
- **THEN** a 409 conflict error MUST be returned

### Requirement: Worktrees API - Update Worktree

The system SHALL provide an API endpoint to update worktree metadata.

#### Scenario: Update worktree name
- **WHEN** `PATCH /api/worktrees/[id]` is called with new name
- **THEN** the name MUST be updated
- **AND** the unique constraint (project_id, name) MUST be enforced

#### Scenario: Update worktree branch
- **WHEN** `PATCH /api/worktrees/[id]` is called with new branch
- **THEN** the branch field MUST be updated

### Requirement: Worktrees API - Delete Worktree

The system SHALL provide an API endpoint to delete worktrees.

#### Scenario: Delete worktree
- **WHEN** `DELETE /api/worktrees/[id]` is called
- **THEN** the worktree MUST be deleted
- **AND** linked agents' worktree_id MUST be set to NULL
- **AND** agents MUST retain their project_id

#### Scenario: Cannot delete main worktree
- **WHEN** `DELETE /api/worktrees/[id]` is called on a worktree with is_main = 1
- **THEN** a 400 error MUST be returned with message "Cannot delete main worktree"

### Requirement: Worktree Discovery from Filesystem

The system SHALL provide functionality to discover worktrees from git repositories.

#### Scenario: Discover worktrees from git repository
- **WHEN** `GET /api/projects/[projectId]/discover-worktrees` is called
- **THEN** the system MUST scan the project's `.git/worktrees/` directory
- **AND** potential worktrees MUST be returned with their directories and suggested names
- **AND** existing worktrees MUST be marked as "already tracked"

#### Scenario: Project not a git repository
- **WHEN** `GET /api/projects/[projectId]/discover-worktrees` is called on non-git project
- **THEN** an empty array MUST be returned (no worktrees found)
