# Implementation Tasks

## 1. Database Schema Migration

- [x] 1.1 Create projects table schema
  - Define table with all columns (id, name, directory, description, etc.)
  - Add UNIQUE constraint on directory
  - Create indexes (directory, last_used, is_favorite, archived_at)
- [x] 1.2 Modify agents table schema
  - Add project_id column (nullable, foreign key to projects.id)
  - Add worktree_id column (nullable, foreign key to worktrees.id)
  - Add ON DELETE SET NULL constraint
  - Create indexes on project_id and worktree_id
- [x] 1.3 Modify agent_configs table schema (future-proofing)
  - Add project_id column (nullable, foreign key to projects.id)
  - Create index on project_id
- [x] 1.4 Create worktrees table schema
  - Define table with all columns (id, project_id, name, directory, branch, etc.)
  - Add UNIQUE constraint on directory
  - Add foreign key to projects with ON DELETE CASCADE
  - Create indexes (project_id, directory, last_used, is_main)
- [x] 1.5 Implement migration to schema version 2
  - Check current schema version from settings table
  - Run CREATE TABLE projects statement
  - Run CREATE TABLE worktrees statement
  - Run ALTER TABLE agents ADD COLUMN project_id, worktree_id statements
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

- [x] 3.1 Create ProjectsRepository class (`src/lib/database/repositories/projects.ts`)
  - Implement `create(project: Project): Project`
  - Implement `findById(id: string): Project | undefined`
  - Implement `findByDirectory(directory: string): Project | undefined`
  - Implement `findAll(): Project[]` (non-archived only)
  - Implement `findActive(): Project[]` (with active agents)
  - Implement `findFavorites(): Project[]`
  - Implement `update(id: string, updates: Partial<Project>): void`
  - Implement `archive(id: string): void`
  - Implement `delete(id: string): void` (permanent delete)
  - Use prepared statements for all queries
- [x] 3.2 Implement count management methods
  - Implement `updateCounts(id: string, agentCount, activeAgentCount, worktreeCount): void`
  - Implement `updateLastUsed(id: string): void`
- [ ] 3.3 Implement reconciliation methods
  - Implement `reconcileCounts(projectId?: string): number`
  - Query actual counts from agents table
  - Update projects table with correct counts
  - Return number of corrected records
- [x] 3.4 Add TypeScript types
  - Define `Project` interface
  - Define `Worktree` interface
  - Define `CreateProjectInput` type
  - Define `UpdateProjectInput` type
  - Define `CreateWorktreeInput` type
  - Define `UpdateWorktreeInput` type
  - Export types from `src/types/project.ts`
- [x] 3.5 Create WorktreesRepository class (`src/lib/database/repositories/worktrees.ts`)
  - Implement `create(worktree: Worktree): Worktree`
  - Implement `findById(id: string): Worktree | undefined`
  - Implement `findByDirectory(directory: string): Worktree | undefined`
  - Implement `findByProjectId(projectId: string): Worktree[]`
  - Implement `findMainWorktree(projectId: string): Worktree | undefined`
  - Implement `findAll(): Worktree[]`
  - Implement `update(id: string, updates: Partial<Worktree>): void`
  - Implement `updateCounts(id: string, agentCount, activeAgentCount): void`
  - Implement `updateLastUsed(id: string): void`
  - Implement `delete(id: string): void`
  - Use prepared statements for all queries

## 4. Auto-Discovery Logic

- [x] 4.1 Create project discovery service (`src/lib/services/project-discovery.ts`)
  - Implement `discoverProject(directory: string): { project: Project, worktree: Worktree | null }`
  - Check if project exists with directory
  - If exists, return existing project
  - If not exists, create new project with auto-generated name
  - Create or find worktree for the directory
- [x] 4.2 Implement auto-naming strategy
  - Extract directory basename as default name
  - Check for package.json and extract name field ✓
  - Read CLAUDE.md or README.md for project description ✓
  - Detect OpenSpec directory ✓
  - Infer worktree names from git branch or directory name
- [x] 4.3 Implement git worktree detection (`src/lib/git/worktree-utils.ts`)
  - Detect if directory is a git repository
  - Determine if main worktree (.git is directory) or secondary (.git is file)
  - Parse .git file to find main repository path
  - Extract branch names from HEAD file
  - Find main repository path for worktrees
