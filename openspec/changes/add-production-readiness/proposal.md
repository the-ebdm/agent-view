# Production Readiness & Testing

## Why

Three major database and persistence features have been implemented (`add-sqlite-persistence`, `add-projects-data-model`, `add-openspec-database-cache`) with core functionality complete and working. However, several production-readiness tasks remain incomplete:

**Build Quality Issues**
- **TypeScript linting errors blocking build** - 30+ `@typescript-eslint/no-explicit-any` and `no-require-imports` errors prevent production builds
- Unused variables and imports need cleanup
- Type safety compromised with excessive `any` usage

**Missing Production Features**
- **No session recovery** - Agents lost on server restart (database persistence exists but recovery not implemented)
- **No health monitoring** - Cannot check database connectivity or schema status
- **No automated maintenance** - Message retention, database vacuum, and backups are manual
- **No count reconciliation** - Project/worktree agent counts can drift out of sync
- **No default settings application** - Project-level tool permissions and OpenSpec paths not applied to agents

**Testing & Documentation Gaps**
- **Zero automated tests** - All validation is manual, no test framework configured
- **Incomplete documentation** - Database features, API endpoints, and operational procedures undocumented
- **No error recovery validation** - Database failures, corruption, and edge cases untested

**Impact on Production Deployment**
- Cannot deploy to Kubernetes cluster with confidence
- No recovery mechanism if pods restart
- No observability into system health
- Manual operational burden (cleanup, backups, count fixes)
- Type safety issues may cause runtime errors

This proposal consolidates all remaining production-readiness work into a single, comprehensive change that brings the entire application to deployment-ready quality.

## What Changes

Implement comprehensive production readiness across code quality, operational features, testing, and documentation:

**1. Code Quality & Build Fixes (CRITICAL - Blocking)**
- Fix all TypeScript linting errors (30+ violations)
  - Replace `any` types with proper TypeScript types (`unknown`, specific types)
  - Convert `require()` imports to ES6 `import` statements
  - Remove unused variables and imports
  - Add proper error type handling (`error instanceof Error`)
- Ensure `npm run build` passes without errors
- Enable strict TypeScript checks across all new files

**2. Session Recovery & Startup**
- Implement agent session recovery on server startup
  - Load active agents from database (lifecycle_state IN ('running', 'paused'))
  - Restore to `AgentSessionManager.activeAgents` map
  - Log recovery statistics (agents restored, errors)
- Add database health check on startup
  - Verify connectivity and schema version
  - Log warnings if database degraded
  - Continue operation if database unavailable (graceful degradation)

**3. Automated Background Jobs**
- Implement job scheduler framework (`src/lib/database/jobs.ts`)
  - Message retention cleanup (daily, configurable retention days)
  - Database vacuum (weekly, reclaim deleted space)
  - Automatic backups (daily, keep last 7 backups)
  - Count reconciliation (daily, fix project/worktree counts)
- Add job execution logging and error handling
- Make job schedules configurable via settings table

**4. API Health & Monitoring Endpoints**
- Create `/api/health/database` endpoint
  - Database connectivity status
  - Schema version information
  - Database file size and statistics
  - Last vacuum/backup timestamps
- Create `/api/admin/reconcile` endpoint
  - Trigger project/worktree count reconciliation
  - Support optional projectId parameter
  - Return correction statistics

**5. Project Settings Application**
- Apply project default tool permissions on agent spawn
  - Check if agent spawn has explicit toolPermissions
  - If not, query project's default_tool_permissions
  - Use project default or fall back to global default
- Apply project OpenSpec path in CLI commands
  - Modify OpenSpec CLI wrapper to accept project context
  - Add `--path` flag when project has custom openspec_path
  - Resolve relative paths from project directory

**6. Testing Infrastructure**
- Set up Vitest testing framework
  - Install vitest, @vitest/ui dependencies
  - Configure vitest.config.ts for Next.js compatibility
  - Add test scripts to package.json
- Implement critical path tests
  - Database schema initialization and migrations
  - Agent session lifecycle (create, update, recovery)
  - Message persistence and retrieval
  - Project/worktree auto-discovery
  - OpenSpec sync (filesystem → database)
  - Repository CRUD operations
- Add test coverage reporting
- Document testing conventions in project.md

**7. Documentation Updates**
- Update README.md
  - Database location, configuration, and backup procedures
  - Environment variables reference (complete list)
  - Deployment instructions for Kubernetes
  - Troubleshooting guide (database issues, recovery procedures)
- Create architecture documentation
  - Database schema diagrams (all 3 versions)
  - Data flow diagrams (agent spawn, message persistence, sync)
  - API endpoint reference with examples
  - Repository pattern explanation
- Document operational procedures
  - Backup and restore procedures
  - Database migration process
  - Count reconciliation when needed
  - Health monitoring and alerting setup

## Impact

- **Depends on**: `add-sqlite-persistence`, `add-projects-data-model`, `add-openspec-database-cache` (all three completed changes)
- **Affected capabilities**:
  - `agent-persistence` (from add-sqlite-persistence)
  - `project-management` (from add-projects-data-model)
  - `openspec-persistence` (from add-openspec-database-cache)
- **Affected code**:
  - `src/lib/openspec/*.ts` - Fix linting errors (cli-wrapper, fs-operations, git-utils, sync)
  - `src/types/project.ts` - Fix linting errors (any types)
  - `src/lib/database/schema.ts` - Fix unused variable warnings
  - `src/lib/agent-session-manager.ts` - Add session recovery
  - `src/instrumentation.ts` - Add startup health checks
  - New: `src/lib/database/jobs.ts` - Background job scheduler
  - New: `src/app/api/health/database/route.ts` - Health check endpoint
  - New: `src/app/api/admin/reconcile/route.ts` - Reconciliation endpoint
  - `src/app/api/agents/spawn/route.ts` - Apply project default settings
  - `src/lib/openspec/cli-wrapper.ts` - Project-aware OpenSpec commands
  - New: `vitest.config.ts` - Test framework configuration
  - New: `src/__tests__/` - Test suites
  - `README.md`, `docs/ARCHITECTURE.md` - Documentation updates
- **Breaking changes**: None (all additions and improvements)
- **Dependencies**:
  - Add `vitest`, `@vitest/ui` (testing framework)
  - Add `node-cron` (job scheduling)
- **Deployment impact**:
  - Ready for production Kubernetes deployment after completion
  - Database initialization on first pod startup
  - Health checks for pod readiness/liveness probes
  - Graceful degradation if database unavailable
