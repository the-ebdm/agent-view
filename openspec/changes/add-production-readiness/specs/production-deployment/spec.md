# Production Deployment

## ADDED Requirements

### System must have automated test coverage for critical paths

**Priority**: HIGH
**Category**: Quality Assurance

The system must have automated tests covering critical data persistence paths, including database operations, session recovery, and OpenSpec synchronization.

**Acceptance Criteria**:
- Vitest testing framework is configured and working
- Database operations have >80% test coverage (schema, migrations, repositories)
- Business logic has >70% test coverage (session management, project discovery)
- API endpoints have >60% test coverage
- Tests run in CI/CD pipeline (future)
- Test execution completes in <30 seconds

#### Scenario: Running full test suite

**Given** test suite is implemented for all critical paths
**When** developer runs `npm run test`
**Then** all database tests pass (schema, migrations, repositories)
**And** all business logic tests pass (session manager, project discovery, openspec sync)
**And** all API tests pass (health endpoints, admin endpoints, agent spawn)
**And** test summary shows >70% overall coverage
**And** tests complete in <30 seconds

#### Scenario: Database schema migration tests

**Given** test database is empty
**When** migration tests execute
**Then** v1 schema creates all tables correctly
**And** v1→v2 migration adds projects/worktrees tables
**And** v2→v3 migration adds openspec tables
**And** migrations are idempotent (can run multiple times safely)
**And** all indexes are created

#### Scenario: Session recovery tests

**Given** test database has 3 active agents
**When** session recovery tests execute
**Then** recoverSessions() loads all 3 agents
**And** message history is loaded for each agent
**And** recovered agents appear in activeAgents map
**And** recovery handles missing messages gracefully

### System must be deployable to Kubernetes with health checks

**Priority**: HIGH
**Category**: Deployment

The system must be deployable to Kubernetes cluster with proper health checks (liveness, readiness, startup probes) that monitor database connectivity and application health.

**Acceptance Criteria**:
- Kubernetes manifests exist (Deployment, Service, PVC, ConfigMap, Secret)
- Health check endpoint supports Kubernetes HTTP probes
- Liveness probe detects critical failures (database corruption, crashes)
- Readiness probe detects degraded states (schema mismatch, high load)
- Startup probe allows sufficient time for database initialization
- PersistentVolumeClaim ensures database survives pod restarts

#### Scenario: Kubernetes liveness probe succeeds

**Given** pod is running with healthy database
**When** Kubernetes executes liveness probe (GET /api/health/database every 30s)
**Then** endpoint returns 200 status
**And** probe succeeds
**And** pod continues running

#### Scenario: Kubernetes readiness probe detects degraded state

**Given** pod is running but database schema is outdated
**When** Kubernetes executes readiness probe (GET /api/health/database every 10s)
**Then** endpoint returns 503 status
**And** probe fails
**And** pod is removed from service load balancing
**And** pod remains running for debugging

#### Scenario: Kubernetes startup probe allows initialization

**Given** pod is starting and initializing database
**When** Kubernetes executes startup probe (GET /api/health/database every 5s, 12 attempts)
**Then** probe waits up to 60 seconds for database initialization
**And** once database is ready, probe succeeds
**And** pod transitions to ready state

#### Scenario: Database persists across pod restarts

**Given** pod has database with 5 active agents
**And** PersistentVolumeClaim is mounted at /data
**When** pod is deleted and recreated
**Then** new pod mounts same PVC
**And** database file exists at /data/database.sqlite
**And** session recovery restores 5 agents
**And** no data is lost

### System must have comprehensive operational documentation

**Priority**: MEDIUM
**Category**: Documentation

The system must have complete documentation covering deployment procedures, operational procedures (backup/restore), troubleshooting, and API reference.

**Acceptance Criteria**:
- README.md includes database configuration and environment variables
- docs/ARCHITECTURE.md includes database schema diagrams and data flow
- docs/API.md includes all endpoint documentation with examples
- docs/OPERATIONS.md includes backup/restore/reconciliation procedures
- Documentation is accurate and tested
- All environment variables are documented with defaults

#### Scenario: Following README to configure database

**Given** new developer reads README.md
**When** developer follows database configuration section
**Then** documentation explains DATABASE_PATH environment variable
**And** explains ENABLE_PERSISTENCE flag (default: true)
**And** explains MESSAGE_RETENTION_DAYS setting (default: 30)
**And** developer successfully configures database location
**And** server starts with correct database path

#### Scenario: Following OPERATIONS.md to perform backup

**Given** operator needs to backup database before maintenance
**When** operator follows OPERATIONS.md backup procedure
**Then** documentation provides manual backup command
**And** explains automated backup schedule (daily at 1 AM)
**And** explains backup rotation policy (keep 7 backups)
**And** operator successfully creates backup
**And** verifies backup file integrity

#### Scenario: Using API.md to call health endpoint

**Given** developer wants to monitor database health
**When** developer reads API.md health endpoint documentation
**Then** documentation shows GET /api/health/database
**And** shows example response with all fields
**And** explains status values (healthy/degraded/error)
**And** provides curl command example
**And** developer successfully calls endpoint

### Project settings must be applied to spawned agents

**Priority**: MEDIUM
**Category**: Configuration Management

When spawning an agent, if the project has default tool permissions or custom OpenSpec path configured, these settings must be automatically applied to the agent.

**Acceptance Criteria**:
- If agent spawn request lacks toolPermissions, project defaults are applied
- If project has custom openspec_path, OpenSpec CLI commands use it
- Explicit permissions in spawn request override project defaults
- Projects without defaults fall back to global defaults
- OpenSpec paths are resolved relative to project directory

#### Scenario: Spawning agent with project default permissions

**Given** project "my-app" has default_tool_permissions = "read-only"
**And** agent spawn request does not specify toolPermissions
**When** agent is spawned in project "my-app" directory
**Then** agent receives "read-only" tool permissions
**And** agent can only use Read, Grep, Glob tools
**And** agent cannot use Write or Bash tools

#### Scenario: Spawning agent with explicit permissions overrides defaults

**Given** project "my-app" has default_tool_permissions = "read-only"
**But** agent spawn request specifies toolPermissions = "full-access"
**When** agent is spawned in project "my-app" directory
**Then** agent receives "full-access" permissions (explicit wins)
**And** agent can use all tools including Write and Bash

#### Scenario: Using project custom OpenSpec path

**Given** project "my-app" has openspec_path = "docs/specs"
**When** agent runs OpenSpec CLI command (list, validate, etc.)
**Then** CLI wrapper adds --path flag with resolved path
**And** OpenSpec command executes: `openspec list --path /full/path/to/my-app/docs/specs`
**And** OpenSpec reads from custom path instead of default

#### Scenario: Spawning agent without project defaults

**Given** project "my-app" has no default_tool_permissions configured
**When** agent is spawned in project "my-app" directory
**Then** agent receives global default permissions (standard)
**And** agent can use Read, Edit, TodoWrite tools
