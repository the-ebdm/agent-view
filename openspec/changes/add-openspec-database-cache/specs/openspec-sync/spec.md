# OpenSpec Sync Capability

## ADDED Requirements

### Requirement: Filesystem to Database Sync
The system SHALL synchronize OpenSpec entities from filesystem to database with git timestamp extraction.

#### Scenario: Full sync from filesystem
- **WHEN** performing full sync operation
- **THEN** list all specs, changes, and archives from filesystem
- **AND** for each entity, extract git timestamp and parse content
- **AND** upsert entities to database (insert new, update existing)
- **AND** delete database records for removed files
- **AND** return sync statistics (added, updated, removed counts)

#### Scenario: Incremental sync (updated files only)
- **WHEN** performing incremental sync
- **THEN** compare filesystem file mtimes against database last_synced_at
- **AND** only sync files that changed since last sync
- **AND** skip unchanged files for performance
- **AND** complete sync in <500ms for typical incremental update

#### Scenario: Sync error handling
- **WHEN** sync operation encounters errors (git failures, parse errors)
- **THEN** log error with file path and details
- **AND** continue syncing remaining files
- **AND** include error summary in sync statistics
- **AND** do not leave database in inconsistent state

#### Scenario: Concurrent sync protection
- **WHEN** sync operation is already in progress
- **AND** another sync is triggered
- **THEN** queue second sync or skip if recent sync just completed
- **AND** prevent duplicate concurrent syncs
- **AND** return error if sync already running

### Requirement: Startup Sync Check
The system SHALL automatically check for database staleness on server startup and sync if needed.

#### Scenario: Detect stale database on startup
- **WHEN** server starts up
- **THEN** check most recent last_synced_at timestamp in database
- **AND** if last_synced_at is older than 5 minutes, trigger full sync
- **AND** log sync status (synced, skipped, errors)

#### Scenario: Skip sync if database current
- **WHEN** server starts with recently synced database (last_synced_at < 5 min ago)
- **THEN** skip sync operation
- **AND** log "Database is current, skipping sync"
- **AND** proceed to start server immediately

#### Scenario: Handle empty database on startup
- **WHEN** server starts with empty database (no OpenSpec records)
- **THEN** treat as stale and trigger full sync
- **AND** populate database from filesystem
- **AND** log number of entities synchronized

### Requirement: Manual Sync API Endpoint
The system SHALL provide API endpoint for manual sync triggering via UI or CLI.

#### Scenario: Trigger manual sync via API
- **WHEN** POST request sent to /api/openspec/sync
- **THEN** initiate full filesystem → database sync
- **AND** return sync statistics (added, updated, removed, errors)
- **AND** update all entities to current git timestamps
- **AND** respond within 2 seconds for typical repository

#### Scenario: Force sync option
- **WHEN** sync API called with force=true parameter
- **THEN** ignore last_synced_at timestamps
- **AND** re-sync all entities regardless of staleness
- **AND** useful for troubleshooting or after git operations

#### Scenario: Sync authentication
- **WHEN** sync API endpoint receives request
- **THEN** allow access (no authentication required for local dev server)
- **AND** in future, restrict to authenticated users if auth added

### Requirement: Sync Status Reporting
The system SHALL track and report sync status to users via API and UI.

#### Scenario: Get sync status
- **WHEN** querying sync status
- **THEN** return last_synced_at timestamp (most recent across all entities)
- **AND** return is_stale boolean (true if >5 minutes old)
- **AND** return sync_in_progress boolean if sync currently running

#### Scenario: Display sync status in UI
- **WHEN** user views OpenSpec dashboard
- **THEN** show "Last synced: X minutes ago" in footer
- **AND** show warning icon if database is stale (>5 min)
- **AND** provide "Sync Now" button to trigger manual sync

#### Scenario: Sync progress feedback
- **WHEN** sync operation is running
- **THEN** show "Syncing..." indicator in UI
- **AND** update sync statistics when complete
- **AND** display success or error message

### Requirement: Write-back Sync (Database to Filesystem)
The system SHALL support writing database changes back to filesystem when user edits via UI.

#### Scenario: Save UI edits to filesystem
- **WHEN** user saves edited content in UI (proposal, design, tasks)
- **THEN** write content to corresponding file in openspec/ directory
- **AND** update database record with new content and timestamp
- **AND** set last_synced_at to current time
- **AND** show success notification

#### Scenario: Detect external file modifications
- **WHEN** user attempts to save file that was modified externally
- **THEN** compare database git_sha with current file git SHA
- **AND** if mismatch, show warning: "File changed externally"
- **AND** offer options: Overwrite or Cancel and Reload

#### Scenario: Skip git commit on write
- **WHEN** saving file from UI
- **THEN** write to filesystem only (do not git commit)
- **AND** user must manually commit via git or UI commit button
- **AND** allow staging multiple edits before committing

### Requirement: Conflict Resolution
The system SHALL detect and handle conflicts between database cache and filesystem state.

#### Scenario: Filesystem file newer than database
- **WHEN** file on filesystem has newer commit than database record
- **THEN** mark database record as stale
- **AND** trigger sync to update database from filesystem
- **AND** log conflict resolution action

#### Scenario: Database record for non-existent file
- **WHEN** database contains record for file that no longer exists on filesystem
- **THEN** delete database record during sync
- **AND** log deletion as part of sync statistics

#### Scenario: Parse error during sync
- **WHEN** parsing file content fails (malformed markdown, invalid structure)
- **THEN** log error with file path and details
- **AND** skip updating database for that file
- **AND** preserve existing database record if present
- **AND** include in sync error statistics

### Requirement: Performance Optimization
The system SHALL optimize sync operations for minimal latency and resource usage.

#### Scenario: Parallel git timestamp extraction
- **WHEN** syncing multiple files
- **THEN** extract git timestamps in parallel using Promise.all
- **AND** batch up to 10 concurrent git log operations
- **AND** complete timestamp extraction for 50 files in <2 seconds

#### Scenario: Incremental sync based on mtime
- **WHEN** performing incremental sync
- **THEN** check filesystem mtime before extracting git timestamp
- **AND** skip files where mtime < last_synced_at (unchanged)
- **AND** reduce unnecessary git log operations

#### Scenario: Database query indexing
- **WHEN** querying OpenSpec entities from database
- **THEN** use indexes on updated_at, status, is_favorite
- **AND** complete typical list query in <50ms
- **AND** support 100+ entities without performance degradation
