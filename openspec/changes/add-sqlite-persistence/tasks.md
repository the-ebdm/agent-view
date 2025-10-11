# Implementation Tasks

## 1. Setup & Infrastructure

- [ ] 1.1 Install `better-sqlite3` dependency
  - Run `bun add better-sqlite3`
  - Run `bun add -d @types/better-sqlite3`
- [ ] 1.2 Create database directory structure
  - Create `src/lib/database/` directory
  - Create `src/lib/database/repositories/` directory
- [ ] 1.3 Add database path configuration
  - Add `DATABASE_PATH` environment variable support (default: `~/.config/agent-view/database.sqlite`)
  - Create directory `~/.config/agent-view/` if not exists
- [ ] 1.4 Add feature flag
  - Add `ENABLE_PERSISTENCE` environment variable (default: true)

## 2. Database Client & Schema

- [ ] 2.1 Implement database client singleton (`src/lib/database/client.ts`)
  - Export `getDatabase()` function
  - Initialize SQLite connection with WAL mode
  - Handle connection errors gracefully
- [ ] 2.2 Create database schema (`src/lib/database/schema.ts`)
  - Define `agents` table schema
  - Define `messages` table schema
  - Define `agent_configs` table schema
  - Define `agent_metrics` table schema (future Phase 4)
  - Define `execution_snapshots` table schema (future Phase 4)
  - Define `settings` table schema
- [ ] 2.3 Implement schema initialization
  - Create all tables if not exists
  - Create all indexes
  - Seed default settings
- [ ] 2.4 Implement schema versioning
  - Add `schema_version` to settings table
  - Implement migration runner
  - Add version check on startup

## 3. Repository Implementation

- [ ] 3.1 Implement AgentsRepository (`src/lib/database/repositories/agents.ts`)
  - `create(agent: AgentSession): void`
  - `findById(id: string): AgentSession | undefined`
  - `findAll(): AgentSession[]`
  - `findActive(): AgentSession[]`
  - `update(id: string, updates: Partial<AgentSession>): void`
  - `delete(id: string): void`
  - Use prepared statements for all queries
- [ ] 3.2 Implement MessagesRepository (`src/lib/database/repositories/messages.ts`)
  - `create(message: AgentMessage & { agentId: string }): number`
  - `findByAgentId(agentId: string, options?: { limit?: number, offset?: number }): AgentMessage[]`
  - `findRecentByAgentId(agentId: string, limit: number): AgentMessage[]`
  - `countByAgentId(agentId: string): number`
  - `deleteOlderThan(timestamp: number): number`
  - Use prepared statements for all queries
- [ ] 3.3 Implement ConfigsRepository (`src/lib/database/repositories/configs.ts`)
  - `create(config: SavedAgentConfig): SavedAgentConfig`
  - `findById(id: string): SavedAgentConfig | undefined`
  - `findAll(): SavedAgentConfig[]`
  - `findRecent(limit: number): SavedAgentConfig[]`
  - `updateLastUsed(id: string): void`
  - `toggleFavorite(id: string): void`
  - `delete(id: string): void`
  - Use prepared statements for all queries
- [ ] 3.4 Implement SettingsRepository (`src/lib/database/repositories/settings.ts`)
  - `get(key: string): string | undefined`
  - `set(key: string, value: string): void`
  - `getAll(): Record<string, string>`
  - Use prepared statements for all queries

## 4. Integration with AgentSessionManager

- [ ] 4.1 Add database persistence to `createSession()`
  - Call `AgentsRepository.create()` after creating in-memory session
  - Wrap in try-catch for graceful degradation
- [ ] 4.2 Add database persistence to `addMessage()`
  - Call `MessagesRepository.create()` after adding to in-memory messages
  - Wrap in try-catch for graceful degradation
- [ ] 4.3 Add database persistence to `updateStatus()`
  - Call `AgentsRepository.update()` after updating in-memory status
  - Wrap in try-catch for graceful degradation
- [ ] 4.4 Add database persistence to lifecycle methods
  - Update `pauseAgent()` to persist lifecycle_state
  - Update `resumeAgent()` to persist lifecycle_state
  - Update `stopAgent()` to persist lifecycle_state and end_time
  - Update `renameAgent()` to persist name
- [ ] 4.5 Implement session recovery
  - Load active agents from database on startup
  - Restore to `activeAgents` map
  - Log recovery status

## 5. Integration with AgentExecutionManager

- [ ] 5.1 Add message persistence to `broadcastMessage()`
  - Call `MessagesRepository.create()` for each message
  - Wrap in try-catch to prevent blocking execution
- [ ] 5.2 Update `getBufferedMessages()` to use database
  - Query `MessagesRepository.findRecentByAgentId(id, 100)`
  - Fall back to in-memory buffer if database fails
- [ ] 5.3 Add database cleanup to `stopAgent()`
  - Keep message buffer in database (no cleanup needed)
  - Remove in-memory buffer after cleanup delay

## 6. Integration with AgentConfigStorage

- [ ] 6.1 Migrate `saveConfig()` to use database
  - Replace localStorage with `ConfigsRepository.create()`
  - Handle unique constraint violations
- [ ] 6.2 Migrate `getConfigs()` to use database
  - Replace localStorage read with `ConfigsRepository.findAll()`
- [ ] 6.3 Migrate `deleteConfig()` to use database
  - Replace localStorage delete with `ConfigsRepository.delete()`
- [ ] 6.4 Migrate `addToRecent()` to use database
  - Use `ConfigsRepository.updateLastUsed()`
- [ ] 6.5 Migrate `getRecent()` to use database
  - Replace localStorage read with `ConfigsRepository.findRecent(10)`
- [ ] 6.6 Implement localStorage migration endpoint
  - Create `/api/configs/migrate` POST endpoint
  - Accept localStorage data in request body
  - Bulk insert into database with duplicate handling
  - Return migration status

## 7. API Endpoints

- [ ] 7.1 Create database health check endpoint (`/api/health/database`)
  - Check database connectivity
  - Report schema version
  - Report database size
  - Return health status (healthy/degraded/error)
- [ ] 7.2 Update `/api/agents` GET endpoint
  - Query from database if `ENABLE_PERSISTENCE` is true
  - Fall back to in-memory if database fails
- [ ] 7.3 Update `/api/agents/history` GET endpoint
  - Query historical agents from database
  - Include message counts and metrics
- [ ] 7.4 Create `/api/agents/[id]/messages` GET endpoint
  - Support pagination (limit, offset query params)
  - Return messages from database

## 8. Retention Policy & Cleanup

- [ ] 8.1 Implement message retention job
  - Create background job runner (`src/lib/database/jobs.ts`)
  - Run retention cleanup every 24 hours
  - Delete messages older than `MESSAGE_RETENTION_DAYS` setting
  - Log cleanup statistics
- [ ] 8.2 Add database vacuum on startup
  - Run `VACUUM` command to reclaim deleted space
  - Log vacuum duration
- [ ] 8.3 Implement automatic backup on startup
  - Copy `database.sqlite` to `database.sqlite.backup`
  - Keep last 3 backups (rotate old ones)
  - Log backup status

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
