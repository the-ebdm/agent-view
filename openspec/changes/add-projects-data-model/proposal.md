# Projects Data Model

## Why

Agent View currently treats directories as primitive string values on each agent spawn. This creates several problems:

- **No project context** - Cannot track which directories have been used or how frequently
- **Repeated input** - Users must manually type directory paths for each agent spawn
- **No metadata storage** - Cannot store project-specific settings like default tool permissions or OpenSpec paths
- **No discovery** - Cannot show a dashboard of all projects the user has worked with
- **No organization** - Cannot favorite, tag, or categorize projects
- **Lost history** - When agents are cleaned up, directory usage history is lost

Introducing projects as first-class entities in the data model enables:
- Project dashboard showing all directories used with Agent View
- Quick project selection when spawning agents
- Project-specific default settings (tool permissions, OpenSpec path)
- Project usage analytics (agent count, last used, etc.)
- Foundation for future features (project templates, team sharing, project-level agent orchestration)

**Note**: This proposal focuses exclusively on the data model and backend API. UI implementation for the projects dashboard will be a separate follow-up proposal.

## What Changes

Add projects as first-class entities in the database with automatic discovery from agent directories:

**Core Projects Features**
- Create `projects` table to store project metadata (name, directory, description, settings)
- Create `worktrees` table to support git worktrees (multiple working directories per project)
- Add `project_id` and `worktree_id` foreign keys to `agents` table (optional for backward compatibility)
- Auto-discover projects: when spawning an agent, automatically create or link to project based on directory
- Auto-discover worktrees: detect git worktrees via `.git` file parsing and link to parent project
- Track project usage: last_used timestamp, total agent count, active agent count, worktree count
- Track worktree usage: agent count, active agent count per worktree
- Project settings: default tool permissions, custom OpenSpec directory path
- Project organization: favorites, tags, custom sorting
- Worktree management: multiple agents per worktree, parallel work on different branches

**Data Access Layer**
- Implement `ProjectsRepository` for CRUD operations
- Implement `WorktreesRepository` for worktree management
- Update `AgentsRepository` to include project and worktree relationships
- Add project and worktree lookup/auto-creation logic in agent spawn flow
- Add git worktree detection and parsing utilities

**API Endpoints - Projects**
- `GET /api/projects` - List all projects with usage stats
- `GET /api/projects/[id]` - Get project details with agent list and worktrees
- `POST /api/projects` - Manually create project
- `PATCH /api/projects/[id]` - Update project metadata
- `DELETE /api/projects/[id]` - Soft-delete project (keep agents, cascade delete worktrees)
- `GET /api/projects/discover` - Scan directories and suggest new projects

**API Endpoints - Worktrees**
- `GET /api/projects/[projectId]/worktrees` - List worktrees for a project
- `GET /api/worktrees/[id]` - Get worktree details with agent list
- `POST /api/projects/[projectId]/worktrees` - Manually create worktree
- `PATCH /api/worktrees/[id]` - Update worktree metadata
- `DELETE /api/worktrees/[id]` - Delete worktree (cannot delete main worktree)
- `GET /api/projects/[projectId]/discover-worktrees` - Scan git worktrees directory

## Impact

- **Depends on**: `add-sqlite-persistence` (requires database infrastructure)
- **New capabilities**: project-management, worktree-management
- **Affected capabilities**: agent-persistence (from add-sqlite-persistence)
- **Affected code**:
  - `src/lib/database/schema.ts` - Add `projects` and `worktrees` tables, modify `agents` table
  - `src/lib/database/repositories/agents.ts` - Add project_id and worktree_id support
  - New: `src/lib/database/repositories/projects.ts` - ProjectsRepository
  - New: `src/lib/database/repositories/worktrees.ts` - WorktreesRepository
  - New: `src/lib/git-worktree-detector.ts` - Git worktree detection utilities
  - `src/app/api/agents/spawn/route.ts` - Add project and worktree auto-discovery
  - New: `src/app/api/projects/` - Projects API routes
  - New: `src/app/api/worktrees/` - Worktrees API routes
- **Breaking changes**: None (project_id and worktree_id are optional on agents table)
- **Migration required**: Yes (add projects and worktrees tables, add project_id and worktree_id columns to agents)
- **UI changes**: None (this proposal is data model only)
