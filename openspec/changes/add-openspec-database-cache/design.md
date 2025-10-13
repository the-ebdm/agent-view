# Design: OpenSpec Database Cache

## Context

Agent View's Phase 3 OpenSpec integration reads from the filesystem on every API request, parsing CLI output and files dynamically. This approach is simple but has performance and accuracy problems. We need a database cache layer that stores OpenSpec metadata with accurate git timestamps while maintaining git as the single source of truth.

### Constraints
- **Git is source of truth** - Database is ephemeral cache, can be rebuilt from git
- **Accurate timestamps required** - Must extract real commit times from git history
- **Backward compatible** - Existing API contracts must not break
- **Performance critical** - Dashboard loads must be <100ms
- **Simple sync model** - Avoid complex two-way merge conflicts

### Stakeholders
- **Developers** - Need accurate "last updated" times in UI
- **UI performance** - Fast dashboard rendering without filesystem scans
- **Future features** - Rich metadata support (validation history, user annotations)

## Goals / Non-Goals

### Goals
1. **Accurate timestamps** - Show real git commit times, not current time
2. **Fast queries** - Database indexes for sub-100ms dashboard loads
3. **Rich metadata** - Support validation status, favorites, tags, notes
4. **Bidirectional sync** - Git → DB (load) and DB → Git (commit UI edits)
5. **Staleness detection** - Know when DB is out of sync with filesystem

### Non-Goals
1. **Real-time file watching** - Manual sync or startup check only (Phase 1)
2. **Automatic git commits** - UI edits write to DB, manual commit via button
3. **Complex merge resolution** - Warn on conflicts, prefer git version
4. **Version history in DB** - Git stores history, DB only caches current state
5. **Cross-project sync** - Only sync current project's openspec/ directory

## Decisions

### 1. Database Schema Design

**Decision**: Create three tables mirroring OpenSpec structure (specs, changes, archives).

**Why**:
- Matches existing TypeScript types (`CapabilitySpec`, `ChangeProposal`, `ArchivedChange`)
- Allows independent querying of each entity type
- Enables per-entity metadata (validation status, favorites)
- Simplifies sync logic (clear mapping between filesystem and database)

**Schema**:
```sql
CREATE TABLE openspec_specs (
  id TEXT PRIMARY KEY,                  -- Capability ID (e.g., "agent-management")
  name TEXT NOT NULL,                   -- Display name
  path TEXT NOT NULL,                   -- Relative path (e.g., "openspec/specs/agent-management/spec.md")
  content TEXT NOT NULL,                -- Full markdown content
  requirement_count INTEGER NOT NULL,   -- Parsed from content
  scenario_count INTEGER NOT NULL,      -- Parsed from content
  git_sha TEXT,                         -- Git commit hash of last change
  created_at INTEGER NOT NULL,          -- First git commit time (milliseconds)
  updated_at INTEGER NOT NULL,          -- Last git commit time (milliseconds)
  last_synced_at INTEGER NOT NULL       -- When DB was last synced from filesystem
);

CREATE TABLE openspec_changes (
  id TEXT PRIMARY KEY,                  -- Change ID (e.g., "add-openspec-database-cache")
  name TEXT NOT NULL,                   -- Display name (derived from ID)
  path TEXT NOT NULL,                   -- Relative path (e.g., "openspec/changes/add-openspec-database-cache")
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed')),
  validation_status TEXT NOT NULL CHECK(validation_status IN ('pending', 'validating', 'valid', 'invalid')),
  validation_errors TEXT,               -- JSON array of validation errors
  task_count INTEGER NOT NULL,          -- Parsed from tasks.md
  completed_task_count INTEGER NOT NULL,-- Parsed from tasks.md
  progress_percentage INTEGER NOT NULL, -- Calculated
  proposal_content TEXT,                -- proposal.md content
  design_content TEXT,                  -- design.md content (optional)
  tasks_content TEXT,                   -- tasks.md content
  git_sha TEXT,                         -- Git commit hash of last change
  created_at INTEGER NOT NULL,          -- First git commit time
  updated_at INTEGER NOT NULL,          -- Last git commit time (any file in change dir)
  last_synced_at INTEGER NOT NULL,      -- When DB was last synced
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT                             -- JSON array of user tags
);

CREATE TABLE openspec_archives (
  id TEXT PRIMARY KEY,                  -- Archive ID (e.g., "2024-10-01-fix-agent-bug")
  name TEXT NOT NULL,                   -- Display name
  path TEXT NOT NULL,                   -- Relative path
  archived_at INTEGER NOT NULL,         -- When moved to archive/ (git commit time)
  git_sha TEXT,                         -- Git commit hash
  created_at INTEGER NOT NULL,          -- Original creation time
  updated_at INTEGER NOT NULL,          -- Last update before archiving
  last_synced_at INTEGER NOT NULL       -- When DB was last synced
);

-- Indexes for fast queries
CREATE INDEX idx_specs_updated_at ON openspec_specs(updated_at DESC);
CREATE INDEX idx_changes_status ON openspec_changes(status);
CREATE INDEX idx_changes_updated_at ON openspec_changes(updated_at DESC);
CREATE INDEX idx_changes_favorite ON openspec_changes(is_favorite DESC, updated_at DESC);
CREATE INDEX idx_archives_archived_at ON openspec_archives(archived_at DESC);
```

