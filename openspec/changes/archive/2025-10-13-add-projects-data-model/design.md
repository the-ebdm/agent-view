# Projects Data Model Design

## Context

Agent View currently uses directory strings directly when spawning agents. Users must manually enter the directory path each time, and there's no concept of "projects" or directory history. This limits discoverability and prevents storing project-specific settings.

**Current Limitations**:
- Directory is just a string field on `agents` and `agent_configs`
- No tracking of which directories have been used
- No project metadata (name, description, defaults)
- No project-level analytics or dashboards

**Requirements**:
- First-class projects entity in the data model
- Automatic project discovery from agent directories
- Project metadata storage (name, settings, tags)
- Backward compatibility with existing directory-based agents
- Foundation for future projects dashboard UI

## Goals / Non-Goals

**Goals**:
- Database schema for projects with metadata
- Automatic project creation/linking when spawning agents
- **Git worktrees support** - Multiple working directories per project
- Project-level settings (default tool permissions, OpenSpec path)
- Projects API for CRUD operations
- Usage analytics (agent counts, last used)
- Projects discovery from filesystem

**Non-Goals**:
- Projects dashboard UI (separate proposal)
- Multi-project agent orchestration (Phase 4)
- Project sharing/collaboration (future)
- Advanced git operations (commit, push, etc.) - just worktree awareness
- Project templates or scaffolding (future)

## Decisions

### Schema Design: Projects as Weak Entities

**Decision**: Projects are identified by directory path (unique constraint), not by user-provided name.

**Rationale**:
- **Uniqueness**: One directory = one project (prevents duplicates)
- **Auto-discovery**: Can automatically create projects from agent spawn
- **Consistency**: Directory is the source of truth, not user naming
- **Simplicity**: No name collision handling needed

**Schema**:
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  directory TEXT NOT NULL UNIQUE,  -- Source of truth
  description TEXT,
  openspec_path TEXT,  -- Custom OpenSpec directory (default: ./openspec)
  default_tool_permissions TEXT,  -- JSON: ToolPermission preset
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT,  -- JSON array
  agent_count INTEGER NOT NULL DEFAULT 0,  -- Denormalized for performance
  active_agent_count INTEGER NOT NULL DEFAULT 0,
  last_used INTEGER,  -- Unix timestamp (ms)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER  -- Soft delete
);
```

**Alternatives considered**:
- **Name as primary key**: Requires handling collisions, harder to auto-create
- **UUID-only identification**: Less discoverable, harder to debug
- **Directory + name composite key**: Over-complicated

### Relationship Model: Projects → Worktrees → Agents

**Decision**: Introduce three-tier relationship with worktrees as intermediate entity.

**Rationale**:
- **Git worktree support**: Enable multiple working directories per git repository
- **Agent isolation**: Different agents can work on different branches simultaneously
- **Collaboration**: Multiple agents can share the same worktree (same branch)
- **Flexibility**: Some projects may not use worktrees (single directory)

**Schema relationships**:
```sql
-- Projects table (existing, updated)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  directory TEXT NOT NULL UNIQUE,  -- Main repository directory
  description TEXT,
  openspec_path TEXT,
  default_tool_permissions TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  agent_count INTEGER NOT NULL DEFAULT 0,
  active_agent_count INTEGER NOT NULL DEFAULT 0,
  worktree_count INTEGER NOT NULL DEFAULT 0,  -- NEW: Number of worktrees
  last_used INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
);

-- Worktrees table (NEW)
CREATE TABLE worktrees (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- User-friendly name (branch name or custom)
  directory TEXT NOT NULL UNIQUE,  -- Worktree path
  branch TEXT,  -- Git branch name (if applicable)
  is_main INTEGER NOT NULL DEFAULT 0,  -- Is this the main working directory?
  agent_count INTEGER NOT NULL DEFAULT 0,
  active_agent_count INTEGER NOT NULL DEFAULT 0,
  last_used INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, name)  -- Unique name within project
);

