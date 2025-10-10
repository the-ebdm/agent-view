# Agent Lifecycle Control Specification

## ADDED Requirements

### Requirement: Agent Pause
The system SHALL support pausing agent execution while preserving state for later resumption.

#### Scenario: Pause running agent
- **WHEN** a POST request is made to `/api/agents/{id}/pause` for a running agent
- **THEN** the agent's execution is suspended
- **AND** the agent's status changes to "paused"
- **AND** the agent's current state is preserved (conversation context, messages)
- **AND** no new messages are generated until resumed

#### Scenario: Pause already paused agent
- **WHEN** a POST request is made to `/api/agents/{id}/pause` for an agent that is already paused
- **THEN** the system returns a 400 error with message "Agent is already paused"
- **AND** the agent's status remains "paused"

#### Scenario: Pause completed agent
- **WHEN** a POST request is made to `/api/agents/{id}/pause` for an agent with status "completed"
- **THEN** the system returns a 400 error with message "Cannot pause completed agent"

#### Scenario: Pause agent with error
- **WHEN** a POST request is made to `/api/agents/{id}/pause` for an agent with status "error"
- **THEN** the system returns a 400 error with message "Cannot pause agent in error state"

#### Scenario: View paused agent output
- **WHEN** viewing the output of a paused agent
- **THEN** the UI displays a banner "Agent paused" with a resume button
- **AND** all previous messages are visible
- **AND** no new messages appear until resumed

### Requirement: Agent Resume
The system SHALL support resuming paused agents from their previous state.

#### Scenario: Resume paused agent
- **WHEN** a POST request is made to `/api/agents/{id}/resume` for a paused agent
- **THEN** the agent's execution continues from where it was paused
- **AND** the agent's status changes to "running"
- **AND** new messages begin streaming
- **AND** the agent's conversation context is preserved

#### Scenario: Resume within 2 seconds
- **WHEN** a paused agent is resumed
- **THEN** the agent begins generating messages within 2 seconds
- **AND** the UI shows "Resuming..." indicator during transition

#### Scenario: Resume running agent
- **WHEN** a POST request is made to `/api/agents/{id}/resume` for a running agent
- **THEN** the system returns a 400 error with message "Agent is already running"
- **AND** the agent continues running normally

#### Scenario: Resume completed agent
- **WHEN** a POST request is made to `/api/agents/{id}/resume` for a completed agent
- **THEN** the system returns a 400 error with message "Cannot resume completed agent"
- **AND** suggests using restart instead

#### Scenario: Resume after long pause
- **WHEN** a paused agent is resumed after 1+ hours
- **THEN** the agent resumes successfully
- **AND** the agent's context is intact
- **AND** the elapsedTime reflects total active time (excluding paused duration)

### Requirement: Agent Stop
The system SHALL support graceful termination of agents, moving them to history.

#### Scenario: Stop running agent
- **WHEN** a POST request is made to `/api/agents/{id}/stop`
- **THEN** the agent's execution is terminated gracefully
- **AND** the agent's status changes to "interrupted"
- **AND** the agent is removed from active agents list
- **AND** the agent is added to history
- **AND** streaming connections are closed

#### Scenario: Stop paused agent
- **WHEN** a POST request is made to `/api/agents/{id}/stop` for a paused agent
- **THEN** the agent is terminated without resuming
- **AND** the agent's status changes to "interrupted"
- **AND** the agent is moved to history

#### Scenario: Stop agent with confirmation
- **WHEN** the user clicks "Stop" on an agent card
- **THEN** the UI shows a confirmation dialog "Stop Agent X?"
- **AND** includes warning "This cannot be undone"
- **AND** only stops agent after confirmation

#### Scenario: Stop already stopped agent
- **WHEN** a POST request is made to `/api/agents/{id}/stop` for an already stopped agent
- **THEN** the system returns a 404 error with message "Agent not found in active agents"

### Requirement: Agent Restart
The system SHALL support restarting agents with the same configuration.

#### Scenario: Restart agent
- **WHEN** a POST request is made to `/api/agents/{id}/restart`
- **THEN** the system stops the current agent (if active)
- **AND** spawns a new agent with the same prompt, directory, and tool permissions
- **AND** the new agent receives a new unique ID
- **AND** the old agent is moved to history with status "interrupted"
- **AND** the new agent's name is "{oldName} (restarted)"

