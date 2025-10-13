# Capability: Agent Execution

## ADDED Requirements

### Requirement: Background agent execution on spawn

The system SHALL start agent execution immediately when `/api/agents/spawn` is called, without waiting for stream connections.

#### Scenario: Spawn agent starts execution

**GIVEN** a valid spawn request with prompt and directory
**WHEN** `POST /api/agents/spawn` is called
**THEN** the system SHALL:
- Create an agent session via sessionManager
- Start a background query generator immediately
- Begin processing agent messages in the background
- Return agent ID and status='running' to the client
- Continue execution even if no stream subscribers are connected

#### Scenario: Multiple spawns create independent executions

**GIVEN** multiple spawn requests with different prompts
**WHEN** each request calls `/api/agents/spawn`
**THEN** the system SHALL:
- Create separate query generators for each agent
- Execute all agents concurrently in the background
- Isolate each agent's execution and message stream
- NOT interfere with other running agents

### Requirement: Stream subscription model

The system SHALL allow stream endpoints to subscribe to already-running agent executions without triggering re-execution.

#### Scenario: Stream subscribes to running agent

**GIVEN** an agent that was spawned and is running in the background
**WHEN** `GET /api/agents/[id]/stream` is called
**THEN** the system SHALL:
- Subscribe the stream controller to the agent's message broadcast
- Send buffered messages from agent's message history
- Send live messages as they arrive from the running agent
- NOT create a new query generator
- NOT restart or re-execute the agent

#### Scenario: Multiple streams view same agent

**GIVEN** an agent running in the background
**WHEN** multiple clients connect to `GET /api/agents/[id]/stream`
**THEN** the system SHALL:
- Add each stream controller as a subscriber
- Send the same messages to all subscribers
- Keep all subscribers in sync with agent execution
- Handle subscriber disconnections independently

### Requirement: Message buffering for late subscribers

The system SHALL maintain a buffer of recent messages per agent to support late subscribers who connect after execution has started.

#### Scenario: Late subscriber receives message history

**GIVEN** an agent that has been running for 30 seconds and produced 50 messages
**WHEN** a new stream subscriber connects via `/api/agents/[id]/stream`
**THEN** the system SHALL:
- Send up to 100 most recent buffered messages first (catch-up)
- Then send live messages as they arrive
- Present messages in chronological order
- NOT miss any messages between buffer and live stream

#### Scenario: Buffer size limit prevents memory growth

**GIVEN** an agent that produces more than 100 messages
**WHEN** messages are added to the buffer
**THEN** the system SHALL:
- Maintain only the 100 most recent messages per agent
- Remove oldest messages when buffer is full (ring buffer / FIFO)
- Keep memory usage bounded per agent

### Requirement: Persistent execution across stream disconnections

The system SHALL continue agent execution in the background even when all stream subscribers disconnect.

#### Scenario: Agent continues after stream disconnect

**GIVEN** an agent running with one stream subscriber
**WHEN** the subscriber disconnects (client closes connection)
**THEN** the system SHALL:
- Remove the subscriber from the agent's subscriber set
- Continue running the agent's query generator
- Continue adding messages to the message buffer
- Allow new subscribers to connect later and see full history

#### Scenario: Agent runs with zero subscribers

**GIVEN** an agent spawned via `/api/agents/spawn`
**WHEN** no stream subscribers ever connect
**THEN** the system SHALL:
- Continue executing the agent to completion
- Buffer messages up to the 100-message limit
- Persist messages via sessionManager
- Complete successfully and clean up resources

### Requirement: Execution lifecycle management

The system SHALL support stopping agent execution and cleaning up resources when agents complete or are manually stopped.

#### Scenario: Stop agent terminates execution

**GIVEN** an agent running in the background
**WHEN** `POST /api/agents/[id]/stop` is called
**THEN** the system SHALL:
- Gracefully close the query generator (call generator.return() if available)
- Broadcast a system message to all subscribers about the stop
- Remove the agent from active executions
- Clean up message buffers after 5-minute delay
- Update session lifecycle state to 'stopped'

#### Scenario: Completed agent cleans up resources

**GIVEN** an agent running in the background
**WHEN** the agent's query generator produces a 'result' message (completion)
**THEN** the system SHALL:
- Broadcast the result message to all subscribers
- Remove the agent from active executions immediately
- Keep message buffer available for 5 minutes for late subscribers
- Delete message buffer and subscriber set after 5-minute delay
- Update session status to 'completed'

#### Scenario: Error in agent execution

**GIVEN** an agent running in the background
**WHEN** the agent's query generator throws an error or produces an 'error' message
**THEN** the system SHALL:
- Broadcast the error message to all subscribers
- Update session lifecycle state to 'error'
- Stop execution and clean up resources
- Keep error messages in buffer for investigation

### Requirement: Resource limits

The system SHALL enforce limits on concurrent agents and message buffers to prevent resource exhaustion.

#### Scenario: Maximum concurrent agents enforced

**GIVEN** 20 agents already running in the background
**WHEN** a new spawn request is received
**THEN** the system SHALL:
- Reject the request with an error response
- Return HTTP 429 (Too Many Requests) or 503 (Service Unavailable)
- Include error message explaining the limit
- NOT start the new agent execution

#### Scenario: Message buffer limits memory usage

**GIVEN** each agent maintains a 100-message buffer
**WHEN** 20 agents are running concurrently
**THEN** the system SHALL:
- Use approximately 1-2 MB total for all message buffers
- Keep memory usage bounded regardless of agent runtime
- NOT grow unbounded with long-running agents

## MODIFIED Requirements

### Requirement: Agent spawn API contract

The `/api/agents/spawn` endpoint SHALL start agent execution immediately and return without waiting for completion.

#### Scenario: Spawn returns after starting execution

**GIVEN** a spawn request
**WHEN** `POST /api/agents/spawn` is called
**THEN** the system SHALL:
- Start background execution
- Return response immediately (do NOT await agent completion)
- Return status='running' in the response
- Include agent ID and name in response

**CHANGED FROM:** Previously returned status without actually starting execution, misleading the client about agent state.

### Requirement: Stream API contract

The `/api/agents/[id]/stream` endpoint SHALL subscribe to existing agent execution rather than starting new execution.

#### Scenario: Stream does not start execution

**GIVEN** an agent ID from a previous spawn
**WHEN** `GET /api/agents/[id]/stream` is called
**THEN** the system SHALL:
- Subscribe to existing execution
- NOT create a new query generator
- NOT start a new execution

**CHANGED FROM:** Previously created and started a new query generator each time, causing duplicate executions.

## REMOVED Requirements

### Requirement: Single-use execution on stream connection

The requirement that each stream connection creates its own independent agent execution is REMOVED.

**REMOVED BECAUSE:** This caused duplicate executions and prevented multiple viewers from seeing the same agent's output.

### Requirement: Execution tied to stream lifecycle

The requirement that agent execution terminates when the stream connection closes is REMOVED.

**REMOVED BECAUSE:** Agents should run persistently in the background, independent of UI connections.
