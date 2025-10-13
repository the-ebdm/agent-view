# multi-agent-orchestration Specification

## Purpose
TBD - created by archiving change add-phase2-multi-agent. Update Purpose after archive.
## Requirements
### Requirement: Concurrent Agent Spawning
The system SHALL support spawning unlimited concurrent agents, each with independent execution context.

#### Scenario: Spawn multiple agents with different directories
- **WHEN** multiple POST requests are made to `/api/agents/spawn` with different directories
- **THEN** each agent receives a unique ID and begins executing independently
- **AND** agents do not interfere with each other's execution
- **AND** all agents appear in the active agents list

#### Scenario: Spawn agent without terminating existing agents
- **WHEN** a POST request is made to `/api/agents/spawn` while other agents are running
- **THEN** the new agent starts without terminating existing agents
- **AND** all agents (new and existing) remain in "running" status

#### Scenario: Spawn agent with same directory as existing agent
- **WHEN** a POST request is made to `/api/agents/spawn` with a directory already used by an active agent
- **THEN** both agents execute successfully in the same directory
- **AND** the system shows a warning "Another agent is active in this directory"

### Requirement: Agent Naming
The system SHALL assign auto-generated names to agents with support for user editing.

#### Scenario: Auto-generate agent name
- **WHEN** an agent is spawned without a `name` parameter
- **THEN** the system generates a unique name (e.g., "Agent Alpha-5", "Agent Bravo-2")
- **AND** the name uses phonetic alphabet words and random numbers
- **AND** the name is displayed in the agent card

#### Scenario: Spawn agent with custom name
- **WHEN** an agent is spawned with a valid `name` parameter
- **THEN** the agent uses the provided name
- **AND** the name must be unique among active agents

#### Scenario: Spawn agent with duplicate name
- **WHEN** an agent is spawned with a name already used by an active agent
- **THEN** the system returns a 400 error with message "Agent name already in use"
- **AND** suggests appending a number (e.g., "MyAgent" → "MyAgent 2")

#### Scenario: Edit agent name
- **WHEN** a PUT request is made to `/api/agents/{id}/rename` with a valid name
- **THEN** the agent's name is updated
- **AND** the new name is displayed in the UI
- **AND** the name must be unique among active agents

#### Scenario: Edit agent name with invalid characters
- **WHEN** a PUT request is made to `/api/agents/{id}/rename` with invalid characters
- **THEN** the system returns a 400 error with message "Invalid name: only alphanumeric, spaces, hyphens allowed"
- **AND** the name must be 1-50 characters

### Requirement: Active Agents List
The system SHALL provide an API to retrieve all currently active agents.

#### Scenario: List all active agents
- **WHEN** a GET request is made to `/api/agents`
- **THEN** the system returns an array of all agents with status "running" or "paused"
- **AND** each agent includes: id, name, prompt, directory, status, startTime, messageCount, toolPermissions

#### Scenario: List active agents when none exist
- **WHEN** a GET request is made to `/api/agents` with no active agents
- **THEN** the system returns an empty array
- **AND** the response has 200 status

#### Scenario: Filter active agents by status
- **WHEN** a GET request is made to `/api/agents?status=paused`
- **THEN** the system returns only agents with "paused" status
- **AND** running agents are excluded from results

### Requirement: Agent Metrics
The system SHALL track and expose real-time metrics for each agent.

#### Scenario: Retrieve agent metrics
- **WHEN** a GET request is made to `/api/agents/{id}/status`
- **THEN** the response includes metrics: elapsedTime, messageCount, lastActivityTime
- **AND** elapsedTime is calculated as (now - startTime) for running agents
- **AND** elapsedTime is (endTime - startTime) for completed agents

#### Scenario: Track agent activity
- **WHEN** an agent receives a new message
- **THEN** the lastActivityTime is updated to current timestamp
- **AND** messageCount is incremented
- **AND** metrics are available via `/api/agents/{id}/status`

### Requirement: Session Isolation
The system SHALL ensure each agent operates in isolation without cross-contamination.

#### Scenario: Concurrent agents with different directories
- **WHEN** multiple agents are running in different directories
- **THEN** each agent's tool operations are scoped to its assigned directory
- **AND** agents cannot access files outside their directory scope
- **AND** bash commands execute with the agent's cwd

#### Scenario: Concurrent agents with same directory
- **WHEN** multiple agents are running in the same directory
- **THEN** both agents can read and write files in that directory
- **AND** file changes by one agent are visible to the other
- **AND** agents maintain separate conversation contexts

#### Scenario: Agent session cleanup
- **WHEN** an agent is stopped or completes
- **THEN** the agent's session is moved to history
- **AND** the agent is removed from active agents list
- **AND** streaming connections are closed
- **AND** SDK query instance is cleaned up

### Requirement: Resource Tracking
The system SHALL track resource usage across all active agents for monitoring purposes.

#### Scenario: Display active agent count
- **WHEN** the dashboard loads
- **THEN** the header displays "X active agents" where X is the count of running/paused agents
- **AND** the count updates in real-time as agents are spawned/stopped

#### Scenario: Warn about high agent count
- **WHEN** 10 or more agents are active simultaneously
- **THEN** the system displays a warning banner "High agent count may impact performance"
- **AND** the warning includes a "Stop All" button

#### Scenario: Track total message count
- **WHEN** multiple agents are active
- **THEN** the system tracks total messages across all agents
- **AND** displays aggregate metrics in the dashboard header
- **AND** shows "X total messages" where X is sum of all agent message counts

