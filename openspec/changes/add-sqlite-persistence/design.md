# SQLite Persistence Design

## Context

Agent View currently uses ephemeral in-memory storage for agent sessions and browser localStorage for saved configurations. This design limits functionality and prevents recovery after server restarts.

**Current State**:
- `AgentSessionManager` - Map-based in-memory storage for active agents
- `AgentExecutionManager` - Map-based buffers for message streaming
- `AgentConfigStorage` - Browser localStorage for saved configs (client-side only)

**Requirements**:
- Persist all agent data to survive server restarts
- Enable cross-device access to saved configurations (via Tailscale)
- Support historical queries and analytics
- Maintain existing API contracts for backward compatibility

## Goals / Non-Goals

**Goals**:
- Persistent storage for agents, messages, configs, metrics, and settings
- Session recovery capability after server restarts
- Cross-device configuration sync
- Foundation for analytics dashboard (Phase 4)
- Minimal performance impact (<10ms overhead per database operation)

**Non-Goals**:
- Real-time replication or distributed database (single-node only)
- Advanced query DSL or ORM (keep it simple with raw SQL)
- Database migrations for existing data (fresh install only for Phase 1)
- Full generator state serialization (deferred to Phase 4)

## Decisions

### Database Technology: better-sqlite3

**Decision**: Use `better-sqlite3` instead of PostgreSQL or other alternatives.

**Rationale**:
- **Simplicity**: Zero configuration, no separate server process
- **Performance**: Synchronous API, faster for small-medium datasets (<100k agents)
- **Portability**: Single file database, easy backup/restore
- **Local-first**: Aligns with desktop application model (not multi-tenant SaaS)
- **Node.js native**: No external dependencies, works in Docker/Kubernetes

**Alternatives considered**:
- **PostgreSQL**: Overkill for single-user application, requires separate service
- **SQLite via node-sqlite3**: Async API adds complexity without clear benefit
- **LevelDB/RocksDB**: Key-value store insufficient for relational queries
- **Drizzle ORM**: Adds abstraction layer, prefer raw SQL for transparency

### Database Location: ~/.config/agent-view/

**Decision**: Store database at `~/.config/agent-view/database.sqlite` by default.

**Rationale**:
- **XDG Base Directory**: Follows Linux/macOS conventions for application data
- **User-specific**: Each user has isolated database (supports multi-user systems)
- **Discoverable**: Standard location makes backups and debugging easier
- **Configurable**: Override via `DATABASE_PATH` environment variable if needed