**Alternatives Considered**:
- Single `openspec_entities` table with `type` column - Rejected: harder to query, different metadata per type
- Store requirements as separate rows - Rejected: adds complexity, not needed for current use cases

### 2. Git Timestamp Extraction

**Decision**: Use `git log` command to extract accurate commit timestamps per file.

**Why**:
- Git already tracks precise commit times
- No need to parse `.git` internals
- Works for any file or directory
- Handles renames and moves correctly

**Implementation**:
```typescript
// src/lib/openspec/git-utils.ts
export async function getGitTimestamp(filePath: string): Promise<Date | null> {
  try {
    // Get last commit timestamp for file (Unix timestamp)
    const { stdout } = await execAsync(
      `git log -1 --format=%ct "${filePath}"`,
      { cwd: process.cwd(), timeout: 2000 }
    );

    const timestamp = parseInt(stdout.trim(), 10);
    return timestamp > 0 ? new Date(timestamp * 1000) : null;
  } catch (error) {
    console.warn(`Failed to get git timestamp for ${filePath}:`, error);
    return null;
  }
}

// For directories (changes), get most recent commit across all files
export async function getDirectoryTimestamp(dirPath: string): Promise<Date | null> {
  try {
    // Get most recent commit in directory
    const { stdout } = await execAsync(
      `git log -1 --format=%ct -- "${dirPath}"`,
      { cwd: process.cwd(), timeout: 2000 }
    );

    const timestamp = parseInt(stdout.trim(), 10);
    return timestamp > 0 ? new Date(timestamp * 1000) : null;
  } catch (error) {
    console.warn(`Failed to get directory timestamp for ${dirPath}:`, error);
    return null;
  }
}
```

**Fallback Strategy**:
- If git timestamp fails (not in repo, file not committed), use `fs.stat().mtime`
- Log warning but continue sync (allow uncommitted work)

### 3. Sync Strategy

**Decision**: Three sync modes - startup check, manual trigger, and lazy sync on write.

**Why**:
- Startup check ensures DB is current on server restart
- Manual trigger lets users force refresh after git operations
- Lazy sync on write keeps DB updated without overhead

**Sync Modes**:

1. **Startup Sync** (automatic)
   - On server startup, check if any OpenSpec files changed since `last_synced_at`
   - If stale, run full sync from filesystem
   - Log sync status and any errors

2. **Manual Sync** (API endpoint)
   - `POST /api/openspec/sync` - Force full sync
   - Returns sync summary (added, updated, removed)
   - Used after git pull, branch switches, etc.

