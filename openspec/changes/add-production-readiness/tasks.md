# Implementation Tasks

## 1. Code Quality - Fix Linting Errors (CRITICAL - Blocking Build)

- [ ] 1.1 Fix linting errors in `src/lib/openspec/cli-wrapper.ts`
  - Replace `any` types with proper types (lines 37, 158, 159, 270, 284)
  - Convert `require()` imports to ES6 imports (lines 147-148)
  - Remove unused `deriveChangeStatus` function (line 270)
  - Remove unused `calculateProgress` function (line 284)
  - Fix unused `error` variable (line 195)
- [ ] 1.2 Fix linting errors in `src/lib/openspec/fs-operations.ts`
  - Replace all `any` types with proper error types (lines 87, 114, 133, 155, 183, 203, 224, 275)
  - Use `error instanceof Error` checks
- [ ] 1.3 Fix linting errors in `src/types/project.ts`
  - Replace `any` types with proper types (lines 17, 55, 67)
  - Define proper ToolPermissions and Settings types
- [ ] 1.4 Fix unused variable warnings across all files
  - Remove or use `error` variable in catch blocks (schema.ts:55, git-utils.ts:230)
  - Remove unused imports (sync.ts:20, 23)
  - Remove unused parameters (sync.ts:82, 294, 300, 306)
  - Remove unused imports (project-discovery.ts:8, 124, 147, 162)
- [ ] 1.5 Verify build passes
  - Run `npm run build` and confirm no errors
  - Run `npm run lint` and confirm no errors
  - Test dev server starts without warnings

## 2. Session Recovery Implementation

- [ ] 2.1 Implement session recovery in `AgentSessionManager`
  - Add `recoverSessions()` method
  - Query database for agents with lifecycle_state IN ('running', 'paused')
  - Restore each agent to `activeAgents` map
  - Load buffered messages from database
  - Log recovery statistics (agents restored, skipped, errors)
