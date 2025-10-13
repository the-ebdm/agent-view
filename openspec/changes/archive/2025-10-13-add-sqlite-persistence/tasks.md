# Implementation Tasks

## Progress Summary

**Overall Status**: ~75% Complete (Core persistence implemented, remaining: session recovery, API enhancements, cleanup jobs, testing, docs)

### Completed (Sections 1-3, 4-6):
- ✅ **Setup & Infrastructure** (1.1-1.4): Dependencies, database directory, configuration, feature flag
- ✅ **Database Client & Schema** (2.1-2.4): Client singleton, schema v1 & v2, migrations, versioning
- ✅ **Repository Layer** (3.1-3.4): All repositories implemented with prepared statements
- ✅ **Session Manager Integration** (4.1-4.4): Persistence for create, update, and all lifecycle methods
- ✅ **Execution Manager Integration** (5.1-5.3): Message persistence and buffering via database
- ✅ **Config Storage Migration** (6.1-6.6): Full migration to database including localStorage migration endpoint

### In Progress / Partially Complete:
- 🔄 **API Endpoints** (7.2-7.3): Agents and history endpoints exist but still use in-memory data
- 🔄 **Session Recovery** (4.5): Not yet implemented
- 🔄 **Cleanup & Maintenance** (8.1-8.3): Helper methods exist but not scheduled/automated

### Not Started:
- ❌ **API Enhancements** (7.1, 7.4): Health endpoint, messages pagination endpoint
- ❌ **Background Jobs** (8.1-8.3): Retention policy, vacuum, backup automation
- ❌ **Testing & Validation** (9.1-9.7): All testing tasks
- ❌ **Documentation** (10.1-10.4): README, troubleshooting, architecture docs

---

## 1. Setup & Infrastructure

- [x] 1.1 Install `better-sqlite3` dependency
  - Run `bun add better-sqlite3`
  - Run `bun add -d @types/better-sqlite3`
- [x] 1.2 Create database directory structure
  - Create `src/lib/database/` directory
  - Create `src/lib/database/repositories/` directory
- [x] 1.3 Add database path configuration
  - Add `DATABASE_PATH` environment variable support (default: `~/.config/agent-view/database.sqlite`)
  - Create directory `~/.config/agent-view/` if not exists
- [x] 1.4 Add feature flag
  - Add `ENABLE_PERSISTENCE` environment variable (default: true)

## 2. Database Client & Schema

- [x] 2.1 Implement database client singleton (`src/lib/database/client.ts`)
  - Export `getDatabase()` function
  - Initialize SQLite connection with WAL mode
  - Handle connection errors gracefully
- [x] 2.2 Create database schema (`src/lib/database/schema.ts`)
  - Define `agents` table schema
  - Define `messages` table schema
  - Define `agent_configs` table schema
  - Define `projects` table schema (v2)
  - Define `worktrees` table schema (v2)
  - Define `settings` table schema
  - (Note: `agent_metrics` and `execution_snapshots` deferred to Phase 4)
- [x] 2.3 Implement schema initialization
  - Create all tables if not exists
  - Create all indexes
  - Seed default settings
- [x] 2.4 Implement schema versioning
  - Add `schema_version` to settings table
  - Implement migration runner (with v1->v2 migration)
  - Add version check on startup

## 3. Repository Implementation

- [x] 3.1 Implement AgentsRepository (`src/lib/database/repositories/agents.ts`)
  - `create(agent: AgentSession): void`
  - `findById(id: string): AgentSession | undefined`
  - `findAll(): AgentSession[]`
  - `findActive(): AgentSession[]`
  - `update(id: string, updates: Partial<AgentSession>): void`
  - `delete(id: string): void`
  - Use prepared statements for all queries
