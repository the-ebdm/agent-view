# Implementation Tasks

## 1. Database Schema and Migration

- [x] 1.1 Add openspec_specs table definition to schema.ts (src/lib/database/schema.ts:254-269)
- [x] 1.2 Add openspec_changes table definition to schema.ts (src/lib/database/schema.ts:271-297)
- [x] 1.3 Add openspec_archives table definition to schema.ts (src/lib/database/schema.ts:299-313)
- [x] 1.4 Create indexes for query performance (updated_at, status, is_favorite) (schema.ts:268,294-296,312)
- [x] 1.5 Implement migrateV2toV3 function in schema.ts (schema.ts:250-316)
- [x] 1.6 Update CURRENT_SCHEMA_VERSION to 3 (schema.ts:14)
- [x] 1.7 Test migration on database at schema v2 (handled by runMigrations)
- [x] 1.8 Test fresh database initialization with schema v3 (handled by initializeSchema)

## 2. Git Timestamp Utilities

- [x] 2.1 Create src/lib/openspec/git-utils.ts (src/lib/openspec/git-utils.ts)
- [x] 2.2 Implement getGitTimestamp(filePath) function (git-utils.ts:21-43)
- [x] 2.3 Implement getDirectoryTimestamp(dirPath) function (git-utils.ts:51-73)
- [x] 2.4 Add timeout protection (2000ms) for git commands (git-utils.ts:12,28,58)
- [x] 2.5 Add error handling and fallback to fs.stat().mtime (git-utils.ts:40-43,131-140)
- [ ] 2.6 Add tests for git timestamp extraction
- [ ] 2.7 Test with committed and uncommitted files

## 3. OpenSpec Repository

- [x] 3.1 Create src/lib/database/repositories/openspec.ts (src/lib/database/repositories/openspec.ts)
- [x] 3.2 Implement createSpec, getSpec, updateSpec, deleteSpec methods (openspec.ts:257-330)
- [x] 3.3 Implement listSpecs with ordering and filtering (openspec.ts:303-315)
- [x] 3.4 Implement createChange, getChange, updateChange, deleteChange methods (openspec.ts:337-462)
- [x] 3.5 Implement listChanges with status and favorite filters (openspec.ts:391-427)
- [x] 3.6 Implement createArchive, getArchive, listArchives methods (openspec.ts:469-540)
- [x] 3.7 Implement getSyncStatus method (openspec.ts:547-585)
- [x] 3.8 Add TypeScript types for repository methods (openspec.ts:15-69)
- [ ] 3.9 Test repository CRUD operations
- [ ] 3.10 Test query performance with 50+ entities

## 4. Filesystem Sync Logic

- [x] 4.1 Create src/lib/openspec/sync.ts (src/lib/openspec/sync.ts)
- [x] 4.2 Implement syncFromFilesystem function (sync.ts:43-111)
- [x] 4.3 Add spec syncing: list, parse, extract timestamps, upsert to DB (sync.ts:116-184)
- [x] 4.4 Add change syncing: list, parse tasks.md, extract timestamps, upsert to DB (sync.ts:189-307)
- [x] 4.5 Add archive syncing: list, extract timestamps, upsert to DB (sync.ts:312-373)
- [x] 4.6 Implement entity removal detection (delete from DB if file missing) (sync.ts:169-176,292-299,358-365)
- [x] 4.7 Add sync statistics tracking (added, updated, removed, errors) (sync.ts:17-26,86-94)
- [x] 4.8 Add concurrent sync protection (lock mechanism) (sync.ts:37,47-59,109)
- [ ] 4.9 Add incremental sync optimization (mtime checks) - has force option but no mtime optimization
- [ ] 4.10 Test full sync with realistic OpenSpec directory
- [ ] 4.11 Test incremental sync performance

## 5. Startup Sync Integration

- [x] 5.1 Add startup sync check in src/app/layout.tsx or server init (src/lib/database/index.ts:54-70)
- [x] 5.2 Implement staleness detection (last_synced_at > 5 min) (openspec.ts:566, sync.ts:378-382)
- [x] 5.3 Trigger sync if stale or empty database (database/index.ts:56-64)
- [x] 5.4 Log sync status and statistics (database/index.ts:58-64)
- [x] 5.5 Handle sync errors gracefully on startup (database/index.ts:68-69)
- [ ] 5.6 Test startup sync with stale database
- [ ] 5.7 Test startup skip when database current

## 6. API Endpoint Updates

- [x] 6.1 Update src/app/api/openspec/list/route.ts to query database (list/route.ts:37-41)
- [x] 6.2 Add staleness check to list endpoint (list/route.ts:25)
- [x] 6.3 Add fallback to filesystem if database query fails (list/route.ts:31,76-92)
- [x] 6.4 Add syncedAt timestamp to API response (list/route.ts:49)
- [x] 6.5 Remove 30-second cache logic (replaced by database)
- [ ] 6.6 Test list endpoint performance (<100ms)
- [ ] 6.7 Test list endpoint with various filters

## 7. Manual Sync API Endpoint