- [ ] 2.2 Call recovery on server startup
  - Add recovery call in `src/instrumentation.ts` or layout initialization
  - Handle errors gracefully (log but don't crash)
  - Support `ENABLE_SESSION_RECOVERY` environment variable (default: true)
- [ ] 2.3 Test session recovery
  - Spawn agents, restart server, verify agents restored
  - Test with paused agents
  - Test with agents that have messages

## 3. Background Job Scheduler

- [ ] 3.1 Create job scheduler framework (`src/lib/database/jobs.ts`)
  - Install `node-cron` dependency
  - Implement `JobScheduler` class with cron-based scheduling
  - Support job registration with name, schedule, and handler
  - Add execution logging (start, success, failure, duration)
  - Add concurrent execution prevention (lock per job)
- [ ] 3.2 Implement message retention job
  - Schedule: Daily at 2 AM
  - Query `MESSAGE_RETENTION_DAYS` setting (default: 30)
  - Call `MessagesRepository.deleteOlderThan(cutoffTimestamp)`
  - Log deletion count
- [ ] 3.3 Implement database vacuum job
  - Schedule: Weekly on Sunday at 3 AM
  - Call `vacuumDatabase()` from database client
  - Log vacuum duration and space reclaimed
- [ ] 3.4 Implement backup job
  - Schedule: Daily at 1 AM
  - Call `backupDatabase(backupPath)` from database client
  - Rotate old backups (keep last 7)
  - Log backup status and file size
- [ ] 3.5 Implement count reconciliation job
  - Schedule: Daily at 4 AM
  - Call `ProjectsRepository.reconcileCounts()` for all projects
  - Call `WorktreesRepository.reconcileCounts()` for all worktrees
  - Log correction count
- [ ] 3.6 Initialize job scheduler on startup
  - Register all jobs in `src/instrumentation.ts` or database initialization
  - Add `ENABLE_BACKGROUND_JOBS` environment variable (default: true)
  - Log registered jobs on startup

## 4. Count Reconciliation Logic

- [ ] 4.1 Implement `ProjectsRepository.reconcileCounts(projectId?: string)`
  - Query actual agent_count from agents table (COUNT(*))
  - Query actual active_agent_count (WHERE lifecycle_state IN ('running', 'paused'))
  - Query actual worktree_count from worktrees table
  - Update projects table with correct counts
  - Return number of corrected records
- [ ] 4.2 Implement `WorktreesRepository.reconcileCounts(worktreeId?: string)`
  - Query actual agent_count from agents table
  - Query actual active_agent_count
  - Update worktrees table with correct counts
  - Return number of corrected records
- [ ] 4.3 Update agent lifecycle methods to maintain counts
  - Decrement active_agent_count on agent stop/complete
  - Update project and worktree last_used timestamps
  - Handle edge cases (agent without project/worktree)

## 5. API Health & Admin Endpoints

- [ ] 5.1 Create `/api/health/database` GET endpoint
  - Return database connectivity status (healthy/degraded/error)
  - Return schema version (current and expected)
  - Return database file size and path
  - Return last vacuum/backup timestamps from settings
  - Return entity counts (agents, messages, projects, worktrees, openspec entities)
- [ ] 5.2 Create `/api/admin/reconcile` POST endpoint
  - Accept optional `projectId` in request body
  - Call reconciliation methods
  - Return statistics (projects corrected, worktrees corrected)
  - Add error handling and logging
- [ ] 5.3 Update `/api/agents` and `/api/agents/history` endpoints
  - Currently use in-memory data only
  - Add database query fallback
  - Return `source: 'memory' | 'database'` in response
  - Maintain backward compatibility

## 6. Project Settings Application

- [ ] 6.1 Apply default tool permissions on agent spawn
  - Modify `src/app/api/agents/spawn/route.ts`
  - Check if request has explicit `toolPermissions`
  - If not, query project's `default_tool_permissions`
  - Use project default or fall back to global default
  - Pass resolved permissions to `createSession()`
- [ ] 6.2 Apply custom OpenSpec path in CLI commands
  - Modify `src/lib/openspec/cli-wrapper.ts`
  - Accept optional `projectId` parameter in CLI wrapper functions
  - Query project's `openspec_path` from database
  - Add `--path` flag to OpenSpec CLI commands if custom path exists
  - Resolve relative paths from project directory
- [ ] 6.3 Update project API to support settings
  - Support updating `default_tool_permissions` via PATCH /api/projects/[id]
  - Support updating `openspec_path` via PATCH /api/projects/[id]
  - Validate tool permissions schema
  - Validate OpenSpec path exists

## 7. Testing Infrastructure Setup

- [ ] 7.1 Install and configure testing framework
  - Run `bun add -d vitest @vitest/ui`
  - Create `vitest.config.ts` with Next.js compatibility
  - Add test scripts to package.json: `test`, `test:ui`, `test:coverage`
  - Configure path aliases (`@/*`) in test environment
- [ ] 7.2 Create test directory structure
  - Create `src/__tests__/` directory
  - Create subdirectories: `database/`, `lib/`, `api/`, `components/`
  - Add `.test.ts` or `.spec.ts` convention

## 8. Database Tests

- [ ] 8.1 Test schema initialization (`src/__tests__/database/schema.test.ts`)
  - Test fresh database creation (version 3)
  - Test schema version detection
  - Test all tables created with correct columns
  - Test all indexes created
  - Test default settings seeded
- [ ] 8.2 Test migrations (`src/__tests__/database/migrations.test.ts`)
  - Test v1 → v2 migration (projects/worktrees)
  - Test v2 → v3 migration (openspec tables)
  - Test migration rollback safety
  - Test migration idempotency
- [ ] 8.3 Test AgentsRepository (`src/__tests__/database/agents.test.ts`)
  - Test create, findById, findAll, update, delete operations
  - Test foreign key constraints (project_id, worktree_id)
  - Test cascade delete behavior
  - Test concurrent access
- [ ] 8.4 Test ProjectsRepository (`src/__tests__/database/projects.test.ts`)
  - Test CRUD operations
  - Test count reconciliation logic
  - Test favorite/archive functionality
  - Test unique directory constraint
- [ ] 8.5 Test OpenSpecRepository (`src/__tests__/database/openspec.test.ts`)
  - Test spec, change, archive upsert operations
  - Test sync status tracking
  - Test validation status persistence

## 9. Business Logic Tests

- [ ] 9.1 Test AgentSessionManager (`src/__tests__/lib/agent-session.test.ts`)
  - Test createSession with database persistence
  - Test session recovery from database
  - Test updateStatus persistence
  - Test lifecycle methods (pause, resume, stop)
- [ ] 9.2 Test ProjectDiscoveryService (`src/__tests__/lib/project-discovery.test.ts`)
  - Test auto-discovery from directory
  - Test git worktree detection
  - Test package.json name extraction
  - Test project/worktree linking
- [ ] 9.3 Test OpenSpec sync (`src/__tests__/lib/openspec-sync.test.ts`)
  - Test full sync from filesystem
  - Test git timestamp extraction
  - Test entity removal detection
  - Test concurrent sync prevention
  - Test staleness detection

## 10. API Tests

- [ ] 10.1 Test health endpoints (`src/__tests__/api/health.test.ts`)
  - Test /api/health/database with healthy database
  - Test /api/health/database with degraded database
  - Test /api/health/database with disabled persistence
- [ ] 10.2 Test admin endpoints (`src/__tests__/api/admin.test.ts`)
  - Test /api/admin/reconcile with all projects
  - Test /api/admin/reconcile with specific projectId
  - Test error handling
- [ ] 10.3 Test agent spawn with project settings (`src/__tests__/api/agents.test.ts`)
  - Test spawn applies project default tool permissions
  - Test spawn with explicit permissions overrides defaults
  - Test spawn without project (no defaults)

## 11. Documentation Updates

- [ ] 11.1 Update README.md
  - Add "Database" section explaining SQLite persistence
  - Document database location: `~/.config/agent-view/database.sqlite`
  - Document environment variables:
    - `DATABASE_PATH` - Custom database location
    - `ENABLE_PERSISTENCE` - Enable/disable database (default: true)
    - `ENABLE_SESSION_RECOVERY` - Enable session recovery (default: true)
    - `ENABLE_BACKGROUND_JOBS` - Enable automated jobs (default: true)
    - `MESSAGE_RETENTION_DAYS` - Message retention policy (default: 30)
  - Add backup/restore procedures
  - Add troubleshooting section (database corruption, reset procedures)
- [ ] 11.2 Create/update docs/ARCHITECTURE.md
  - Add database schema diagrams (ASCII art or Mermaid)
  - Document all three schema versions (v1, v2, v3)
  - Explain migration process
  - Document repository pattern implementation
  - Add data flow diagrams:
    - Agent spawn → project discovery → database persistence
    - Message broadcasting → database persistence → stream replay
    - OpenSpec sync → git timestamps → database cache
- [ ] 11.3 Create docs/API.md
  - Document all API endpoints with examples
  - Group by feature: Agents, Projects, Worktrees, OpenSpec, Health, Admin
  - Include request/response schemas
  - Document error responses
  - Add curl examples for testing
- [ ] 11.4 Create docs/OPERATIONS.md
  - Document backup procedures (manual and automated)
  - Document restore procedures
  - Document database migration procedures
  - Document count reconciliation when needed
  - Document health monitoring setup for Kubernetes
  - Document troubleshooting procedures

## 12. Kubernetes Deployment Preparation

- [ ] 12.1 Create Kubernetes manifests (if not exists)
  - Deployment with health checks (readiness/liveness probes)
  - Service (ClusterIP)
  - PersistentVolumeClaim for database
  - ConfigMap for environment variables
  - Secret for ANTHROPIC_API_KEY
- [ ] 12.2 Add health check probes
  - Liveness probe: GET /api/health/database (every 30s, 3 failures)
  - Readiness probe: GET /api/health/database (every 10s, 1 failure)
  - Startup probe: GET /api/health/database (every 5s, 12 attempts)
- [ ] 12.3 Configure volume for database persistence
  - Mount PVC at `/data` or `~/.config/agent-view/`
  - Set `DATABASE_PATH` to persistent volume path
  - Ensure proper file permissions
- [ ] 12.4 Document deployment process
  - Add deployment instructions to README.md
  - Document environment variables for production
  - Document scaling considerations (single replica only due to SQLite)

## 13. Final Validation & Testing

- [ ] 13.1 Run full test suite
  - Execute `npm run test`
  - Ensure all tests pass
  - Check test coverage (aim for >70% on critical paths)
- [ ] 13.2 Test production build
  - Run `npm run build`
  - Verify no TypeScript errors
  - Verify no linting errors
- [ ] 13.3 Test session recovery end-to-end
  - Spawn multiple agents
  - Restart server
  - Verify agents recovered correctly
  - Verify message history preserved
- [ ] 13.4 Test background jobs
  - Trigger message retention cleanup
  - Trigger database vacuum
  - Trigger backup creation
  - Trigger count reconciliation
  - Verify job execution logs
- [ ] 13.5 Test health endpoints
  - Test database health check
  - Test reconciliation endpoint
  - Simulate database failures
  - Verify graceful degradation
- [ ] 13.6 Perform load testing (optional)
  - Spawn 20 concurrent agents
  - Verify database performance acceptable
  - Verify no memory leaks
  - Monitor resource usage

## 14. Archive Previous Changes

- [ ] 14.1 Archive `add-sqlite-persistence`
  - Run `openspec archive add-sqlite-persistence`
  - Verify change moved to archive directory
  - Update project.md roadmap status
- [ ] 14.2 Archive `add-projects-data-model`
  - Run `openspec archive add-projects-data-model`
  - Verify change moved to archive directory
  - Update project.md roadmap status
- [ ] 14.3 Archive `add-openspec-database-cache`
  - Run `openspec archive add-openspec-database-cache`
  - Verify change moved to archive directory
  - Update project.md roadmap status