3. **Lazy Sync on Write** (automatic)
   - When UI saves a file, update DB record
   - Set `last_synced_at` to current time
   - Don't sync from filesystem (trust write)

**Sync Algorithm**:
```typescript
// src/lib/openspec/sync.ts
export async function syncFromFilesystem(options?: SyncOptions): Promise<SyncResult> {
  const stats = { added: 0, updated: 0, removed: 0, errors: [] };

  // 1. List all entities from filesystem (via CLI)
  const [specs, changes, archives] = await Promise.all([
    listSpecsFromFS(),
    listChangesFromFS(),
    listArchivesFromFS()
  ]);

  // 2. For each entity, extract git timestamp and parse content
  for (const spec of specs) {
    const gitTimestamp = await getGitTimestamp(spec.path);
    const content = await fs.readFile(spec.path, 'utf-8');
    const parsed = parseSpec(content);

    // 3. Upsert to database
    const existing = await openspecRepo.getSpec(spec.id);
    if (!existing) {
      await openspecRepo.createSpec({
        ...spec,
        content,
        requirementCount: parsed.requirements.length,
        scenarioCount: parsed.scenarios.length,
        createdAt: gitTimestamp,
        updatedAt: gitTimestamp,
        lastSyncedAt: Date.now()
      });
      stats.added++;
    } else if (existing.updatedAt < gitTimestamp) {
      await openspecRepo.updateSpec(spec.id, {
        content,
        requirementCount: parsed.requirements.length,
        scenarioCount: parsed.scenarios.length,
        updatedAt: gitTimestamp,
        lastSyncedAt: Date.now()
      });
      stats.updated++;
    }
  }

  // 4. Remove database entries for deleted files
  const dbSpecs = await openspecRepo.listSpecs();
  for (const dbSpec of dbSpecs) {
    if (!specs.find(s => s.id === dbSpec.id)) {
      await openspecRepo.deleteSpec(dbSpec.id);
      stats.removed++;
    }
  }

  // Repeat for changes and archives...

  return stats;
}
```

### 4. API Layer Changes

**Decision**: Update `/api/openspec/list` to query database, add `/api/openspec/sync` endpoint.

**Why**:
- Existing API contracts preserved (response types unchanged)
- Database queries are 10-100x faster than filesystem scans
- Sync endpoint provides manual control for developers

**Implementation**:
```typescript
// src/app/api/openspec/list/route.ts (updated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const useCache = searchParams.get('cache') !== 'false';

    // Check if database sync is stale (>5 minutes since last sync)
    const syncStatus = await openspecRepo.getSyncStatus();
    if (syncStatus.isStale && useCache) {
      console.log('[OpenSpec] Database is stale, triggering sync...');
      await syncFromFilesystem();
    }

    // Query database (fast!)
    const [specs, changes, archives] = await Promise.all([
      type === 'spec' || !type ? openspecRepo.listSpecs() : [],
      type === 'change' || !type ? openspecRepo.listChanges() : [],
      type === 'archive' || !type ? openspecRepo.listArchives() : []
    ]);

    return NextResponse.json({
      specs,
      changes,
      archives,
      syncedAt: syncStatus.lastSyncedAt
    });
  } catch (error) {
    // Fallback to filesystem if database fails
    console.error('[OpenSpec] Database query failed, falling back to filesystem:', error);
    return fallbackToFilesystem();
  }
}
```