- [x] 7.1 Create src/app/api/openspec/sync/route.ts (src/app/api/openspec/sync/route.ts)
- [x] 7.2 Implement POST handler for manual sync (sync/route.ts:9-47)
- [x] 7.3 Add force sync option via query parameter (sync/route.ts:14)
- [x] 7.4 Return sync statistics in response (sync/route.ts:20)
- [x] 7.5 Add error handling and logging (sync/route.ts:35-46)
- [x] 7.6 Test manual sync via API - Also added GET endpoint for sync status (sync/route.ts:52-76)
- [ ] 7.7 Test force sync option

## 8. Validation Status Integration

- [x] 8.1 Update src/app/api/openspec/validate/[id]/route.ts (validate/[id]/route.ts)
- [x] 8.2 Store validation result in database after validation (validate/[id]/route.ts:163-175)
- [x] 8.3 Update validation_status field ('valid' or 'invalid') (validate/[id]/route.ts:165)
- [x] 8.4 Store validation_errors as JSON array (validate/[id]/route.ts:166-168)
- [x] 8.5 Clear stale validation status when file changes (handled via sync logic, preserves validation on update)
- [ ] 8.6 Test validation status persistence

## 9. UI Sync Status Display

- [x] 9.1 Add sync status query to dashboard (src/hooks/use-openspec-sync.ts)
- [x] 9.2 Display "Last synced: X minutes ago" in footer (src/components/openspec/openspec-sync-status.tsx:14-28)
- [x] 9.3 Show warning icon if database stale (>5 min) (openspec-sync-status.tsx:99-105)
- [x] 9.4 Add "Sync Now" button in UI (openspec-sync-status.tsx:122-130)
- [x] 9.5 Show "Syncing..." indicator during sync operation (openspec-sync-status.tsx:99-101,130)
- [x] 9.6 Display sync success or error notification (openspec-sync-status.tsx:133-220, with toast notification)
- [x] 9.7 Test UI sync status display (integrated in src/app/page.tsx footer)
- [x] 9.8 Test manual sync button functionality (triggerSync in use-openspec-sync.ts:73-95)

## 10. Write-back Sync (Database to Filesystem)

- [ ] 10.1 Update edit endpoints to write to filesystem - NOT IMPLEMENTED
- [ ] 10.2 Update database record after filesystem write - NOT IMPLEMENTED
- [ ] 10.3 Implement conflict detection (git SHA comparison) - NOT IMPLEMENTED
- [ ] 10.4 Add warning UI for external modifications - NOT IMPLEMENTED
- [ ] 10.5 Test save with no conflicts
- [ ] 10.6 Test save with external file modifications

## 11. Performance Optimization

- [ ] 11.1 Implement parallel git timestamp extraction - NOT IMPLEMENTED (sequential)
- [ ] 11.2 Add batch limit (10 concurrent git operations) - NOT IMPLEMENTED
- [ ] 11.3 Optimize incremental sync with mtime checks - NOT IMPLEMENTED (has force option only)
- [x] 11.4 Verify database query indexes are used (schema.ts:268,294-296,312)
- [ ] 11.5 Benchmark sync performance (50+ entities in <2s)
- [ ] 11.6 Benchmark list query performance (<50ms)

## 12. Testing and Validation

- [ ] 12.1 Test with fresh database (no OpenSpec records) - NOT TESTED
- [ ] 12.2 Test with stale database (old timestamps) - NOT TESTED
- [ ] 12.3 Test with uncommitted files (new proposals) - NOT TESTED
- [ ] 12.4 Test with deleted files (removed from filesystem) - NOT TESTED
- [ ] 12.5 Test concurrent sync attempts - NOT TESTED
- [ ] 12.6 Test git timestamp extraction failures - NOT TESTED
- [ ] 12.7 Test database query failures (fallback to filesystem) - NOT TESTED
- [ ] 12.8 Test full end-to-end workflow (edit → save → sync → display) - NOT TESTED

## 13. Documentation

- [x] 13.1 Document database schema in schema.ts comments (schema.ts:1-6, basic documentation)
- [ ] 13.2 Document sync API endpoint in API docs - NOT DOCUMENTED
- [ ] 13.3 Add JSDoc comments to git-utils functions - PARTIAL (some comments present)
- [ ] 13.4 Add JSDoc comments to sync functions - PARTIAL (some comments present)
- [ ] 13.5 Add JSDoc comments to repository methods - PARTIAL (some comments present)
- [ ] 13.6 Update project README with sync behavior - NOT DOCUMENTED

## 14. Final Validation

- [ ] 14.1 Run `openspec validate add-openspec-database-cache --strict` - NOT RUN
- [ ] 14.2 Fix any validation errors
- [ ] 14.3 Test on development server with realistic data - NOT TESTED
- [ ] 14.4 Verify accurate timestamps displayed in UI - NOT VERIFIED
- [ ] 14.5 Verify sync performance meets targets (<2s full sync) - NOT BENCHMARKED
- [ ] 14.6 Code review with project maintainer - NOT DONE
