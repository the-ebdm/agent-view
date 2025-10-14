## ADDED Requirements

### Requirement: Agent Reply

The system SHALL support sending follow-up messages to agents with captured session IDs.

#### Scenario: Reply to active agent
- **WHEN** a POST request is made to `/api/agents/{id}/reply` with `{ message: string }` for an agent with a session_id
- **THEN** a new SDK query MUST be created with `resume: session_id` and the provided message as prompt
- **AND** the agent's conversation history MUST be preserved automatically by the SDK
- **AND** the reply MUST execute in the agent's original directory with original tool permissions
- **AND** a new agent instance MUST be created to represent the continued conversation

#### Scenario: Reply to completed agent
- **WHEN** replying to an agent with status 'completed' and a valid session_id
- **THEN** the reply MUST create a new agent that continues from the completion point
- **AND** the original agent MUST remain in history unchanged
- **AND** the new agent's name MUST be "{originalName} (reply)"

#### Scenario: Reply without session ID
- **WHEN** attempting to reply to an agent without a session_id
- **THEN** the system MUST return a 400 error
- **AND** the error message MUST indicate "Cannot reply: agent has no session ID"

#### Scenario: Reply with empty message
- **WHEN** a reply request contains an empty or whitespace-only message
- **THEN** the system MUST return a 400 error with message "Reply message cannot be empty"

### Requirement: Agent Fork

The system SHALL support branching agent conversations from any point in their session history.

#### Scenario: Fork from active agent
- **WHEN** a POST request is made to `/api/agents/{id}/fork` with `{ prompt: string, name?: string }` for an agent with a session_id
- **THEN** a new SDK query MUST be created with `resume: session_id` and `forkSession: true`
- **AND** the fork MUST receive a new unique session_id from the SDK
- **AND** a new agent instance MUST be created with the forked session
- **AND** the original agent MUST continue independently if still running

#### Scenario: Fork from historical agent
- **WHEN** forking from an agent in history with a valid session_id
- **THEN** a new agent MUST be created that branches from the historical conversation point
- **AND** the historical agent MUST remain unchanged
- **AND** the fork MUST have access to all conversation history up to the branch point

#### Scenario: Fork with custom name
- **WHEN** a fork request includes a custom name
- **THEN** the new agent MUST use the custom name
- **AND** the name MUST be validated and ensured unique
- **AND** if invalid, MUST return 400 error with validation message

#### Scenario: Fork without session ID
- **WHEN** attempting to fork an agent without a session_id
- **THEN** the system MUST return a 400 error
- **AND** the error message MUST indicate "Cannot fork: agent has no session ID"

#### Scenario: Fork tool permissions inheritance
- **WHEN** forking an agent
- **THEN** the fork MUST use default tool permissions (not inherited from parent)
- **AND** the fork's permissions MUST be configurable via request body

### Requirement: Session-Based Pause/Resume

The system SHALL implement pause and resume using SDK session resumption instead of generator suspension.

#### Scenario: Pause with session preservation
- **WHEN** a running agent is paused via `/api/agents/{id}/pause`
- **THEN** the agent's SDK generator MUST be stopped gracefully
- **AND** the agent's lifecycleState MUST change to 'paused'
- **AND** the agent's session_id MUST be preserved in the database
- **AND** the pausedTime MUST be recorded

#### Scenario: Resume with SDK session resumption
- **WHEN** a paused agent is resumed via `/api/agents/{id}/resume`
- **THEN** a new SDK query MUST be created with `resume: session_id`
- **AND** the agent's lifecycleState MUST change to 'running'
- **AND** the conversation MUST continue from exactly where it was paused
- **AND** the pausedTime MUST be cleared

#### Scenario: Resume after server restart
- **WHEN** the server restarts with paused agents in the database
- **THEN** paused agents with session_id MUST be loaded into memory
- **AND** MUST remain in paused state until explicitly resumed
- **AND** MUST be resumable via `/api/agents/{id}/resume` with full context

#### Scenario: Pause during tool execution
- **WHEN** a pause request is made while the SDK is executing a tool
- **THEN** the system MUST wait for the current tool to complete (up to 30 seconds)
- **AND** MUST show "Pausing..." state in the UI
- **AND** MUST force-stop the generator after 30-second timeout if tool does not complete

#### Scenario: Resume without session ID
- **WHEN** attempting to resume a paused agent without a session_id
- **THEN** the system MUST return a 400 error
- **AND** the error message MUST indicate "Cannot resume: agent has no session ID"
- **AND** MUST suggest restarting instead of resuming

## MODIFIED Requirements

### Requirement: Agent Pause

The system SHALL support pausing agent execution using SDK session management while preserving state for later resumption.

#### Scenario: Pause running agent
- **WHEN** a POST request is made to `/api/agents/{id}/pause` for a running agent
- **THEN** the agent's SDK execution generator MUST be stopped gracefully
- **AND** the agent's lifecycleState changes to "paused"
- **AND** the agent's current state is preserved via session_id in database
- **AND** no new messages are generated until resumed

#### Scenario: Pause already paused agent
- **WHEN** a POST request is made to `/api/agents/{id}/pause` for an agent that is already paused
- **THEN** the system returns a 400 error with message "Agent is already paused"
- **AND** the agent's lifecycleState remains "paused"

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

The system SHALL support resuming paused agents using SDK session resumption to continue from their previous state.

#### Scenario: Resume paused agent
- **WHEN** a POST request is made to `/api/agents/{id}/resume` for a paused agent with a session_id
- **THEN** a new SDK query MUST be created with `resume: session_id`
- **AND** the agent's lifecycleState changes to "running"
- **AND** new messages begin streaming with full conversation context preserved
- **AND** the agent's conversation continues from exactly where it was paused

#### Scenario: Resume within 2 seconds
- **WHEN** a paused agent is resumed
- **THEN** the SDK query MUST begin within 2 seconds
- **AND** the UI shows "Resuming..." indicator during transition
- **AND** the first new message appears within 10 seconds

#### Scenario: Resume running agent
- **WHEN** a POST request is made to `/api/agents/{id}/resume` for a running agent
- **THEN** the system returns a 400 error with message "Agent is already running"
- **AND** the agent continues running normally

#### Scenario: Resume completed agent
- **WHEN** a POST request is made to `/api/agents/{id}/resume` for a completed agent
- **THEN** the system returns a 400 error with message "Cannot resume completed agent"
- **AND** suggests using reply instead

#### Scenario: Resume after long pause
- **WHEN** a paused agent is resumed after 1+ hours
- **THEN** the SDK session MUST be resumed successfully if not expired
- **AND** the agent's context MUST be intact
- **AND** the elapsedTime reflects total active time (excluding paused duration)
- **AND** if session expired, MUST return error "Session expired, please restart"