- [x] 3.2 Implement MessagesRepository (`src/lib/database/repositories/messages.ts`)
  - `create(message: AgentMessage & { agentId: string }): number`
  - `findByAgentId(agentId: string, options?: { limit?: number, offset?: number }): AgentMessage[]`
  - `findRecentByAgentId(agentId: string, limit: number): AgentMessage[]`
  - `countByAgentId(agentId: string): number`
  - `deleteOlderThan(timestamp: number): number`
  - Use prepared statements for all queries
- [x] 3.3 Implement ConfigsRepository (`src/lib/database/repositories/configs.ts`)
  - `create(config: SavedAgentConfig): SavedAgentConfig`
  - `findById(id: string): SavedAgentConfig | undefined`
  - `findAll(): SavedAgentConfig[]`
  - `findRecent(limit: number): SavedAgentConfig[]`
  - `updateLastUsed(id: string): void`
  - `toggleFavorite(id: string): void`
  - `delete(id: string): void`
  - Use prepared statements for all queries
- [x] 3.4 Implement SettingsRepository (`src/lib/database/repositories/settings.ts`)
  - `get(key: string): string | undefined`
  - `set(key: string, value: string): void`
  - `getAll(): Record<string, string>`
  - Use prepared statements for all queries
  - (Also includes `getNumber()` and `getBoolean()` helper methods)

## 4. Integration with AgentSessionManager

- [x] 4.1 Add database persistence to `createSession()`
  - Call `AgentsRepository.create()` after creating in-memory session (src/lib/agent-session-manager.ts:66)
  - Wrap in try-catch for graceful degradation
- [x] 4.2 Add database persistence to `addMessage()`
  - Call `MessagesRepository.create()` after adding to in-memory messages (via AgentExecutionManager)
  - Wrap in try-catch for graceful degradation
- [x] 4.3 Add database persistence to `updateStatus()`
  - Call `AgentsRepository.update()` after updating in-memory status (src/lib/agent-session-manager.ts:265)
  - Wrap in try-catch for graceful degradation
- [x] 4.4 Add database persistence to lifecycle methods
  - Update `pauseAgent()` to persist lifecycle_state (src/lib/agent-session-manager.ts:128)
  - Update `resumeAgent()` to persist lifecycle_state (src/lib/agent-session-manager.ts:158)
  - Update `stopAgent()` to persist lifecycle_state and end_time (src/lib/agent-session-manager.ts:186)
  - Update `renameAgent()` to persist name (src/lib/agent-session-manager.ts:228)
- [ ] 4.5 Implement session recovery
  - Load active agents from database on startup
  - Restore to `activeAgents` map
  - Log recovery status

## 5. Integration with AgentExecutionManager

- [x] 5.1 Add message persistence to `broadcastMessage()`
  - Call `MessagesRepository.create()` for each message (src/lib/agent-execution-manager.ts:278)
  - Wrap in try-catch to prevent blocking execution
- [x] 5.2 Update `getBufferedMessages()` to use database
  - Query `MessagesRepository.findRecentByAgentId(id, 100)` (src/lib/agent-execution-manager.ts:129)
  - Fall back to in-memory buffer if database fails
- [x] 5.3 Add database cleanup to `stopAgent()`
  - Keep message buffer in database (no cleanup needed)
  - Remove in-memory buffer after cleanup delay (implemented as designed)

## 6. Integration with AgentConfigStorage

- [x] 6.1 Migrate `saveConfig()` to use database
  - Replace localStorage with `ConfigsRepository.create()` (src/app/api/configs/route.ts:84)
  - Handle unique constraint violations
- [x] 6.2 Migrate `getConfigs()` to use database
  - Replace localStorage read with `ConfigsRepository.findAll()` (src/app/api/configs/route.ts:32-34)
- [x] 6.3 Migrate `deleteConfig()` to use database
  - Replace localStorage delete with `ConfigsRepository.delete()` (src/app/api/configs/[id]/route.ts)
- [x] 6.4 Migrate `addToRecent()` to use database
  - Use `ConfigsRepository.updateLastUsed()` (implemented in repository)