#### Scenario: Restart from history
- **WHEN** a user clicks "Restart" on a historical agent
- **THEN** a new agent is spawned with the same configuration
- **AND** the new agent appears in active agents list
- **AND** the historical agent remains in history

#### Scenario: Restart with modified configuration
- **WHEN** a POST request is made to `/api/agents/{id}/restart` with modified toolPermissions
- **THEN** the new agent uses the updated configuration
- **AND** the old agent's configuration is preserved in history

### Requirement: Lifecycle State Transitions
The system SHALL enforce valid state transitions for agent lifecycle operations.

#### Scenario: Valid state transition: running → paused
- **WHEN** a running agent is paused
- **THEN** the transition succeeds
- **AND** the agent's lifecycleState changes to "paused"

#### Scenario: Valid state transition: paused → running
- **WHEN** a paused agent is resumed
- **THEN** the transition succeeds
- **AND** the agent's lifecycleState changes to "running"

#### Scenario: Valid state transition: running → stopped
- **WHEN** a running agent is stopped
- **THEN** the transition succeeds
- **AND** the agent's lifecycleState changes to "stopped"

#### Scenario: Valid state transition: paused → stopped
- **WHEN** a paused agent is stopped
- **THEN** the transition succeeds
- **AND** the agent's lifecycleState changes to "stopped"

#### Scenario: Invalid state transition: stopped → running
- **WHEN** an attempt is made to resume a stopped agent
- **THEN** the transition fails with 400 error
- **AND** the agent remains in "stopped" state

#### Scenario: Invalid state transition: error → paused
- **WHEN** an attempt is made to pause an agent in error state
- **THEN** the transition fails with 400 error
- **AND** the agent remains in "error" state

### Requirement: Lifecycle Control Performance
The system SHALL complete lifecycle operations within performance targets.

#### Scenario: Pause completes within 1 second
- **WHEN** a running agent is paused
- **THEN** the agent's status changes to "paused" within 1 second
- **AND** the UI updates to show paused state immediately

#### Scenario: Resume completes within 2 seconds
- **WHEN** a paused agent is resumed
- **THEN** the agent begins generating messages within 2 seconds
- **AND** the first new message appears within 5 seconds

#### Scenario: Stop completes within 2 seconds
- **WHEN** a running agent is stopped
- **THEN** the agent is removed from active list within 2 seconds
- **AND** streaming connections are closed within 3 seconds
- **AND** the agent appears in history immediately

### Requirement: Lifecycle Control UI
The system SHALL provide accessible controls for agent lifecycle operations.

#### Scenario: Display lifecycle controls on agent card
- **WHEN** viewing an agent card
- **THEN** the card displays context-appropriate buttons:
  - Running: Pause, Stop
  - Paused: Resume, Stop
  - Completed: Restart
  - Error: Restart, Stop

#### Scenario: Disable controls during transition
- **WHEN** a lifecycle operation is in progress
- **THEN** all lifecycle buttons are disabled
- **AND** a loading spinner is shown
- **AND** buttons re-enable after operation completes

#### Scenario: Show operation feedback
- **WHEN** a lifecycle operation succeeds
- **THEN** a toast notification appears: "Agent paused" / "Agent resumed" / "Agent stopped"
- **AND** the notification auto-dismisses after 3 seconds

#### Scenario: Show operation errors
- **WHEN** a lifecycle operation fails
- **THEN** an error message is displayed on the agent card
- **AND** includes retry button if retriable
- **AND** the error persists until dismissed or retried

### Requirement: Batch Lifecycle Operations
The system SHALL support batch operations across multiple agents.

#### Scenario: Pause all running agents
- **WHEN** the user clicks "Pause All" in the dashboard header
- **THEN** all agents with status "running" are paused
- **AND** a confirmation dialog asks "Pause X agents?"
- **AND** operations execute in parallel
- **AND** shows progress indicator

#### Scenario: Resume all paused agents
- **WHEN** the user clicks "Resume All" in the dashboard header
- **THEN** all agents with status "paused" are resumed
- **AND** operations execute in parallel

#### Scenario: Stop all agents
- **WHEN** the user clicks "Stop All" in the dashboard header
- **THEN** a confirmation dialog asks "Stop all X agents?"
- **AND** includes warning "This will terminate all active work"
- **AND** all agents are stopped after confirmation
- **AND** all agents move to history
