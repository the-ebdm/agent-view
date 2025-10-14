## ADDED Requirements

### Requirement: Session ID Persistence

The system SHALL persist Claude SDK session IDs to enable conversation resumption and forking.

#### Scenario: Session ID captured from SDK
- **WHEN** an agent starts and the SDK yields an init message with session_id
- **THEN** the session_id MUST be extracted and stored in the agents table
- **AND** the session_id MUST be indexed for fast lookups

#### Scenario: Session ID retrieved with agent
- **WHEN** an agent is loaded from the database
- **THEN** the session_id MUST be included in the returned AgentSession object
- **AND** NULL session_id MUST be handled gracefully for legacy agents

#### Scenario: Session ID uniqueness not enforced
- **WHEN** multiple agents resume the same session_id
- **THEN** the database MUST allow duplicate session_id values
- **AND** each agent instance MUST maintain its own unique agent ID

## MODIFIED Requirements

### Requirement: Agent Session Persistence

The system SHALL persist all agent session data including SDK session IDs to SQLite database to survive server restarts.

#### Scenario: Agent session created
- **WHEN** a new agent session is created via `AgentSessionManager.createSession()`
- **THEN** the session data MUST be inserted into the `agents` table with id, name, prompt, directory, status, lifecycle_state, tool_permissions, session_id, start_time, and timestamps

#### Scenario: Agent session updated
- **WHEN** an agent's status, lifecycle_state, session_id, or end_time is updated
- **THEN** the corresponding database row MUST be updated atomically

#### Scenario: Agent session retrieved
- **WHEN** `AgentSessionManager.getSession(id)` is called
- **THEN** the session including session_id MUST be retrieved from the database if not in memory

#### Scenario: Session ID added to existing agent
- **WHEN** an existing agent without session_id receives a session_id from the SDK
- **THEN** the session_id MUST be updated in the database via `AgentsRepository.update()`

#### Scenario: Agent moved to history
- **WHEN** an agent completes, errors, or is stopped
- **THEN** the agent's status, session_id, and end_time MUST be updated in the database
- **AND** the agent MUST remain queryable via `getHistoricalSession()` with full session_id preserved

### Requirement: Database Schema - Agents Table

The system SHALL maintain an `agents` table with session tracking capabilities.

#### Scenario: Agents table includes session_id
- **WHEN** the agents table is created or migrated
- **THEN** a `session_id TEXT` column MUST exist
- **AND** the column MUST be nullable to support legacy agents
- **AND** an index MUST be created on session_id for fast lookups

#### Scenario: Session ID lookup by ID
- **WHEN** querying agents by session_id
- **THEN** the query MUST use the session_id index for performance
- **AND** MUST return all agents with matching session_id (duplicates allowed)

#### Scenario: Legacy agents without session IDs
- **WHEN** querying an agent created before session tracking
- **THEN** the session_id field MUST be NULL
- **AND** all session-dependent operations MUST gracefully handle NULL session_id
