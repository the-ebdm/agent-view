# Implementation Tasks

## 1. Database Schema Migration

- [ ] 1.1 Create projects table schema
  - Define table with all columns (id, name, directory, description, etc.)
  - Add UNIQUE constraint on directory
  - Create indexes (directory, last_used, is_favorite, archived_at)
- [ ] 1.2 Modify agents table schema
  - Add project_id column (nullable, foreign key to projects.id)
  - Add ON DELETE SET NULL constraint
  - Create index on project_id
- [ ] 1.3 Modify agent_configs table schema (future-proofing)
  - Add project_id column (nullable, foreign key to projects.id)
  - Create index on project_id
- [ ] 1.4 Implement migration to schema version 2
  - Check current schema version from settings table
  - Run CREATE TABLE projects statement
  - Run ALTER TABLE agents ADD COLUMN project_id statement
  - Run ALTER TABLE agent_configs ADD COLUMN project_id statement
  - Update schema_version to 2

## 2. Data Migration - Backfill Projects

- [ ] 2.1 Implement project backfill from existing agents
  - Query unique directories from agents table
  - Create project record for each unique directory
  - Generate project name from directory basename
  - Calculate agent_count from agents table
  - Calculate active_agent_count from agents with lifecycle_state IN ('running', 'paused')
  - Set last_used to MAX(start_time) for directory
  - Set created_at to MIN(start_time) for directory
- [ ] 2.2 Link agents to backfilled projects
  - Update agents.project_id to match projects.directory
  - Verify all agents have valid project_id after migration
  - Log migration statistics (projects created, agents linked)
- [ ] 2.3 Handle migration errors
  - Wrap migration in transaction for atomicity
  - Roll back if any step fails
  - Log detailed error messages

## 3. Projects Repository Implementation

- [ ] 3.1 Create ProjectsRepository class (`src/lib/database/repositories/projects.ts`)
  - Implement `create(project: Project): Project`
  - Implement `findById(id: string): Project | undefined`
  - Implement `findByDirectory(directory: string): Project | undefined`
  - Implement `findAll(options?: { includeArchived?: boolean }): Project[]`
  - Implement `findRecent(limit: number): Project[]`
  - Implement `findByTag(tag: string): Project[]`
  - Implement `update(id: string, updates: Partial<Project>): void`
  - Implement `archive(id: string): void`
  - Implement `restore(id: string): void`
  - Implement `toggleFavorite(id: string): void`
  - Use prepared statements for all queries
- [ ] 3.2 Implement count management methods
  - Implement `incrementAgentCount(id: string): void`
  - Implement `updateActiveAgentCount(id: string, delta: number): void`
  - Implement `updateLastUsed(id: string): void`
- [ ] 3.3 Implement reconciliation methods
  - Implement `reconcileCounts(projectId?: string): number`
  - Query actual counts from agents table
  - Update projects table with correct counts
  - Return number of corrected records
- [ ] 3.4 Add TypeScript types
  - Define `Project` interface
  - Define `ProjectCreateInput` type
  - Define `ProjectUpdateInput` type
  - Export types from `src/types/project.ts`

## 4. Auto-Discovery Logic

- [ ] 4.1 Create project discovery service (`src/lib/project-discovery.ts`)
  - Implement `findOrCreateProject(directory: string): Project`
  - Check if project exists with directory
  - If exists, return existing project
  - If not exists, create new project with auto-generated name
- [ ] 4.2 Implement auto-naming strategy
  - Extract directory basename as default name
  - Check for package.json and extract name field (optional enhancement)
  - Check for .git/config and extract repository name (optional enhancement)
  - Fall back to "Project at [directory]" if no better name found
  - Ensure name is unique (append number if duplicate)
- [ ] 4.3 Implement directory validation
  - Check if directory exists on filesystem
  - Return error if directory invalid
- [ ] 4.4 Handle edge cases
  - Relative vs absolute paths
  - Symlinks and aliases
  - Case-sensitive vs case-insensitive filesystems

## 5. Integration with Agent Spawn Flow

- [ ] 5.1 Modify agent spawn route (`src/app/api/agents/spawn/route.ts`)
  - Call `findOrCreateProject(directory)` before creating agent
  - Store returned project.id in session creation
  - Update project's last_used timestamp
  - Increment project's agent_count
  - Increment project's active_agent_count
- [ ] 5.2 Update AgentSessionManager
  - Add projectId parameter to `createSession()`
  - Store projectId in agent session
  - Persist projectId to database via AgentsRepository
- [ ] 5.3 Update AgentsRepository
  - Modify `create()` to accept optional project_id
  - Modify `findById()` to include project relationship
  - Add `findByProjectId(projectId: string)` method
- [ ] 5.4 Update agent lifecycle methods
  - Decrement active_agent_count on stop/complete
  - Update project's last_used when agent starts

## 6. Project Settings - Tool Permissions

- [ ] 6.1 Add default_tool_permissions to project creation
  - Accept optional default_tool_permissions in `POST /api/projects`
  - Validate tool permissions schema
  - Store as JSON in database
- [ ] 6.2 Apply project defaults on agent spawn
  - Check if agent spawn request has explicit toolPermissions
  - If not, query project's default_tool_permissions
  - If project has default, use it; otherwise use global default
  - Pass resolved permissions to agent creation
- [ ] 6.3 Update project settings API
  - Support updating default_tool_permissions via `PATCH /api/projects/[id]`

