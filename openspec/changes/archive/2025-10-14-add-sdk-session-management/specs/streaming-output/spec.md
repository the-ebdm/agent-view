## ADDED Requirements

### Requirement: SDK Session Metadata Extraction

The system SHALL extract session metadata from Claude SDK init messages during agent startup.

#### Scenario: Init message with session_id
- **WHEN** the SDK yields a system message with subtype 'init' containing a session_id
- **THEN** the stream handler MUST extract the session_id from the message
- **AND** MUST return it alongside the message stream

#### Scenario: Init message without session_id
- **WHEN** the SDK yields an init message without a session_id field
- **THEN** the stream handler MUST handle the missing session_id gracefully
- **AND** MUST NOT fail or throw an error

#### Scenario: Session metadata broadcast
- **WHEN** session metadata is extracted from an init message
- **THEN** the execution manager MUST receive the metadata
- **AND** MUST store it via the session manager
- **AND** MUST persist it to the database

### Requirement: System Message Processing

The system SHALL process SDK system messages to extract control metadata while filtering them from user-visible output.

#### Scenario: System messages filtered from output
- **WHEN** the stream handler receives a message with type 'system'
- **THEN** the message MUST be processed for metadata extraction
- **AND** MUST NOT be yielded as a user-visible AgentMessage
- **AND** session_id MUST be extracted before filtering

#### Scenario: Non-init system messages
- **WHEN** the stream handler receives a system message that is not an init message
- **THEN** the message MUST be processed for any relevant metadata
- **AND** MUST be filtered from user output
- **AND** MUST be logged for debugging purposes

#### Scenario: Metadata extraction errors
- **WHEN** extracting session metadata fails due to malformed SDK messages
- **THEN** the stream handler MUST log the error
- **AND** MUST continue processing subsequent messages
- **AND** MUST NOT crash the agent execution
