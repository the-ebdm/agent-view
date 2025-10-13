# Design: Production Readiness & Testing

## Overview

This change consolidates all remaining production-readiness work from three completed database features into a cohesive implementation that makes Agent View deployment-ready for Kubernetes.

## Architecture Decisions

### 1. Job Scheduler Design

**Choice: Cron-based in-process scheduler**

Alternatives considered:
- External job runner (Kubernetes CronJobs) - Rejected: Adds deployment complexity, requires database access from multiple pods
- Bull/BullMQ (Redis-based) - Rejected: Overkill for simple scheduled tasks, adds Redis dependency
- node-cron (in-process) - **Selected**: Simple, reliable, no external dependencies

Implementation:
```typescript
class JobScheduler {
  private jobs: Map<string, CronJob>;
  private locks: Map<string, boolean>; // Prevent concurrent execution

  register(name: string, schedule: string, handler: () => Promise<void>) {
    // Create cron job with locking
  }

  start() {
    // Start all registered jobs
  }

  stop() {
    // Stop all jobs gracefully
  }
}
```

Jobs run in the same process as the Next.js server:
- **Message retention** - Daily at 2 AM (delete messages older than X days)
- **Database vacuum** - Weekly on Sunday at 3 AM (reclaim deleted space)
- **Automated backups** - Daily at 1 AM (copy database, rotate old backups)
- **Count reconciliation** - Daily at 4 AM (fix project/worktree counts)

Trade-offs:
- ✅ Simple, no external dependencies
- ✅ Fast execution (in-memory access)
- ❌ Only one pod can run jobs (SQLite limitation)
- ❌ Jobs stop if pod crashes (acceptable for daily tasks)

### 2. Session Recovery Strategy

**Choice: Lazy recovery on startup**

Alternatives considered:
- Eager recovery (restore all agents immediately) - Rejected: Blocks startup, may fail if API unavailable
- No recovery (manual restart required) - Rejected: Poor user experience
- Lazy recovery (restore metadata only) - **Selected**: Fast startup, agents remain stopped

Implementation:
```typescript
async function recoverSessions() {
  // Query active agents from database
  const activeAgents = AgentsRepository.findActive(); // lifecycle_state IN ('running', 'paused')

  for (const agent of activeAgents) {
    // Restore to in-memory map (but don't resume execution)
    sessionManager.activeAgents.set(agent.id, agent);

    // Load buffered messages
    const messages = MessagesRepository.findRecentByAgentId(agent.id, 100);
    executionManager.messageBuffers.set(agent.id, messages);
  }

  console.log(`Recovered ${activeAgents.length} agent sessions`);
}
```

Recovery behavior:
- Agents appear in UI with last known status (running/paused)
- Message history is available for viewing
- Agents do NOT resume execution automatically (prevents duplicate work)
- User can manually resume if needed

Trade-offs:
- ✅ Fast startup (no API calls, just database reads)
- ✅ Safe (no automatic resume that might cause issues)
- ✅ Preserves message history
- ❌ Requires manual resume (but this is safer for long-running tasks)

### 3. Count Reconciliation Approach

**Choice: Periodic reconciliation with manual trigger**

Alternatives considered:
- Transactional updates (increment/decrement on every change) - Rejected: Already implemented but may drift due to errors
- Real-time reconciliation (after every agent operation) - Rejected: Performance overhead
- Periodic + manual - **Selected**: Best balance of accuracy and performance

Implementation:
```typescript
// Automatic (background job)
schedule('0 4 * * *', async () => {
  const corrected = await ProjectsRepository.reconcileCounts();
  console.log(`Reconciled ${corrected} project counts`);
});

// Manual (API endpoint for immediate fix)
POST /api/admin/reconcile
{
  "projectId": "optional-project-id" // Omit to reconcile all
}
```

Reconciliation logic:
```sql
-- For each project:
UPDATE projects SET
  agent_count = (SELECT COUNT(*) FROM agents WHERE project_id = ?),
  active_agent_count = (SELECT COUNT(*) FROM agents WHERE project_id = ? AND lifecycle_state IN ('running', 'paused')),
  worktree_count = (SELECT COUNT(*) FROM worktrees WHERE project_id = ?)
WHERE id = ?
```

Trade-offs:
- ✅ Fixes drifted counts automatically
- ✅ Manual trigger available for immediate fixes
- ✅ No performance impact on agent operations
- ❌ Counts may be stale for up to 24 hours (acceptable for non-critical feature)

