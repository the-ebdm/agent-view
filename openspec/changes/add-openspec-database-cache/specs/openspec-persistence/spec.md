# OpenSpec Persistence Capability

## ADDED Requirements

### Requirement: OpenSpec Entity Database Storage
The system SHALL persist OpenSpec entities (specs, changes, archives) in SQLite database with accurate git-based timestamps.

#### Scenario: Store capability spec with git timestamp
- **WHEN** syncing a capability spec from filesystem to database
- **THEN** extract commit timestamp via `git log -1 --format=%ct <file>`
- **AND** store id, name, path, content, requirement count, scenario count, git SHA, created_at, updated_at, and last_synced_at
- **AND** create database indexes on updated_at for fast queries

#### Scenario: Store change proposal with metadata
- **WHEN** syncing a change proposal from filesystem to database
- **THEN** extract most recent commit timestamp from change directory
- **AND** parse tasks.md to calculate task counts and progress percentage
- **AND** store status, validation status, and content from proposal.md, design.md, tasks.md
- **AND** support user metadata (is_favorite, tags)

#### Scenario: Store archived change
- **WHEN** syncing an archived change from filesystem to database
- **THEN** extract archived_at timestamp from archive directory commit
- **AND** store archive metadata with original creation and update times

#### Scenario: Fallback to filesystem timestamp
- **WHEN** git timestamp extraction fails (file not committed, not in repo)
- **THEN** use filesystem modification time from fs.stat().mtime
- **AND** log warning but continue sync
- **AND** mark record as uncommitted

### Requirement: Database Schema Migration
The system SHALL provide schema v2 → v3 migration to add OpenSpec cache tables.

#### Scenario: Migrate existing database to v3
- **WHEN** server starts with database at schema version 2
- **THEN** run migration to create openspec_specs, openspec_changes, and openspec_archives tables
- **AND** create indexes for query performance
- **AND** update schema_version setting to 3
- **AND** preserve all existing agent, project, and config data

#### Scenario: Fresh database initialization
- **WHEN** initializing new database (schema version 0)
- **THEN** create all tables including OpenSpec tables
- **AND** set schema version to 3
- **AND** skip migrations

### Requirement: OpenSpec Repository Interface
The system SHALL provide repository interface for CRUD operations on OpenSpec entities.

#### Scenario: List all specs from database
- **WHEN** querying for all capability specs
- **THEN** return specs ordered by updated_at descending
- **AND** include all metadata (counts, timestamps, git SHA)
- **AND** complete query in <50ms for typical dataset (10-50 specs)

#### Scenario: List changes with filters
- **WHEN** querying for changes with status filter
- **THEN** return changes matching filter criteria
- **AND** support filtering by status, validation_status, is_favorite
- **AND** support ordering by updated_at, name, progress_percentage

#### Scenario: Get single entity by ID
- **WHEN** querying for specific spec, change, or archive by ID
- **THEN** return entity with all fields
- **AND** return null if not found
- **AND** include content fields (proposal, design, tasks)

#### Scenario: Update entity metadata
- **WHEN** updating spec or change metadata (favorites, tags, validation status)
- **THEN** update database record
- **AND** update last_synced_at timestamp
- **AND** preserve other fields unchanged

#### Scenario: Delete entity
- **WHEN** deleting entity from database (file removed from filesystem)
- **THEN** remove database record
- **AND** cascade delete related records if applicable

### Requirement: Git Timestamp Extraction
The system SHALL extract accurate commit timestamps from git history for OpenSpec files.

#### Scenario: Get file commit timestamp
- **WHEN** extracting timestamp for specific file
- **THEN** execute `git log -1 --format=%ct "<file>"` command
- **AND** parse Unix timestamp from stdout
- **AND** convert to milliseconds and return Date object
- **AND** complete in <200ms per file

#### Scenario: Get directory commit timestamp
- **WHEN** extracting timestamp for change directory
- **THEN** execute `git log -1 --format=%ct -- "<dir>"` command
- **AND** return most recent commit timestamp across all files in directory
- **AND** handle directories with multiple files

#### Scenario: Handle git command failures
- **WHEN** git log command fails or times out
- **THEN** log warning with file path and error
- **AND** return null to trigger fallback to filesystem mtime
- **AND** do not throw exception (allow sync to continue)

#### Scenario: Timeout protection
- **WHEN** executing git log command
- **THEN** set timeout to 2000ms
- **AND** abort command if timeout exceeded
- **AND** return null to trigger fallback

### Requirement: Validation Status Caching
The system SHALL cache validation results for changes in database.

#### Scenario: Store validation result
- **WHEN** change validation completes via `openspec validate`
- **THEN** update change record with validation_status ('valid' or 'invalid')
- **AND** store validation_errors as JSON array if invalid
- **AND** update last_synced_at timestamp

#### Scenario: Clear stale validation status
- **WHEN** change content is updated (files modified)
- **THEN** reset validation_status to 'pending'
- **AND** clear validation_errors
- **AND** require re-validation before showing valid status

#### Scenario: Query changes by validation status
- **WHEN** listing changes filtered by validation_status
- **THEN** return changes matching specified status
- **AND** support multiple status values (e.g., 'valid' OR 'pending')
