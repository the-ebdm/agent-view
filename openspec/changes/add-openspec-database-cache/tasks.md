# Implementation Tasks

## 1. Database Schema and Migration

- [ ] 1.1 Add openspec_specs table definition to schema.ts
- [ ] 1.2 Add openspec_changes table definition to schema.ts
- [ ] 1.3 Add openspec_archives table definition to schema.ts
- [ ] 1.4 Create indexes for query performance (updated_at, status, is_favorite)
- [ ] 1.5 Implement migrateV2toV3 function in schema.ts
- [ ] 1.6 Update CURRENT_SCHEMA_VERSION to 3
- [ ] 1.7 Test migration on database at schema v2
- [ ] 1.8 Test fresh database initialization with schema v3

## 2. Git Timestamp Utilities

- [ ] 2.1 Create src/lib/openspec/git-utils.ts
- [ ] 2.2 Implement getGitTimestamp(filePath) function
- [ ] 2.3 Implement getDirectoryTimestamp(dirPath) function
- [ ] 2.4 Add timeout protection (2000ms) for git commands
- [ ] 2.5 Add error handling and fallback to fs.stat().mtime
- [ ] 2.6 Add tests for git timestamp extraction
- [ ] 2.7 Test with committed and uncommitted files

## 3. OpenSpec Repository

- [ ] 3.1 Create src/lib/database/repositories/openspec.ts
- [ ] 3.2 Implement createSpec, getSpec, updateSpec, deleteSpec methods
- [ ] 3.3 Implement listSpecs with ordering and filtering
- [ ] 3.4 Implement createChange, getChange, updateChange, deleteChange methods
- [ ] 3.5 Implement listChanges with status and favorite filters
- [ ] 3.6 Implement createArchive, getArchive, listArchives methods
- [ ] 3.7 Implement getSyncStatus method
- [ ] 3.8 Add TypeScript types for repository methods
- [ ] 3.9 Test repository CRUD operations
- [ ] 3.10 Test query performance with 50+ entities

## 4. Filesystem Sync Logic

- [ ] 4.1 Create src/lib/openspec/sync.ts
- [ ] 4.2 Implement syncFromFilesystem function
- [ ] 4.3 Add spec syncing: list, parse, extract timestamps, upsert to DB
- [ ] 4.4 Add change syncing: list, parse tasks.md, extract timestamps, upsert to DB
- [ ] 4.5 Add archive syncing: list, extract timestamps, upsert to DB
- [ ] 4.6 Implement entity removal detection (delete from DB if file missing)
- [ ] 4.7 Add sync statistics tracking (added, updated, removed, errors)
- [ ] 4.8 Add concurrent sync protection (lock mechanism)
- [ ] 4.9 Add incremental sync optimization (mtime checks)
- [ ] 4.10 Test full sync with realistic OpenSpec directory
- [ ] 4.11 Test incremental sync performance

## 5. Startup Sync Integration

- [ ] 5.1 Add startup sync check in src/app/layout.tsx or server init
- [ ] 5.2 Implement staleness detection (last_synced_at > 5 min)
- [ ] 5.3 Trigger sync if stale or empty database
- [ ] 5.4 Log sync status and statistics
- [ ] 5.5 Handle sync errors gracefully on startup
- [ ] 5.6 Test startup sync with stale database
- [ ] 5.7 Test startup skip when database current

## 6. API Endpoint Updates

- [ ] 6.1 Update src/app/api/openspec/list/route.ts to query database
- [ ] 6.2 Add staleness check to list endpoint
- [ ] 6.3 Add fallback to filesystem if database query fails
- [ ] 6.4 Add syncedAt timestamp to API response
- [ ] 6.5 Remove 30-second cache logic (replaced by database)
- [ ] 6.6 Test list endpoint performance (<100ms)
- [ ] 6.7 Test list endpoint with various filters

## 7. Manual Sync API Endpoint

- [ ] 7.1 Create src/app/api/openspec/sync/route.ts
- [ ] 7.2 Implement POST handler for manual sync
- [ ] 7.3 Add force sync option via query parameter
- [ ] 7.4 Return sync statistics in response
- [ ] 7.5 Add error handling and logging
- [ ] 7.6 Test manual sync via API
- [ ] 7.7 Test force sync option

## 8. Validation Status Integration

- [ ] 8.1 Update src/app/api/openspec/validate/[id]/route.ts
- [ ] 8.2 Store validation result in database after validation
- [ ] 8.3 Update validation_status field ('valid' or 'invalid')
- [ ] 8.4 Store validation_errors as JSON array
- [ ] 8.5 Clear stale validation status when file changes
- [ ] 8.6 Test validation status persistence

## 9. UI Sync Status Display

- [ ] 9.1 Add sync status query to dashboard
- [ ] 9.2 Display "Last synced: X minutes ago" in footer
- [ ] 9.3 Show warning icon if database stale (>5 min)
- [ ] 9.4 Add "Sync Now" button in UI
- [ ] 9.5 Show "Syncing..." indicator during sync operation
- [ ] 9.6 Display sync success or error notification
- [ ] 9.7 Test UI sync status display
- [ ] 9.8 Test manual sync button functionality

## 10. Write-back Sync (Database to Filesystem)

- [ ] 10.1 Update edit endpoints to write to filesystem
- [ ] 10.2 Update database record after filesystem write
- [ ] 10.3 Implement conflict detection (git SHA comparison)
- [ ] 10.4 Add warning UI for external modifications
- [ ] 10.5 Test save with no conflicts
- [ ] 10.6 Test save with external file modifications

## 11. Performance Optimization

- [ ] 11.1 Implement parallel git timestamp extraction
- [ ] 11.2 Add batch limit (10 concurrent git operations)
- [ ] 11.3 Optimize incremental sync with mtime checks
- [ ] 11.4 Verify database query indexes are used
- [ ] 11.5 Benchmark sync performance (50+ entities in <2s)
- [ ] 11.6 Benchmark list query performance (<50ms)

## 12. Testing and Validation

- [ ] 12.1 Test with fresh database (no OpenSpec records)
- [ ] 12.2 Test with stale database (old timestamps)
- [ ] 12.3 Test with uncommitted files (new proposals)
- [ ] 12.4 Test with deleted files (removed from filesystem)
- [ ] 12.5 Test concurrent sync attempts
- [ ] 12.6 Test git timestamp extraction failures
- [ ] 12.7 Test database query failures (fallback to filesystem)
- [ ] 12.8 Test full end-to-end workflow (edit → save → sync → display)

## 13. Documentation

- [ ] 13.1 Document database schema in schema.ts comments
- [ ] 13.2 Document sync API endpoint in API docs
- [ ] 13.3 Add JSDoc comments to git-utils functions
- [ ] 13.4 Add JSDoc comments to sync functions
- [ ] 13.5 Add JSDoc comments to repository methods
- [ ] 13.6 Update project README with sync behavior

## 14. Final Validation

- [ ] 14.1 Run `openspec validate add-openspec-database-cache --strict`
- [ ] 14.2 Fix any validation errors
- [ ] 14.3 Test on development server with realistic data
- [ ] 14.4 Verify accurate timestamps displayed in UI
- [ ] 14.5 Verify sync performance meets targets (<2s full sync)
- [ ] 14.6 Code review with project maintainer