```typescript
// src/app/api/openspec/sync/route.ts (new)
export async function POST(request: NextRequest) {
  try {
    const result = await syncFromFilesystem({ force: true });

    return NextResponse.json({
      success: true,
      stats: result
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 5. Conflict Detection

**Decision**: Warn users if file modified externally while editing in UI, prefer filesystem version.

**Why**:
- Single-user local dev means conflicts are rare
- Git is source of truth, always trust filesystem over DB
- Simple conflict resolution: reload from filesystem

**Detection**:
- Before saving from UI, check if `git_sha` matches current file
- If mismatch, show warning: "File changed externally, reload to see latest version?"
- User can choose: Overwrite or Cancel

**Future Enhancement** (Phase 2):
- File watching via `chokidar` to detect external changes
- Auto-reload UI when files change outside browser

## Risks / Trade-offs

### Risk 1: Git Operations Overhead
**Risk**: Running `git log` for every file during sync could be slow (100+ files).

**Mitigation**:
- Batch git operations: Single `git log` command for all files
- Use `git log --name-status` to get timestamps for multiple files at once
- Cache git timestamps for 5 minutes during sync
- Parallelize file parsing (Promise.all)

**Acceptance**: If sync exceeds 2s, optimize git commands or use libgit2 bindings.

### Risk 2: Database Staleness
**Risk**: Database could be stale if user edits files via external editor.

**Mitigation**:
- Startup sync checks for staleness automatically
- Manual sync button in UI
- Show "Last synced X minutes ago" in dashboard footer
- Future: File watching for real-time sync

**Acceptance**: Users can manually trigger sync if needed. Rare in practice.

### Risk 3: Schema Version Conflicts
**Risk**: Existing databases at schema v2, need migration to v3.

**Mitigation**:
- Migration system already in place (`runMigrations`)
- v2 → v3 migration just adds new tables (non-breaking)
- Existing agent/project data unaffected

**Implementation**:
```typescript
function migrateV2toV3(db: Database.Database): void {
  console.log('[Schema] Migrating schema from version 2 to 3...');

  // Create OpenSpec cache tables
  db.exec(`
    CREATE TABLE openspec_specs (...);
    CREATE TABLE openspec_changes (...);
    CREATE TABLE openspec_archives (...);
  `);

  console.log('[Schema] Migration to version 3 complete');
}
```

### Risk 4: Git Timestamp Failures
**Risk**: Files not in git yet (new proposals) won't have git timestamps.

**Mitigation**:
- Fallback to `fs.stat().mtime` if git log fails
- Show warning in logs but continue
- Allow uncommitted work in UI

**Acceptance**: Uncommitted files show filesystem mtime, which is close enough.

## Migration Plan

### Phase 1: Database Schema (Week 1)
1. Add schema v3 migration (openspec tables)
2. Create OpenSpec repository class
3. Implement git timestamp utilities
4. Write sync logic (git → DB)
5. Add startup sync check

**Validation**: Database populated with OpenSpec entities on startup.

### Phase 2: API Integration (Week 1)
1. Update `/api/openspec/list` to query database
2. Add `/api/openspec/sync` endpoint
3. Add sync status to dashboard footer
4. Maintain fallback to filesystem if DB fails

**Validation**: Dashboard loads <100ms, shows accurate timestamps.

### Phase 3: Metadata Support (Week 2)
1. Add favorites/tags UI in OpenSpec cards
2. Store user metadata in database
3. Add filtering by tags/favorites
4. Persist validation status in DB

**Validation**: Can favorite changes, filter by tags, see validation history.

## Open Questions

### Q1: Should we cache parsed requirements/scenarios separately?
**Status**: Defer to Phase 2.

**Reasoning**: Current use case just needs counts. Parsing on read is fast enough. If we add requirement-level search later, revisit.

### Q2: How often should we check for staleness?
**Status**: Check on startup + manual sync button.

**Decision**: Don't auto-check on every request (too much overhead). Show "Last synced" time in UI, user can manually refresh.

### Q3: Should we auto-commit UI edits to git?
**Status**: No, manual commit only.

**Reasoning**: Users might want to batch edits or write commit messages. Provide "Commit Changes" button in UI (future enhancement).

### Q4: Do we need full-text search across requirements?
**Status**: Defer to Phase 4.

**Reasoning**: Current dashboard uses card filtering. If we add advanced search, add `requirements` and `scenarios` tables with FTS5.