-- Agents table (existing, updated)
ALTER TABLE agents ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN worktree_id TEXT REFERENCES worktrees(id) ON DELETE SET NULL;
CREATE INDEX idx_agents_project_id ON agents(project_id);
CREATE INDEX idx_agents_worktree_id ON agents(worktree_id);
```

**Relationship semantics**:
- **Project → Worktrees (1:N)**: Each project can have multiple worktrees
- **Worktree → Agents (1:N)**: Multiple agents can work on same worktree
- **Agent references**: Agent has both project_id and worktree_id
  - If worktree_id is set, it implies project_id (denormalized for performance)
  - If worktree_id is NULL, agent works on main project directory

**Alternatives considered**:
- **No worktrees table**: Store worktree path directly on agents (loses metadata, no sharing)
- **Worktrees as separate projects**: Over-complicates project management, loses git relationship
- **Required worktree_id**: Too rigid, not all projects use worktrees

### Auto-Discovery: Create-on-Spawn Pattern

**Decision**: Automatically create or link projects when spawning agents.

**Flow**:
1. Agent spawn request arrives with `directory` parameter
2. Check if project exists with matching directory (`ProjectsRepository.findByDirectory()`)
3. If exists, link agent to project and update `last_used`
4. If not exists, create new project with auto-generated name (e.g., "Project at /path/to/dir")
5. Store `project_id` on agent record

**Rationale**:
- **Zero friction**: Users don't need to manually create projects
- **Accurate tracking**: Every agent is linked to a project
- **Consistent data**: Projects table always reflects actual usage

**Auto-naming strategy**:
- Use directory basename as initial name (e.g., `/Users/eric/my-app` → "my-app")
- If directory has `package.json`, extract `name` field
- If directory has `.git/config`, extract repository name
- Fall back to "Project at [directory]"
- User can rename later via API

**Alternatives considered**:
- **Manual project creation**: Adds friction, users may skip it
- **Discovery via background job**: Delayed, inconsistent state
- **No auto-creation**: Defeats purpose of project tracking

### Worktree Auto-Discovery: Git Worktree Detection

**Decision**: Automatically detect and create worktree entries when spawning agents in git worktree directories.

**Git worktree detection**:
1. Agent spawn request arrives with `directory` parameter
2. Check if directory contains `.git` file (worktree indicator)
3. If `.git` is a file (not a directory), read it to find main repository path
4. Parse `.git` file content: `gitdir: /path/to/main/.git/worktrees/branch-name`
5. Extract main repository path and worktree name
6. Find or create parent project for main repository
7. Find or create worktree entry for this directory
8. Link agent to both project_id and worktree_id

**Worktree naming strategy**:
- Extract branch name from git worktree path (e.g., `.git/worktrees/feature-xyz` → "feature-xyz")
- If branch name unavailable, use directory basename
- If duplicate names exist, append counter (e.g., "feature-xyz-2")
- Mark main repository directory as `is_main = 1`

**Main directory handling**:
- Main repository directory (contains `.git/` directory) automatically gets a "main" worktree entry
- Main worktree is created with `is_main = 1` and name = "main"
- Agents spawned in main directory use main worktree

**Flow**:
```
Agent spawn with directory: /path/to/repo-worktrees/feature-123
↓
Check /path/to/repo-worktrees/feature-123/.git
↓
Is file? Yes → git worktree detected
↓
Parse file: gitdir: /path/to/main-repo/.git/worktrees/feature-123
↓
Extract main repo: /path/to/main-repo
↓
Find/create project for /path/to/main-repo
↓
Find/create worktree for /path/to/repo-worktrees/feature-123
↓
Link agent to project_id and worktree_id
```

**Rationale**:
- **Zero configuration**: Works automatically with existing git worktrees
- **Accurate tracking**: Every worktree is properly linked to parent project
- **Flexibility**: Supports both worktrees and non-worktree projects
- **Git-aware**: Leverages git's own worktree metadata

**Alternatives considered**:
- **Manual worktree creation**: Too much friction, defeats auto-discovery purpose
- **Scan .git/worktrees**: Requires main repo access, may not be available
- **No worktree detection**: Treats worktrees as separate projects, loses relationship

### Project Settings: Default Tool Permissions

**Decision**: Allow projects to define default tool permissions for spawned agents.

**Schema field**: `default_tool_permissions` (JSON: `{"preset": "standard", "tools": [...]}`)

**Behavior**:
- If agent spawn request omits `toolPermissions`, use project default
- If no project default, use global default (`standard`)
- If agent spawn request provides `toolPermissions`, override project default

**Rationale**:
- **Convenience**: Avoids repetitive permission configuration per agent
- **Security**: Can enforce restrictive defaults on sensitive projects (e.g., production codebases)
- **Flexibility**: Per-agent override still supported

**Alternatives considered**:
- **No project defaults**: More repetitive configuration
- **Only project defaults**: Too rigid, no per-agent flexibility
- **Inherited from parent directory**: Over-complicated hierarchy

### Project Settings: Custom OpenSpec Path

**Decision**: Allow projects to specify custom OpenSpec directory path.

**Schema field**: `openspec_path` (TEXT, nullable, default: `./openspec`)

**Use Case**:
- Monorepos with multiple OpenSpec directories
- Projects with non-standard OpenSpec locations
- Shared OpenSpec across projects

**Behavior**:
- OpenSpec CLI invocations use `--path` flag with custom path
- Falls back to `./openspec` if not specified
- Relative paths resolved from project directory

**Alternatives considered**:
- **Hardcode ./openspec**: Inflexible for edge cases
- **Auto-discover OpenSpec**: Too magical, unclear behavior
- **Per-agent OpenSpec path**: Over-complicated

### Soft Delete: Archive Instead of Hard Delete

**Decision**: Use `archived_at` timestamp for soft deletion instead of hard deletes.

**Rationale**:
- **Data preservation**: Retain project history for analytics
- **Undo capability**: Can restore archived projects
- **Agent integrity**: Existing agents maintain project references
- **Compliance**: Audit trail for project lifecycle

**Behavior**:
- `DELETE /api/projects/[id]` sets `archived_at` timestamp
- Archived projects excluded from default queries (WHERE `archived_at IS NULL`)
- Can restore via `PATCH /api/projects/[id]` with `archived_at: null`
- Hard delete requires manual database operation (future admin API)

**Foreign key behavior**: `ON DELETE SET NULL` (agents keep project_id but it's orphaned)

**Alternatives considered**:
- **Hard delete**: Loses history, breaks agent references
- **Cascade delete agents**: Too destructive
- **Mark agents as archived**: Over-complicated

### Denormalized Counts: agent_count and active_agent_count

**Decision**: Store agent counts directly on projects table instead of expensive COUNT queries.

**Schema fields**:
- `agent_count` - Total agents ever created for this project
- `active_agent_count` - Agents with lifecycle_state IN ('running', 'paused')

**Rationale**:
- **Performance**: Avoid COUNT(*) queries on agents table (can be slow with 100k+ agents)
- **Dashboard optimization**: Projects list needs counts for all projects
- **Acceptable staleness**: Counts can be slightly out of sync, eventual consistency acceptable

**Consistency strategy**:
- Increment `agent_count` on agent creation (trigger or repository method)
- Increment `active_agent_count` on agent start, decrement on completion/stop
- Periodic reconciliation job to fix inconsistencies (every 24 hours)

**Alternatives considered**:
- **Always query COUNT**: Slow for large datasets
- **Materialized view**: Overkill for SQLite
- **Cache layer**: Adds complexity

## Risks / Trade-offs

### Risk: Auto-Creation Spam
**Scenario**: User spawns agents in many directories, creating excessive projects.
**Mitigation**:
- Implement project archival (hide unused projects after 90 days)
- Add manual archive/delete capability
- Show "recently used" by default, hide old projects

### Risk: Directory Collisions
**Scenario**: Two users share same directory path (e.g., shared network drive).
**Mitigation**:
- Out of scope for single-user desktop application
- Future multi-user support requires user_id on projects table

### Risk: Denormalized Count Inconsistency
**Scenario**: Counts drift from actual agent numbers due to bugs or crashes.
**Mitigation**:
- Implement reconciliation job (runs on startup and every 24 hours)
- Add `/api/admin/projects/reconcile` endpoint for manual fix
- Log count mismatches for monitoring

### Trade-off: Auto-Naming vs Manual Naming
**Decision**: Auto-generate names, allow manual rename.
**Trade-off**: Auto-names may be ugly (e.g., "my-project-foo-bar-2"), but avoids blocking user flow.
**Justification**: Users can rename later, convenience > aesthetics.

### Trade-off: Optional vs Required Project Linking
**Decision**: Optional `project_id` on agents.
**Trade-off**: Some agents may not be linked (data inconsistency), but avoids breaking existing agents.
**Justification**: Gradual migration preferred over forced breaking change.

## Migration Plan

### Database Migration (Version 2)

1. Create `projects` table with all columns and indexes
2. Add `project_id` column to `agents` table (nullable)
3. Add `project_id` column to `agent_configs` table (nullable, for future)
4. Create indexes on foreign keys

**Migration SQL**:
```sql
-- Create projects table
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