- [x] 4.4 Handle edge cases
  - Non-git directories (simple projects without worktrees)
  - Main repositories vs secondary worktrees
  - Git worktree directory structure parsing

## 5. Integration with Agent Spawn Flow

- [x] 5.1 Modify agent spawn route (`src/app/api/agents/spawn/route.ts`)
  - Made `createSession()` call async to support project discovery
  - Project/worktree discovery happens automatically in createSession
  - Project and worktree IDs stored in agent session
- [x] 5.2 Update AgentSessionManager
  - Made `createSession()` async
  - Added projectId and worktreeId to agent session
  - Call `discoverProject(directory)` before creating session
  - Store projectId and worktreeId in session
  - Persist to database via AgentsRepository
- [x] 5.3 Update AgentsRepository
  - Modified `create()` to accept optional project_id and worktree_id
  - Modified `findById()` to return project_id and worktree_id
  - Updated mapping function to include project/worktree relationships
- [ ] 5.4 Update agent lifecycle methods
  - Decrement active_agent_count on stop/complete
  - Update project's and worktree's last_used when agent starts
  - Update counts on agent lifecycle changes

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

- [x] 8.1 Create `GET /api/projects` endpoint (`src/app/api/projects/route.ts`)
  - Returns all non-archived projects
  - Includes agent counts and worktree counts
  - Checks for persistence enabled
- [x] 8.2 Create `GET /api/projects/[id]` endpoint (`src/app/api/projects/[id]/route.ts`)
  - Parse id from URL params
  - Call ProjectsRepository.findById(id)
  - Return 404 if not found
  - Return 503 if persistence disabled
- [ ] 8.3 Create `POST /api/projects` endpoint
  - Note: Projects are currently auto-created via agent spawn discovery
  - Manual creation endpoint not yet implemented
- [x] 8.4 Create `PATCH /api/projects/[id]` endpoint (`src/app/api/projects/[id]/route.ts`)
  - Validate request body with Zod schema
  - Call ProjectsRepository.update()
  - Support updating: name, description, openspec_path, default_tool_permissions, is_favorite, tags
  - Return updated project
  - Return 404 if not found
- [x] 8.5 Create `DELETE /api/projects/[id]` endpoint (`src/app/api/projects/[id]/route.ts`)
  - Call ProjectsRepository.archive(id)
  - Return success status
  - Linked agents' project_id remains (not set to NULL by design)
- [ ] 8.6 Create `GET /api/projects/discover` endpoint
  - Not yet implemented
  - Manual project discovery endpoint for future enhancement

## 8a. Worktrees API Endpoints

- [x] 8a.1 Create `GET /api/worktrees` endpoint (`src/app/api/worktrees/route.ts`)
  - Accept optional query param: projectId
  - Returns all worktrees or filtered by project
  - Includes agent counts
- [x] 8a.2 Create `GET /api/worktrees/[id]` endpoint (`src/app/api/worktrees/[id]/route.ts`)
  - Parse id from URL params
  - Call WorktreesRepository.findById(id)
  - Return 404 if not found
- [x] 8a.3 Create `PATCH /api/worktrees/[id]` endpoint (`src/app/api/worktrees/[id]/route.ts`)
  - Validate request body with Zod schema
  - Support updating: name, branch, isMain
  - Return updated worktree
- [x] 8a.4 Create `DELETE /api/worktrees/[id]` endpoint (`src/app/api/worktrees/[id]/route.ts`)
  - Permanently delete worktree
  - Return success status

## 9. Project Organization Features

- [x] 9.1 Implement favorites
  - is_favorite field stored in database
  - ProjectsRepository.findFavorites() query implemented
  - Can be updated via PATCH /api/projects/[id] endpoint
  - Index on is_favorite for performance
- [x] 9.2 Implement tags
  - Store tags as JSON array in database ✓
  - Tags can be updated via PATCH endpoint
  - Support multiple tags per project
  - Note: findByTag() query not yet implemented
- [x] 9.3 Implement archival
  - ProjectsRepository.archive() sets archived_at timestamp ✓
  - Exclude archived projects from default queries (WHERE archived_at IS NULL) ✓
  - Index on archived_at for performance ✓
  - Note: restore() method not yet implemented

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