## 7. Project Settings - OpenSpec Path

- [ ] 7.1 Add openspec_path to project creation
  - Accept optional openspec_path in `POST /api/projects`
  - Validate path format (relative or absolute)
  - Store in database
- [ ] 7.2 Apply custom OpenSpec path in CLI commands
  - Modify `src/lib/openspec/cli-wrapper.ts` to accept project context
  - If project has openspec_path, add `--path` flag to commands
  - Resolve relative paths from project directory
- [ ] 7.3 Update project settings API
  - Support updating openspec_path via `PATCH /api/projects/[id]`

## 8. Projects API Endpoints

- [ ] 8.1 Create `GET /api/projects` endpoint
  - Accept query params: recent, favorite, tag, includeArchived
  - Call ProjectsRepository.findAll() with filters
  - Return projects with agent counts
  - Support sorting by last_used, is_favorite
- [ ] 8.2 Create `GET /api/projects/[id]` endpoint
  - Parse id from URL params
  - Call ProjectsRepository.findById(id)
  - Include list of agents for project (via AgentsRepository.findByProjectId())
  - Return 404 if not found or archived
- [ ] 8.3 Create `POST /api/projects` endpoint
  - Validate request body (name, directory required)
  - Check directory exists on filesystem
  - Call ProjectsRepository.create()
  - Handle duplicate directory (409 conflict)
  - Return created project
- [ ] 8.4 Create `PATCH /api/projects/[id]` endpoint
  - Validate request body (partial updates)
  - Call ProjectsRepository.update()
  - Support updating: name, description, openspec_path, default_tool_permissions, is_favorite, tags
  - Return updated project
- [ ] 8.5 Create `DELETE /api/projects/[id]` endpoint
  - Call ProjectsRepository.archive(id)
  - Return success status
  - Linked agents remain accessible (project_id set to NULL)
- [ ] 8.6 Create `GET /api/projects/discover` endpoint
  - Accept query param: path (required)
  - Validate path exists on filesystem
  - Scan subdirectories for project indicators (.git, package.json, openspec/)
  - Return list of potential projects with suggested names
  - Mark existing projects as "already tracked"

## 9. Project Organization Features

- [ ] 9.1 Implement favorites
  - Add favorite toggle to ProjectsRepository.toggleFavorite()
  - Update project list query to sort favorites first
- [ ] 9.2 Implement tags
  - Store tags as JSON array in database
  - Implement ProjectsRepository.findByTag()
  - Support multiple tags per project
  - Implement tag management in update API
- [ ] 9.3 Implement archival
  - ProjectsRepository.archive() sets archived_at timestamp
  - Exclude archived projects from default queries (WHERE archived_at IS NULL)
  - ProjectsRepository.restore() clears archived_at

## 10. Count Reconciliation

- [ ] 10.1 Implement reconciliation on startup
  - Call ProjectsRepository.reconcileCounts() during server initialization
  - Log corrected counts
- [ ] 10.2 Implement scheduled reconciliation job
  - Create background job runner (reuse from add-sqlite-persistence)
  - Schedule reconciliation every 24 hours
  - Log reconciliation results
- [ ] 10.3 Add manual reconciliation endpoint
  - Create `POST /api/admin/projects/reconcile` endpoint
  - Accept optional projectId in body
  - Call ProjectsRepository.reconcileCounts(projectId)
  - Return number of corrected counts

## 11. Testing & Validation

- [ ] 11.1 Test database migration
  - Run migration on clean database
  - Verify projects table created with indexes
  - Verify agents table has project_id column
  - Verify foreign key constraint works
- [ ] 11.2 Test data backfill
  - Create agents with various directories
  - Run backfill migration
  - Verify projects created with correct names
  - Verify agents linked to correct projects
  - Verify counts accurate
- [ ] 11.3 Test auto-discovery
  - Spawn agent with new directory
  - Verify project auto-created
  - Spawn agent with existing directory
  - Verify linked to existing project
- [ ] 11.4 Test project settings
  - Create project with default tool permissions
  - Spawn agent without permissions
  - Verify agent uses project defaults
  - Test OpenSpec path resolution
- [ ] 11.5 Test API endpoints
  - Test GET /api/projects (all filters)
  - Test GET /api/projects/[id]
  - Test POST /api/projects (valid and invalid)
  - Test PATCH /api/projects/[id]
  - Test DELETE /api/projects/[id]
  - Test GET /api/projects/discover
- [ ] 11.6 Test count management
  - Spawn/stop agents, verify counts updated
  - Test reconciliation job
  - Verify counts corrected after manual edit
- [ ] 11.7 Test edge cases
  - Directory with special characters
  - Very long directory paths
  - Duplicate project names
  - Archived project restoration
  - Project with no agents

## 12. Documentation

- [ ] 12.1 Update README.md
  - Document projects feature
  - Explain auto-discovery behavior
  - Document project settings (tool permissions, OpenSpec path)
- [ ] 12.2 Document API endpoints
  - Add OpenAPI/Swagger spec for projects endpoints
  - Include request/response examples
  - Document query parameters and filters
- [ ] 12.3 Document migration process
  - Explain schema version 2 migration
  - Document backfill process
  - Provide rollback instructions
- [ ] 12.4 Add architecture documentation
  - Projects entity relationship diagram
  - Auto-discovery flow diagram
  - Count reconciliation strategy