### 4. Health Check Design

**Choice: Simple REST endpoint with structured status**

Implementation:
```typescript
GET /api/health/database
{
  "status": "healthy" | "degraded" | "error",
  "database": {
    "connected": true,
    "schemaVersion": 3,
    "expectedVersion": 3,
    "path": "/Users/user/.config/agent-view/database.sqlite",
    "sizeBytes": 12345678
  },
  "lastMaintenance": {
    "vacuum": "2025-10-06T03:00:00Z",
    "backup": "2025-10-13T01:00:00Z"
  },
  "entities": {
    "agents": 42,
    "projects": 8,
    "worktrees": 12,
    "messages": 15234,
    "openspecEntities": 87
  }
}
```

Kubernetes integration:
```yaml
livenessProbe:
  httpGet:
    path: /api/health/database
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health/database
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 1
```

Trade-offs:
- ✅ Kubernetes-native (HTTP probes)
- ✅ Detailed status information
- ✅ Supports gradual degradation (healthy → degraded → error)
- ❌ HTTP overhead (but acceptable for 10-30s intervals)

### 5. Testing Strategy

**Choice: Vitest with focus on critical paths**

Test priorities (in order):
1. **Database operations** (schema, migrations, repositories) - Highest risk
2. **Session recovery** (data loss prevention) - Critical for production
3. **OpenSpec sync** (git timestamp accuracy) - User-facing feature
4. **Project discovery** (auto-discovery correctness) - User experience
5. **API endpoints** (contract validation) - Integration tests

Test coverage goals:
- **Database layer**: >80% (critical for data integrity)
- **Business logic**: >70% (agent management, project discovery)
- **API layer**: >60% (endpoint contracts)
- **UI components**: Deferred to Phase 4 (not production-critical)

Mock strategy:
- Database: Use in-memory SQLite (`:memory:`) for fast tests
- Filesystem: Mock `fs` module for file operations
- Git: Mock `child_process.execSync` for git commands
- Anthropic API: Not tested (external dependency, expensive)

Trade-offs:
- ✅ Fast test execution (in-memory database)
- ✅ No external dependencies required
- ✅ Focused on high-risk areas
- ❌ No E2E tests (deferred to Phase 4)
- ❌ No UI component tests (deferred to Phase 4)

## Data Flow Diagrams

### Session Recovery Flow

```
Server Startup
    ↓
Initialize Database
    ↓
Check ENABLE_SESSION_RECOVERY
    ↓
Query Active Agents (lifecycle_state IN ('running', 'paused'))
    ↓
For Each Agent:
    - Restore to activeAgents map
    - Load buffered messages
    - Set status to "recovered"
    ↓
Log Recovery Statistics
    ↓
Server Ready
```

### Background Job Execution Flow

```
Cron Schedule Triggers
    ↓
Check Job Lock (prevent concurrent)
    ↓
If Locked: Skip
If Not Locked:
    ↓
Acquire Lock
    ↓
Execute Job Handler
    - Message retention: DELETE FROM messages WHERE timestamp < cutoff
    - Database vacuum: VACUUM
    - Backup: Copy database file, rotate old backups
    - Count reconciliation: UPDATE projects/worktrees SET counts = (SELECT ...)
    ↓
Log Execution (duration, errors, statistics)
    ↓
Release Lock
    ↓
Update Last Execution Timestamp (settings table)
```

### Project Settings Application Flow

```
Agent Spawn Request
    ↓
Check Request for Explicit toolPermissions
    ↓
If Explicit: Use Request Value
If Not:
    ↓
Query Agent's Project (via directory)
    ↓
If Project Exists:
    - Read project.default_tool_permissions
    - Apply if not null
If No Project or No Default:
    - Apply Global Default
    ↓
Create Agent Session with Resolved Permissions
    ↓
Persist to Database
```

## Migration Path

### From Current State to Production-Ready

1. **Phase 1: Build Fixes (Day 1)**
   - Fix linting errors (blocking)
   - Verify build passes
   - Deploy to dev environment

2. **Phase 2: Core Production Features (Days 2-3)**
   - Implement session recovery
   - Implement background jobs
   - Add health endpoints
   - Test on dev environment

3. **Phase 3: Testing & Validation (Days 4-5)**
   - Set up Vitest
   - Write critical path tests
   - Run test suite and fix failures
   - Verify test coverage meets goals

