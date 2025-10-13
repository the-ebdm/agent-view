# message-persistence Specification

## Purpose
TBD - created by archiving change add-sqlite-persistence. Update Purpose after archive.
## Requirements
### Requirement: Message Persistence

The system SHALL persist all agent messages to SQLite database for replay, debugging, and analytics.

#### Scenario: Message created
- **WHEN** `AgentExecutionManager` broadcasts a message via `broadcastMessage()`
- **THEN** the message MUST be inserted into the `messages` table with agent_id, type, content, timestamp, tool_name (if applicable), and tool_params (if applicable)

#### Scenario: Message retrieved for agent
- **WHEN** `MessagesRepository.findByAgentId(agentId)` is called
- **THEN** all messages for that agent MUST be returned in chronological order (timestamp ASC)

#### Scenario: Message retrieved with pagination
- **WHEN** `MessagesRepository.findByAgentId(agentId, { limit, offset })` is called
- **THEN** messages MUST be returned with pagination applied
- **AND** results MUST be ordered by timestamp ASC

#### Scenario: Message count for agent
- **WHEN** `MessagesRepository.countByAgentId(agentId)` is called
- **THEN** the total number of messages for that agent MUST be returned

#### Scenario: Messages deleted with agent
- **WHEN** an agent is deleted via `AgentsRepository.delete(id)`
- **THEN** all messages with agent_id = id MUST be cascade deleted via foreign key

### Requirement: Message Buffer Persistence

The system SHALL persist message buffers for late subscribers to enable stream reconnection.

#### Scenario: Buffer messages retrieved
- **WHEN** a new stream subscriber connects via `/api/agents/[id]/stream`
- **THEN** the last 100 messages MUST be retrieved from the database
- **AND** messages MUST be sent to the subscriber before live messages

#### Scenario: Buffer messages limited
- **WHEN** message buffer is retrieved
- **THEN** a maximum of 100 messages MUST be returned (most recent first)

### Requirement: Database Schema - Messages Table

The system SHALL maintain a `messages` table with the following schema:

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('assistant', 'tool_use', 'tool_result', 'result', 'error')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tool_name TEXT,
  tool_params TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
```

#### Scenario: Messages table indexes
- **WHEN** the messages table is created
- **THEN** indexes MUST be created on agent_id, timestamp, and type columns for query performance

### Requirement: Messages Repository

The system SHALL provide a `MessagesRepository` class with type-safe data access methods.

#### Scenario: Create message record
- **WHEN** `MessagesRepository.create(message)` is called
- **THEN** the message MUST be inserted into the database
- **AND** the operation MUST use a prepared statement
- **AND** the auto-generated id MUST be returned

#### Scenario: Find messages by agent ID
- **WHEN** `MessagesRepository.findByAgentId(agentId)` is called
- **THEN** all messages for that agent MUST be returned
- **AND** results MUST be ordered by timestamp ASC

#### Scenario: Find recent messages for buffer
- **WHEN** `MessagesRepository.findRecentByAgentId(agentId, limit)` is called
- **THEN** the most recent `limit` messages MUST be returned
- **AND** results MUST be ordered by timestamp DESC

#### Scenario: Count messages by agent
- **WHEN** `MessagesRepository.countByAgentId(agentId)` is called
- **THEN** the total message count MUST be returned

#### Scenario: Delete old messages (retention policy)
- **WHEN** `MessagesRepository.deleteOlderThan(timestamp)` is called
- **THEN** all messages with timestamp < specified value MUST be deleted
- **AND** the number of deleted rows MUST be returned

### Requirement: Message Retention Policy

The system SHALL automatically delete old messages to prevent unbounded database growth.

#### Scenario: Retention policy configured
- **WHEN** the system starts
- **THEN** the `MESSAGE_RETENTION_DAYS` setting MUST be read from the settings table (default: 30)

#### Scenario: Retention policy enforced
- **WHEN** a background job runs (every 24 hours)
- **THEN** messages older than MESSAGE_RETENTION_DAYS MUST be deleted from the database
- **AND** the number of deleted messages MUST be logged

#### Scenario: Retention policy disabled
- **WHEN** MESSAGE_RETENTION_DAYS is set to 0 or null
- **THEN** no messages MUST be automatically deleted

