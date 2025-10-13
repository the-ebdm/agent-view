# Operational Maintenance

## ADDED Requirements

### System must recover agent sessions on startup

**Priority**: HIGH
**Category**: Data Persistence

When the server restarts, the system must recover active agent sessions from the database and restore them to the in-memory state, including their message history.

**Acceptance Criteria**:
- Active agents (lifecycle_state IN ('running', 'paused')) are restored to memory on startup
- Message history for each agent is loaded from database
- Recovery statistics are logged (agents restored, errors encountered)
- Recovery can be disabled via ENABLE_SESSION_RECOVERY environment variable
- Recovered agents appear in UI but do NOT automatically resume execution

#### Scenario: Server restarts with active agents

**Given** 3 agents are running with lifecycle_state = 'running'
**And** server process is stopped
**When** server starts up
**Then** database is queried for active agents
**And** all 3 agents are restored to activeAgents map
**And** message history is loaded for each agent
**And** log shows "Recovered 3 agent sessions"
**And** agents appear in UI with status "running"

#### Scenario: Server restarts with no active agents

**Given** all agents have lifecycle_state = 'stopped'
**And** server process is stopped
**When** server starts up
**Then** database is queried for active agents
**And** no agents are restored
**And** log shows "Recovered 0 agent sessions"

### System must run automated maintenance jobs

**Priority**: HIGH
**Category**: Operations

The system must run scheduled background jobs for database maintenance, including message retention cleanup, database vacuum, automatic backups, and count reconciliation.

**Acceptance Criteria**:
- Jobs are scheduled using cron syntax (e.g., daily at 2 AM)
- Each job has concurrent execution prevention (lock mechanism)
- Job execution is logged with duration and statistics
- Jobs can be disabled via ENABLE_BACKGROUND_JOBS environment variable
- Failed jobs are logged but do not crash the server

#### Scenario: Message retention job runs successfully

**Given** MESSAGE_RETENTION_DAYS setting is 30
**And** database has messages older than 30 days
**When** retention job executes (daily at 2 AM)
**Then** job acquires lock
**And** deletes messages WHERE timestamp < (now - 30 days)
**And** logs "Deleted 1523 messages older than 30 days"
**And** releases lock

#### Scenario: Database vacuum job runs successfully

**Given** database has deleted records consuming space
**When** vacuum job executes (weekly on Sunday at 3 AM)
**Then** job acquires lock
**And** executes VACUUM command
**And** logs "Vacuum completed in 2.3s, reclaimed 12.5MB"
**And** releases lock

#### Scenario: Backup job creates and rotates backups

**Given** database file exists at configured path
**And** 7 old backup files exist
**When** backup job executes (daily at 1 AM)
**Then** job acquires lock
**And** copies database.sqlite to database.sqlite.backup-20251013
**And** deletes oldest backup file
**And** keeps 7 most recent backups
**And** logs "Backup created (15.2MB), rotated 1 old backup"

#### Scenario: Count reconciliation job fixes drifted counts

**Given** project has agent_count = 5 in database
**But** actual agents table shows COUNT(*) = 3
**When** reconciliation job executes (daily at 4 AM)
**Then** job acquires lock
**And** queries actual counts from agents table
**And** updates project with correct counts
**And** logs "Reconciled 1 project, corrected 1 count"
**And** releases lock

#### Scenario: Concurrent job execution is prevented

**Given** vacuum job is running
**When** vacuum job schedule triggers again
**Then** job checks lock status
**And** finds lock is held
**And** logs "Vacuum job already running, skipping"
**And** does not execute

### System must provide database health monitoring

**Priority**: MEDIUM
**Category**: Operations

The system must expose a health check endpoint that reports database connectivity, schema version, and maintenance status for use by monitoring systems and Kubernetes probes.

**Acceptance Criteria**:
- Health endpoint returns structured JSON with status, database info, and entity counts
- Status values: "healthy" (normal), "degraded" (non-critical issues), "error" (critical failures)
- Health check completes in <100ms
- Returns 200 for healthy, 503 for degraded/error
- Works even if database persistence is disabled

#### Scenario: Health check reports healthy database

**Given** database is connected
**And** schema version matches expected version (3)
**When** client requests GET /api/health/database
**Then** response status is 200
**And** response body contains:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "schemaVersion": 3,
    "expectedVersion": 3,
    "path": "~/.config/agent-view/database.sqlite",
    "sizeBytes": 12345678
  },
  "lastMaintenance": {
    "vacuum": "2025-10-13T03:00:00Z",
    "backup": "2025-10-13T01:00:00Z"
  },
  "entities": {
    "agents": 42,
    "projects": 8,
    "messages": 15234
  }
}
```

#### Scenario: Health check reports degraded database

**Given** database is connected
**But** schema version is 2 (expected 3)
**When** client requests GET /api/health/database
**Then** response status is 503
**And** response contains status: "degraded"
**And** response includes schema version mismatch details

#### Scenario: Health check with disabled persistence

**Given** ENABLE_PERSISTENCE environment variable is false
**When** client requests GET /api/health/database
**Then** response status is 200
**And** response contains:
```json
{
  "status": "healthy",
  "database": {
    "connected": false,
    "message": "Persistence disabled"
  }
}
```

### System must support manual count reconciliation

**Priority**: LOW
**Category**: Operations

Administrators must be able to trigger count reconciliation manually via API endpoint for immediate correction of project/worktree agent counts.

**Acceptance Criteria**:
- POST /api/admin/reconcile endpoint triggers reconciliation
- Supports optional projectId parameter to reconcile single project
- Returns statistics showing number of corrected records
- Reconciliation queries actual counts and updates database
- Logs reconciliation actions for audit trail

#### Scenario: Reconciling all projects

**Given** 3 projects have drifted agent counts
**When** admin sends POST /api/admin/reconcile
**Then** system reconciles all projects and worktrees
**And** response contains:
```json
{
  "success": true,
  "projectsCorrected": 3,
  "worktreesCorrected": 5
}
```
**And** log shows "Manual reconciliation: corrected 3 projects, 5 worktrees"

#### Scenario: Reconciling specific project

**Given** project "proj-123" has drifted agent count
**When** admin sends POST /api/admin/reconcile with body:
```json
{
  "projectId": "proj-123"
}
```
**Then** system reconciles only project "proj-123" and its worktrees
**And** response contains projectsCorrected: 1
**And** other projects are not affected