**Alternatives considered**:
- **Project directory**: Clutters git repository, requires .gitignore
- **System-wide location**: Requires elevated permissions, conflicts in multi-user
- **/var/lib/**: Inappropriate for user-space application

### Schema Design: Normalized Relational

**Decision**: Use normalized relational schema with foreign keys and indexes.

**Tables**:
1. `agents` - Core session data (1 row per agent)
2. `messages` - Message logs (N rows per agent, foreign key cascade delete)
3. `agent_configs` - Saved templates (independent lifecycle)
4. `agent_metrics` - Performance snapshots (foreign key cascade delete)
5. `execution_snapshots` - Recovery state (foreign key cascade delete)
6. `settings` - Application config (key-value pairs)

**Rationale**:
- **Referential integrity**: Foreign keys prevent orphaned records
- **Query flexibility**: Joins enable complex analytics queries
- **Storage efficiency**: Normalization reduces redundancy
- **Index optimization**: Targeted indexes for common queries

**Alternatives considered**:
- **Denormalized**: Faster writes but wastes space, harder to maintain
- **Document store**: JSON blobs insufficient for relational queries
- **EAV pattern**: Overcomplicated for static schema

### Data Access Pattern: Repository Pattern

**Decision**: Implement repository classes for each table (e.g., `AgentsRepository`, `MessagesRepository`).

**Rationale**:
- **Separation of concerns**: Isolate SQL from business logic
- **Testability**: Easy to mock repositories in tests
- **Type safety**: TypeScript interfaces for queries/results
- **Consistency**: Uniform API across all database operations

**Repository Interface**:
```typescript
interface AgentsRepository {
  create(agent: AgentSession): void;
  findById(id: string): AgentSession | undefined;
  findAll(): AgentSession[];
  findActive(): AgentSession[];
  update(id: string, updates: Partial<AgentSession>): void;
  delete(id: string): void;
}
```

**Alternatives considered**:
- **Active Record**: Couples data model to persistence logic
- **Direct SQL in managers**: Violates DRY, harder to test
- **Query builder**: Over-engineering for straightforward queries

### Migration Strategy: Schema Versioning

**Decision**: Use simple schema versioning in `settings` table with migration scripts.

**Rationale**:
- **Explicit control**: No magic, clear migration history
- **Rollback support**: Easy to revert failed migrations
- **Minimal tooling**: No complex migration frameworks needed

**Migration Flow**:
1. Check `schema_version` from `settings` table
2. Run pending migrations sequentially (v1 → v2 → v3)
3. Update `schema_version` after successful migration
4. Fail fast on migration errors (require manual intervention)

**Alternatives considered**:
- **Knex.js migrations**: Heavy dependency for simple use case
- **No migrations**: Manual schema management error-prone
- **Auto-migration**: Risky for production data

### Integration: Non-Breaking Backward Compatibility

**Decision**: Integrate database gradually without breaking existing in-memory managers.

**Phase 1 Approach**:
1. Add database persistence alongside existing in-memory storage
2. Write to both database and memory (dual writes)
3. Read from database on startup to restore state
4. Keep existing manager APIs unchanged
5. Add feature flag (`ENABLE_PERSISTENCE=true`) for gradual rollout

**Rationale**:
- **Risk mitigation**: Easy rollback if database issues arise
- **Testing**: Validate persistence without breaking main flows
- **Incremental**: Can deploy database without full migration

**Phase 2 Transition** (future):
- Remove in-memory storage once database proven stable
- Eliminate dual writes for performance

## Risks / Trade-offs

### Risk: Database Corruption
**Mitigation**:
- Enable SQLite WAL mode for crash resilience
- Implement automatic backups on startup (copy to `database.sqlite.backup`)
- Add database health check endpoint (`/api/health/database`)

### Risk: Performance Degradation
**Mitigation**:
- Use prepared statements for all queries (caching)
- Add indexes on high-frequency query columns
- Benchmark key operations (<10ms target)
- Implement message retention policy (auto-delete old messages after 30 days)

### Risk: Disk Space Exhaustion
**Mitigation**:
- Implement retention policies (max 10k agents, 1M messages)
- Add database vacuum on startup (reclaim deleted space)
- Monitor database size in health check

### Trade-off: Synchronous vs Async
**Decision**: Use synchronous `better-sqlite3` API.
**Trade-off**: Blocks event loop for duration of query, but simplifies error handling and avoids callback hell.
**Justification**: Database operations expected to be <10ms, acceptable for desktop application.

### Trade-off: Single File vs Sharding
**Decision**: Single SQLite file (no sharding).
**Trade-off**: Limited to ~1M agents before performance degrades.
**Justification**: Target use case is single developer with <1000 agents, can re-evaluate if needed.

## Migration Plan

### Phase 1: Initial Implementation
1. Install `better-sqlite3` dependency
2. Create `src/lib/database/` module structure:
   - `client.ts` - Database singleton
   - `schema.ts` - Schema creation and migrations
   - `repositories/agents.ts` - AgentsRepository
   - `repositories/messages.ts` - MessagesRepository
   - `repositories/configs.ts` - ConfigsRepository
   - `repositories/metrics.ts` - MetricsRepository
   - `repositories/settings.ts` - SettingsRepository
3. Initialize database on server startup
4. Add feature flag `ENABLE_PERSISTENCE` (default: false)
5. Integrate with `AgentSessionManager` (dual writes)
6. Integrate with `AgentExecutionManager` (message logging)
7. Migrate `AgentConfigStorage` to database
8. Add database health check endpoint

### Phase 2: Recovery & Analytics
1. Implement agent session recovery on startup
2. Add retention policy background job
3. Create analytics query helpers
4. Add database backup/restore endpoints

### Phase 3: Cleanup
1. Remove in-memory storage fallbacks
2. Remove feature flag (always-on persistence)
3. Optimize queries based on production metrics

### Rollback Plan
1. Set `ENABLE_PERSISTENCE=false` to disable database writes
2. Application falls back to in-memory storage
3. Database remains intact for later recovery

## Open Questions

1. **Message retention policy**: Should we auto-delete messages after 30 days, or make it configurable?
   - **Proposed**: 30 days default, configurable via `settings` table

2. **Database backup strategy**: Should we implement scheduled backups, or rely on manual/external backups?
   - **Proposed**: Automatic backup on startup (simple copy), user responsible for external backups

3. **Generator state serialization**: Can we serialize AsyncGenerator state for full agent recovery?
   - **Proposed**: Defer to Phase 4, not critical for initial implementation

4. **Multi-device sync**: Should database be synced across devices (phone + laptop) via Tailscale?
   - **Proposed**: Out of scope, single database per server instance
