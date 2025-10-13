# project-management Specification

## Purpose
TBD - created by archiving change add-projects-data-model. Update Purpose after archive.
## Requirements
### Requirement: Project Entity

The system SHALL provide a projects entity to represent directories used with Agent View.

#### Scenario: Project identified by directory
- **WHEN** a project is created or queried
- **THEN** the directory path MUST be the unique identifier (one directory = one project)

#### Scenario: Project metadata stored
- **WHEN** a project is created
- **THEN** the project MUST have id, name, directory, optional description, openspec_path, default_tool_permissions, is_favorite, tags, agent_count, active_agent_count, last_used, created_at, updated_at, and archived_at fields

#### Scenario: Project name defaults to directory basename
- **WHEN** a project is auto-created without explicit name
- **THEN** the name MUST be derived from the directory basename (e.g., `/path/to/my-app` → "my-app")

### Requirement: Database Schema - Projects Table

The system SHALL maintain a `projects` table with the following schema:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  directory TEXT NOT NULL UNIQUE,
  description TEXT,
  openspec_path TEXT,
  default_tool_permissions TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  agent_count INTEGER NOT NULL DEFAULT 0,
  active_agent_count INTEGER NOT NULL DEFAULT 0,
  last_used INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);
```

#### Scenario: Projects table indexes
- **WHEN** the projects table is created
- **THEN** indexes MUST be created on directory, last_used, is_favorite, and archived_at columns

### Requirement: Agent-Project Relationship

The system SHALL link agents to projects via foreign key relationship.

#### Scenario: Agent linked to project
- **WHEN** an agent is created
- **THEN** the agent MAY have a project_id foreign key referencing the projects table

#### Scenario: Project deleted
- **WHEN** a project is deleted (archived)
- **THEN** linked agents' project_id MUST be set to NULL (ON DELETE SET NULL)

#### Scenario: Agents table modified
- **WHEN** the database schema is migrated to version 2
- **THEN** a project_id column MUST be added to the agents table with foreign key constraint

### Requirement: Automatic Project Discovery

The system SHALL automatically create or link projects when spawning agents.

#### Scenario: Agent spawned with known directory
- **WHEN** an agent is spawned with a directory that matches an existing project
- **THEN** the agent MUST be linked to that project via project_id
- **AND** the project's last_used timestamp MUST be updated
- **AND** the project's agent_count MUST be incremented
- **AND** the project's active_agent_count MUST be incremented

#### Scenario: Agent spawned with new directory
- **WHEN** an agent is spawned with a directory that does not match any existing project
- **THEN** a new project MUST be created with auto-generated name
- **AND** the agent MUST be linked to the new project

#### Scenario: Agent completed or stopped
- **WHEN** an agent's lifecycle_state changes from 'running' or 'paused' to 'stopped' or 'error'
- **THEN** the project's active_agent_count MUST be decremented

### Requirement: Projects Repository

The system SHALL provide a `ProjectsRepository` class with type-safe data access methods.

#### Scenario: Create project
- **WHEN** `ProjectsRepository.create(project)` is called
- **THEN** the project MUST be inserted into the database
- **AND** a unique constraint violation MUST be thrown if directory already exists

#### Scenario: Find project by ID
- **WHEN** `ProjectsRepository.findById(id)` is called
- **THEN** the project record MUST be returned if found and not archived, otherwise undefined

#### Scenario: Find project by directory
- **WHEN** `ProjectsRepository.findByDirectory(directory)` is called
- **THEN** the project record MUST be returned if found and not archived, otherwise undefined

#### Scenario: Find all projects
- **WHEN** `ProjectsRepository.findAll()` is called
- **THEN** all non-archived projects MUST be returned
- **AND** results MUST be ordered by is_favorite DESC, last_used DESC, created_at DESC

#### Scenario: Find recent projects
- **WHEN** `ProjectsRepository.findRecent(limit)` is called
- **THEN** the most recently used non-archived projects MUST be returned
- **AND** results MUST be limited to the specified count

#### Scenario: Update project
- **WHEN** `ProjectsRepository.update(id, updates)` is called
- **THEN** only the specified fields MUST be updated
- **AND** updated_at timestamp MUST be set to current time

#### Scenario: Archive project
- **WHEN** `ProjectsRepository.archive(id)` is called
- **THEN** the archived_at timestamp MUST be set to current time
- **AND** the project MUST be excluded from default queries

#### Scenario: Restore archived project
- **WHEN** `ProjectsRepository.restore(id)` is called
- **THEN** the archived_at timestamp MUST be set to NULL
- **AND** the project MUST be included in default queries

#### Scenario: Increment agent count
- **WHEN** `ProjectsRepository.incrementAgentCount(id)` is called
- **THEN** the agent_count field MUST be incremented by 1

#### Scenario: Update active agent count
- **WHEN** `ProjectsRepository.updateActiveAgentCount(id, delta)` is called
- **THEN** the active_agent_count field MUST be incremented or decremented by delta

#### Scenario: Update last used
- **WHEN** `ProjectsRepository.updateLastUsed(id)` is called
- **THEN** the last_used timestamp MUST be set to current time

### Requirement: Project Settings - Default Tool Permissions

The system SHALL support project-level default tool permissions.

#### Scenario: Project has default permissions
- **WHEN** a project has default_tool_permissions set
- **AND** an agent is spawned without explicit toolPermissions
- **THEN** the project's default permissions MUST be used

#### Scenario: Agent permissions override project defaults
- **WHEN** an agent is spawned with explicit toolPermissions
- **THEN** the agent's permissions MUST be used (project defaults ignored)

#### Scenario: No project defaults
- **WHEN** a project has no default_tool_permissions set
- **AND** an agent is spawned without explicit toolPermissions
- **THEN** the global default ('standard') MUST be used

### Requirement: Project Settings - Custom OpenSpec Path

The system SHALL support project-level custom OpenSpec directory paths.

#### Scenario: Project has custom OpenSpec path
- **WHEN** a project has openspec_path set
- **THEN** OpenSpec CLI commands MUST use the custom path with --path flag

#### Scenario: Project has no custom OpenSpec path
- **WHEN** a project has no openspec_path set
- **THEN** OpenSpec CLI commands MUST use the default ./openspec directory

#### Scenario: OpenSpec path resolved relative to project directory
- **WHEN** openspec_path is a relative path
- **THEN** it MUST be resolved relative to the project's directory field

### Requirement: Project Organization - Favorites

The system SHALL support marking projects as favorites for quick access.

#### Scenario: Project marked as favorite
- **WHEN** `ProjectsRepository.toggleFavorite(id)` is called
- **THEN** the is_favorite field MUST be toggled (0 → 1 or 1 → 0)

#### Scenario: Favorites sorted first
- **WHEN** `ProjectsRepository.findAll()` is called
- **THEN** favorite projects (is_favorite = 1) MUST be sorted before non-favorites

### Requirement: Project Organization - Tags

The system SHALL support tagging projects for categorization.

#### Scenario: Project tags stored
- **WHEN** a project is created or updated with tags
- **THEN** tags MUST be stored as JSON array in the tags field

#### Scenario: Projects filtered by tag
- **WHEN** `ProjectsRepository.findByTag(tag)` is called
- **THEN** all non-archived projects with the specified tag MUST be returned

### Requirement: Project Analytics - Usage Tracking

The system SHALL track project usage statistics for analytics.

#### Scenario: Agent count tracked
- **WHEN** an agent is created for a project
- **THEN** the project's agent_count MUST be incremented
- **AND** the field MUST accurately reflect total agents ever created for the project

#### Scenario: Active agent count tracked
- **WHEN** an agent starts, stops, pauses, or resumes
- **THEN** the project's active_agent_count MUST be updated accordingly
- **AND** the field MUST accurately reflect agents with lifecycle_state IN ('running', 'paused')

#### Scenario: Last used timestamp updated
- **WHEN** an agent is spawned for a project
- **THEN** the project's last_used timestamp MUST be set to current time

### Requirement: Project Count Reconciliation

The system SHALL periodically reconcile denormalized agent counts to prevent drift.

#### Scenario: Reconciliation on startup
- **WHEN** the server starts
- **THEN** all projects' agent_count and active_agent_count MUST be recalculated from agents table

#### Scenario: Reconciliation scheduled
- **WHEN** the reconciliation job runs (every 24 hours)
- **THEN** all projects' counts MUST be recalculated
- **AND** any mismatches MUST be logged

#### Scenario: Manual reconciliation
- **WHEN** `ProjectsRepository.reconcileCounts(projectId?)` is called
- **THEN** the specified project's counts MUST be recalculated (or all projects if projectId omitted)
- **AND** the number of corrected counts MUST be returned

### Requirement: Project Data Migration

The system SHALL migrate existing agent directories to projects on schema upgrade.

#### Scenario: Migration creates projects from agents
- **WHEN** the database is migrated to schema version 2
- **THEN** a project MUST be created for each unique directory in the agents table
- **AND** the project name MUST be derived from the directory basename
- **AND** the project's agent_count MUST equal the count of agents with that directory

#### Scenario: Migration links agents to projects
- **WHEN** projects are created from migration
- **THEN** all agents MUST be updated with project_id linking to the corresponding project

#### Scenario: Migration updates active counts
- **WHEN** agents are linked to projects
- **THEN** each project's active_agent_count MUST be calculated from agents with lifecycle_state IN ('running', 'paused')

### Requirement: Projects API - List Projects

The system SHALL provide an API endpoint to list all projects.

#### Scenario: List all projects
- **WHEN** `GET /api/projects` is called
- **THEN** all non-archived projects MUST be returned
- **AND** results MUST include agent_count and active_agent_count
- **AND** results MUST be ordered by is_favorite DESC, last_used DESC

#### Scenario: List recent projects
- **WHEN** `GET /api/projects?recent=true` is called
- **THEN** the 10 most recently used projects MUST be returned

#### Scenario: List favorite projects
- **WHEN** `GET /api/projects?favorite=true` is called
- **THEN** only favorite projects (is_favorite = 1) MUST be returned

#### Scenario: Filter by tag
- **WHEN** `GET /api/projects?tag=value` is called
- **THEN** only projects with the specified tag MUST be returned

### Requirement: Projects API - Get Project Details

The system SHALL provide an API endpoint to get project details.

#### Scenario: Get project by ID
- **WHEN** `GET /api/projects/[id]` is called
- **THEN** the project details MUST be returned if found and not archived
- **AND** the response MUST include list of agents for the project
- **AND** agents MUST be ordered by start_time DESC

#### Scenario: Get project not found
- **WHEN** `GET /api/projects/[id]` is called with invalid or archived project
- **THEN** a 404 error MUST be returned

### Requirement: Projects API - Create Project

The system SHALL provide an API endpoint to manually create projects.

#### Scenario: Create project manually
- **WHEN** `POST /api/projects` is called with name and directory
- **THEN** a new project MUST be created
- **AND** the response MUST include the project id

#### Scenario: Create project with duplicate directory
- **WHEN** `POST /api/projects` is called with directory that already exists
- **THEN** a 409 conflict error MUST be returned

#### Scenario: Create project with invalid directory
- **WHEN** `POST /api/projects` is called with directory that doesn't exist
- **THEN** a 400 validation error MUST be returned

### Requirement: Projects API - Update Project

The system SHALL provide an API endpoint to update project metadata.

#### Scenario: Update project metadata
- **WHEN** `PATCH /api/projects/[id]` is called with updates
- **THEN** the specified fields MUST be updated
- **AND** updated_at timestamp MUST be set
- **AND** the updated project MUST be returned

#### Scenario: Update project name
- **WHEN** `PATCH /api/projects/[id]` is called with new name
- **THEN** the name MUST be updated
- **AND** directory MUST remain unchanged

#### Scenario: Toggle favorite
- **WHEN** `PATCH /api/projects/[id]` is called with is_favorite
- **THEN** the is_favorite field MUST be updated

#### Scenario: Update tags
- **WHEN** `PATCH /api/projects/[id]` is called with tags array
- **THEN** the tags MUST be updated

#### Scenario: Update default tool permissions
- **WHEN** `PATCH /api/projects/[id]` is called with default_tool_permissions
- **THEN** the default_tool_permissions MUST be updated
- **AND** future agents spawned without explicit permissions MUST use the new default

### Requirement: Projects API - Archive Project

The system SHALL provide an API endpoint to archive (soft-delete) projects.

#### Scenario: Archive project
- **WHEN** `DELETE /api/projects/[id]` is called
- **THEN** the project's archived_at timestamp MUST be set
- **AND** the project MUST be excluded from default queries
- **AND** linked agents MUST remain accessible

#### Scenario: Restore archived project
- **WHEN** `PATCH /api/projects/[id]` is called with archived_at: null
- **THEN** the project MUST be restored (archived_at set to NULL)
- **AND** the project MUST be included in default queries

### Requirement: Projects API - Discover Projects

The system SHALL provide an API endpoint to discover potential projects from filesystem.

#### Scenario: Discover projects from path
- **WHEN** `GET /api/projects/discover?path=/base/path` is called
- **THEN** the system MUST scan subdirectories for project indicators (e.g., .git, package.json, openspec/)
- **AND** potential projects MUST be returned with suggested names
- **AND** existing projects MUST be marked as "already tracked"

#### Scenario: Discover without path
- **WHEN** `GET /api/projects/discover` is called without path parameter
- **THEN** a 400 validation error MUST be returned (path is required)

#### Scenario: Discover with invalid path
- **WHEN** `GET /api/projects/discover?path=/nonexistent` is called
- **THEN** a 404 error MUST be returned