- [x] 6.5 Migrate `getRecent()` to use database
  - Replace localStorage read with `ConfigsRepository.findRecent(10)` (src/app/api/configs/recent/route.ts)
- [x] 6.6 Implement localStorage migration endpoint
  - Create `/api/configs/migrate` POST endpoint (src/app/api/configs/migrate/route.ts)
  - Accept localStorage data in request body
  - Bulk insert into database with duplicate handling
  - Return migration status

## 7. API Endpoints

- [ ] 7.1 Create database health check endpoint (`/api/health/database`)
  - Check database connectivity
  - Report schema version
  - Report database size
  - Return health status (healthy/degraded/error)
  - (Note: `getDatabaseHealth()` method exists in client.ts:145, but no API endpoint yet)
- [~] 7.2 Update `/api/agents` GET endpoint
  - Query from database if `ENABLE_PERSISTENCE` is true
  - Fall back to in-memory if database fails
  - (Note: Currently uses in-memory only via sessionManager.getAllActiveAgents())
- [~] 7.3 Update `/api/agents/history` GET endpoint
  - Query historical agents from database
  - Include message counts and metrics
  - (Note: Currently uses in-memory only via sessionManager.getHistory())
- [ ] 7.4 Create `/api/agents/[id]/messages` GET endpoint
  - Support pagination (limit, offset query params)
  - Return messages from database

## 8. Retention Policy & Cleanup

- [ ] 8.1 Implement message retention job
  - Create background job runner (`src/lib/database/jobs.ts`)
  - Run retention cleanup every 24 hours
  - Delete messages older than `MESSAGE_RETENTION_DAYS` setting
  - Log cleanup statistics
  - (Note: `MessagesRepository.deleteOlderThan()` method exists but no job scheduler yet)
- [ ] 8.2 Add database vacuum on startup
  - Run `VACUUM` command to reclaim deleted space
  - Log vacuum duration
  - (Note: `vacuumDatabase()` method exists in client.ts:127 but not called on startup)
- [ ] 8.3 Implement automatic backup on startup
  - Copy `database.sqlite` to `database.sqlite.backup`
  - Keep last 3 backups (rotate old ones)
  - Log backup status
  - (Note: `backupDatabase()` method exists in client.ts:105 but not called on startup)

## 9. Testing & Validation

- [ ] 9.1 Test database initialization
  - Verify tables created
  - Verify indexes created
  - Verify settings seeded
- [ ] 9.2 Test agent persistence
  - Create agent, restart server, verify recovery
  - Update agent, verify database updated
  - Delete agent, verify cascade delete
- [ ] 9.3 Test message persistence
  - Send messages, verify stored in database
  - Query messages, verify pagination works
  - Test retention policy cleanup
- [ ] 9.4 Test config persistence
  - Save config, verify stored in database
  - Delete config, verify removed
  - Test migration from localStorage
- [ ] 9.5 Test concurrent access
  - Spawn multiple agents simultaneously
  - Verify no database locking issues
  - Verify prepared statements cached correctly
- [ ] 9.6 Test error handling
  - Simulate database corruption
  - Verify graceful degradation
  - Verify health check reports errors
- [ ] 9.7 Performance benchmarks
  - Measure database operation latency (<10ms target)
  - Measure startup time with large database (>1000 agents)
  - Measure query performance with indexes

## 10. Documentation

- [ ] 10.1 Update README.md
  - Document database location and configuration
  - Document backup/restore procedures
  - Document retention policies
- [ ] 10.2 Add database troubleshooting guide
  - Common issues and solutions
  - How to reset database
  - How to export/import data
- [ ] 10.3 Document environment variables
  - `DATABASE_PATH` - Database file location
  - `ENABLE_PERSISTENCE` - Feature flag
  - `MESSAGE_RETENTION_DAYS` - Retention policy (default: 30)
- [ ] 10.4 Add architecture documentation
  - Database schema diagram
  - Repository pattern explanation
  - Migration process
