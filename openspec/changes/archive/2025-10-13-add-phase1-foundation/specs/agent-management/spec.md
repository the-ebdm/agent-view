# Agent Management Specification

## ADDED Requirements

### Requirement: Agent Spawning
The system SHALL provide an API to spawn a Claude Agent with a user-provided prompt and working directory.

#### Scenario: Successful agent spawn with prompt and directory
- **WHEN** a POST request is made to `/api/agents/spawn` with valid prompt and directory
- **THEN** the system returns a unique agent ID and status "running"
- **AND** the agent begins executing in the specified working directory

#### Scenario: Agent spawn with missing API key
- **WHEN** a POST request is made to `/api/agents/spawn` but ANTHROPIC_API_KEY is not configured
- **THEN** the system returns a 500 error with message "API key not configured"

#### Scenario: Agent spawn with invalid directory
- **WHEN** a POST request is made to `/api/agents/spawn` with a non-existent directory path
- **THEN** the system returns a 400 error with message "Invalid directory path"

### Requirement: Agent Status Monitoring
The system SHALL provide an API to retrieve the current status of a running or completed agent.

#### Scenario: Query status of running agent
- **WHEN** a GET request is made to `/api/agents/{id}/status` for an active agent
- **THEN** the system returns the agent's current status ("running", "completed", or "error")
- **AND** includes the agent's start time and working directory

#### Scenario: Query status of non-existent agent
- **WHEN** a GET request is made to `/api/agents/{id}/status` with an invalid agent ID
- **THEN** the system returns a 404 error with message "Agent not found"

### Requirement: Agent History
The system SHALL maintain a history of the last 10 agent runs with their outputs and metadata.

#### Scenario: Retrieve agent history
- **WHEN** a GET request is made to `/api/agents/history`
- **THEN** the system returns an array of up to 10 previous agent runs
- **AND** each run includes agent ID, prompt, directory, start time, end time, status, and message count

#### Scenario: View historical agent output
- **WHEN** a user selects a historical agent run from the history list
- **THEN** the system displays that agent's complete message history
- **AND** the status badge reflects the historical agent's final status

#### Scenario: History persists across new agent spawns
- **WHEN** a new agent is spawned while viewing historical output
- **THEN** the historical output remains visible until the user switches to the new agent
- **AND** the new agent is added to the history list

### Requirement: Single Active Agent
The system SHALL support only one actively running agent at a time.

#### Scenario: Spawn new agent while one is running
- **WHEN** a POST request is made to `/api/agents/spawn` while an agent is already running
- **THEN** the system terminates the currently running agent
- **AND** spawns the new agent with a new unique ID
- **AND** the terminated agent is added to history with status "interrupted"

### Requirement: Agent Session Management
The system SHALL manage agent sessions in memory with unique identifiers and lifecycle tracking.

#### Scenario: Session creation on agent spawn
- **WHEN** an agent is successfully spawned
- **THEN** the system creates a new session with a unique UUID
- **AND** stores the session with metadata (prompt, directory, start time, status)

#### Scenario: Session cleanup on agent completion
- **WHEN** an agent completes execution or encounters an error
- **THEN** the system updates the session status to "completed" or "error"
- **AND** sets the end time
- **AND** moves the session to history storage

#### Scenario: Session cleanup on history overflow
- **WHEN** more than 10 agent runs exist in history
- **THEN** the system removes the oldest historical run
- **AND** retains only the most recent 10 runs