CREATE INDEX idx_projects_directory ON projects(directory);
CREATE INDEX idx_projects_last_used ON projects(last_used DESC);
CREATE INDEX idx_projects_favorite ON projects(is_favorite DESC, last_used DESC);
CREATE INDEX idx_projects_archived ON projects(archived_at);

-- Add project references to agents
ALTER TABLE agents ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_agents_project_id ON agents(project_id);

-- Add project references to agent_configs (future)
ALTER TABLE agent_configs ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_agent_configs_project_id ON agent_configs(project_id);
```

### Data Migration: Backfill Projects from Agents

After schema migration, backfill projects from existing agent directories:

```sql
-- Create projects from unique agent directories
INSERT INTO projects (id, name, directory, agent_count, last_used, created_at, updated_at)
SELECT
  'project_' || substr(md5(directory), 1, 16) as id,
  CASE
    WHEN instr(directory, '/') > 0
    THEN substr(directory, length(directory) - instr(reverse(directory), '/') + 2)
    ELSE directory
  END as name,
  directory,
  COUNT(*) as agent_count,
  MAX(start_time) as last_used,
  MIN(start_time) as created_at,
  MAX(start_time) as updated_at
FROM agents
GROUP BY directory;

-- Link agents to projects
UPDATE agents
SET project_id = (
  SELECT id FROM projects WHERE projects.directory = agents.directory
);

-- Update active agent counts
UPDATE projects
SET active_agent_count = (
  SELECT COUNT(*)
  FROM agents
  WHERE agents.project_id = projects.id
    AND agents.lifecycle_state IN ('running', 'paused')
);
```

### Rollback Plan

1. Set `ENABLE_PROJECTS=false` to disable project features
2. Agents continue to work with directory-only logic
3. Projects table remains but is not used
4. Can re-enable later without data loss

## Open Questions

1. **Auto-naming strategy**: Should we attempt git/package.json parsing, or just use directory basename?
   - **Proposed**: Start with basename, add smarter naming in future iteration

2. **Project discovery API**: Should we scan filesystem for potential projects (e.g., all dirs with .git)?
   - **Proposed**: Yes, add `GET /api/projects/discover?path=/base/path` for manual discovery

3. **Project hierarchies**: Should we support parent/child project relationships (monorepos)?
   - **Proposed**: Out of scope, flat structure for now

4. **Project templates**: Should projects support template configurations (common agent setups)?
   - **Proposed**: Out of scope, separate feature for Phase 4

5. **Shared projects**: Should projects support multi-user access (via Tailscale)?
   - **Proposed**: Out of scope, single-user only for now
