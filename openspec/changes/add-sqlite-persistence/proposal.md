# SQLite Database Persistence

## Why

Agent View currently relies on in-memory storage (AgentSessionManager, AgentExecutionManager) and browser localStorage (AgentConfigStorage), which means:

- **Data loss on server restart** - All active agents, messages, and execution state are lost when the Node.js process restarts
- **No cross-device sync** - Saved configurations in localStorage are browser-specific and not accessible from mobile devices
- **Limited analytics** - Cannot query historical agent performance, costs, or usage patterns
- **No recovery capability** - Cannot restore interrupted agents after crashes or deployments
- **Scalability constraints** - In-memory storage limits history size and concurrent agents

Implementing SQLite persistence enables session recovery, historical analysis, and a foundation for advanced features like agent collaboration and task scheduling.

## What Changes

Add SQLite database persistence using `better-sqlite3` with database located at `~/.config/agent-view/database.sqlite`:

**Core Persistence**
- Persist all agent sessions (active and historical) to `agents` table
- Persist all agent messages to `messages` table for replay and debugging
- Persist agent execution snapshots for recovery after server restarts
- Migrate saved configurations from localStorage to `agent_configs` table
- Track agent metrics over time in `agent_metrics` table
- Store application settings in `settings` table

**Data Access Layer**
- Create database client singleton with connection pooling
- Implement repository pattern for clean data access (AgentsRepository, MessagesRepository, etc.)
- Add migration system for schema versioning
- Integrate repositories with existing managers (AgentSessionManager, AgentExecutionManager)

**Recovery & Analytics**
- Enable agent session recovery on server startup
- Support historical queries for analytics dashboard (Phase 4)
- Implement retention policies for automatic cleanup of old data

## Impact

- **Affected capabilities**: agent-management, streaming-output, agent-lifecycle-control (from existing changes)
- **New capabilities**: agent-persistence, message-persistence, config-persistence
- **Affected code**:
  - `src/lib/agent-session-manager.ts` - Add database persistence
  - `src/lib/agent-execution-manager.ts` - Log messages to database
  - `src/lib/agent-templates.ts` - Replace AgentConfigStorage with database
  - New: `src/lib/database/` - Database client, schema, repositories
- **Breaking changes**: None (backward compatible, graceful migration from in-memory/localStorage)
- **Dependencies**: Add `better-sqlite3` package
- **Configuration**: Database path configurable via environment variable (default: `~/.config/agent-view/database.sqlite`)