4. **Phase 4: Documentation & Deployment Prep (Day 6)**
   - Update README, ARCHITECTURE.md, API.md, OPERATIONS.md
   - Create Kubernetes manifests
   - Test deployment to microk8s cluster
   - Validate health checks

5. **Phase 5: Production Deployment (Day 7)**
   - Archive previous changes
   - Deploy to production namespace
   - Monitor logs and health checks
   - Verify session recovery after pod restart

## Risk Mitigation

### High-Risk Areas

1. **Database Schema Migrations**
   - Risk: Migration failure leaves database in inconsistent state
   - Mitigation: Transactional migrations, automatic backups before migration, rollback procedures documented

2. **Session Recovery**
   - Risk: Recovered agents resume execution and cause duplicate work
   - Mitigation: Manual resume only (recovery loads metadata but doesn't auto-resume)

3. **Background Jobs**
   - Risk: Job failures cause data loss (e.g., retention cleanup too aggressive)
   - Mitigation: Configurable retention periods, manual reconciliation endpoint, automatic backups

4. **Count Reconciliation**
   - Risk: Incorrect reconciliation logic corrupts counts
   - Mitigation: Read-only query first, log before/after values, manual trigger for testing

### Testing Validations

Each high-risk area requires specific test coverage:

- **Migrations**: Test each migration version (v1→v2, v2→v3), test rollback, test idempotency
- **Session Recovery**: Test with running/paused/stopped agents, test message loading, test error handling
- **Background Jobs**: Test each job independently, test concurrent prevention, test error handling
- **Count Reconciliation**: Test with various agent states, test edge cases (no agents, no projects)

## Performance Considerations

### Database Operations

- All repositories use prepared statements (compiled once, executed many times)
- Indexes on all foreign keys and frequently queried columns
- Message retention prevents unbounded table growth
- Periodic vacuum reclaims deleted space

Expected performance:
- Database queries: <10ms (indexed lookups)
- Session recovery: <1s for 100 agents
- Background jobs: <5s each (except vacuum which may take 30-60s)

### Memory Usage

- Message buffers limited to 1000 messages per agent (configurable)
- Database connection is singleton (no connection pool needed for SQLite)
- Background jobs run sequentially (no parallel execution)

Expected memory:
- Base: ~50MB (Next.js + React)
- Per agent: ~5MB (message buffer + session state)
- Max: ~150MB for 20 concurrent agents

### Disk Usage

- Database grows ~1KB per message
- Retention policy limits growth (30 days default)
- Vacuum reclaims deleted space (weekly)
- Backups consume ~2x database size (7 backups = 14x)

Expected disk:
- Database: 50-500MB (depends on usage)
- Backups: 350MB-3.5GB (7 backups)
- Total: <5GB for typical usage

## Deployment Considerations

### Kubernetes Constraints

- **Single replica only** - SQLite does not support concurrent writes from multiple pods
- **Persistent volume required** - Database must survive pod restarts
- **Backup strategy** - Copy database file to separate storage (S3, NFS)

### Scalability Limits

Current architecture supports:
- **20 concurrent agents** (hard limit in code)
- **1000 messages per agent** (message buffer limit)
- **Unlimited projects/worktrees** (database has no limits)
- **30 days message retention** (configurable)

Future scalability (requires migration to PostgreSQL):
- Multiple replicas (horizontal scaling)
- Concurrent writes from multiple pods
- Distributed job execution

### Operational Procedures

**Backup:**
```bash
# Automatic (daily at 1 AM)
cp database.sqlite database.sqlite.backup-$(date +%Y%m%d)

# Manual
kubectl exec -n agent-view agent-view-pod -- cp /data/database.sqlite /data/backup.sqlite
```

**Restore:**
```bash
# Stop pod, restore database, restart pod
kubectl scale deployment agent-view --replicas=0
kubectl cp backup.sqlite agent-view-pod:/data/database.sqlite
kubectl scale deployment agent-view --replicas=1
```

**Reconcile Counts:**
```bash
# Via API
curl -X POST http://agent-view.local/api/admin/reconcile

# For specific project
curl -X POST http://agent-view.local/api/admin/reconcile \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-id-here"}'
```

**Reset Database:**
```bash
# DANGER: Deletes all data
kubectl exec -n agent-view agent-view-pod -- rm /data/database.sqlite
kubectl delete pod -l app=agent-view # Restart pod to recreate
```
