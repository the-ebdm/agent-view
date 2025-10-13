# OpenSpec Database Cache

## Why

The OpenSpec integration in Phase 3 currently reads directly from the filesystem on every API request, causing several problems:

- **Inaccurate timestamps** - `updatedAt` is set to `new Date()` on every read, showing "Updated 2 mins ago" for all entities regardless of actual modification time
- **Slow performance** - Parsing CLI output and reading files on every dashboard load adds latency
- **No metadata storage** - Cannot store validation status, user notes, favorites, or tags
- **Primitive caching** - 30-second in-memory cache is basic and doesn't survive server restarts
- **No historical tracking** - Cannot query when specs changed or track validation history
- **Missed query opportunities** - Cannot efficiently search or filter across requirements

A database cache layer solves these issues by:
- Storing accurate timestamps from git commit history
- Providing fast indexed queries for dashboard rendering
- Enabling rich metadata (validation status, user annotations)
- Supporting bidirectional sync (git → DB for loading, DB → git for UI edits)
- Maintaining git as single source of truth (DB is ephemeral cache)

## What Changes

Add SQLite database caching for OpenSpec entities with bidirectional git synchronization:

**Core Caching**
- Create `openspec_specs`, `openspec_changes`, and `openspec_archives` tables to cache entity metadata
- Store accurate `updated_at` timestamps from `git log` for each file
- Cache parsed content (requirements, scenarios, tasks) for fast queries
- Track validation status and errors per change
- Support user metadata (favorites, tags, notes)

**Git Integration**
- Git timestamp detection: Extract commit time via `git log -1 --format=%ct <file>`
- Sync on startup: Check if DB is stale, refresh from filesystem if needed
- Manual sync trigger: API endpoint to force refresh from git
- File watching (future): Detect external file changes and auto-sync

**Bidirectional Sync**
- **Git → DB (load)**: Parse OpenSpec files, extract git timestamps, store in database
- **DB → Git (save)**: Write database changes back to filesystem, commit via git (manual or automatic)
- **Conflict detection**: Warn if file modified externally while editing in UI
- **Sync status tracking**: `last_synced_at` timestamp to detect staleness

**API Enhancements**
- Replace filesystem reads with database queries in `/api/openspec/list`
- Add `/api/openspec/sync` endpoint for manual git → DB synchronization
- Add sync status to API responses (e.g., `syncedAt`, `isStale`)
- Maintain backward compatibility with existing API contracts

## Impact

- **Depends on**: `add-sqlite-persistence` (database infrastructure)
- **Enhances**: `add-phase3-openspec-integration` (faster, more accurate UI)
- **New capabilities**: `openspec-persistence`, `openspec-sync`
- **Affected capabilities**: `openspec-viewer` (from Phase 3)
- **Affected code**:
  - `src/lib/openspec/cli-wrapper.ts` - Add database read/write logic
  - `src/lib/openspec/fs-operations.ts` - Add git timestamp extraction
  - `src/lib/database/schema.ts` - Add OpenSpec tables (schema v3 migration)
  - New: `src/lib/database/repositories/openspec.ts` - OpenSpec repository
  - New: `src/lib/openspec/git-utils.ts` - Git timestamp utilities
  - New: `src/lib/openspec/sync.ts` - Bidirectional sync logic
  - `src/app/api/openspec/list/route.ts` - Query database instead of filesystem
  - New: `src/app/api/openspec/sync/route.ts` - Manual sync endpoint
- **Migration required**: Yes (schema v2 → v3: add openspec_specs, openspec_changes, openspec_archives tables)
- **Breaking changes**: None (API contracts preserved, performance improved)
- **Dependencies**: No new dependencies (uses existing `better-sqlite3`, filesystem access, git CLI)
