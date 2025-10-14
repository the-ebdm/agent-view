# approval-workflow Specification

## Purpose
TBD - created by archiving change add-tool-permission-approval-system. Update Purpose after archive.
## Requirements
### Requirement: Pending Approval Tracking

The system SHALL track tool permission requests that require user approval in agent session state.

#### Scenario: Create approval request

- **WHEN** an agent with restricted permissions attempts to use a disallowed tool
- **THEN** the system creates a `PendingApproval` record with unique ID, tool name, description, parameters, and timestamp
- **AND** adds the approval to the agent's pending approvals list
- **AND** returns the approval ID for tracking

#### Scenario: Retrieve pending approvals for agent

- **WHEN** a GET request is made to `/api/agents/{id}/approvals` for an agent with pending approvals
- **THEN** the system returns an array of all pending approval records for that agent
- **AND** includes the total count of pending approvals

#### Scenario: Query approvals for agent with none pending

- **WHEN** a GET request is made to `/api/agents/{id}/approvals` for an agent with no pending approvals
- **THEN** the system returns an empty array
- **AND** returns count of 0

#### Scenario: Query approvals for non-existent agent

- **WHEN** a GET request is made to `/api/agents/{id}/approvals` with an invalid agent ID
- **THEN** the system returns a 404 error with message "Agent not found"

### Requirement: Approval Processing

The system SHALL provide an API to approve or deny pending tool permission requests.

#### Scenario: Approve tool permission request

- **WHEN** a POST request is made to `/api/agents/{id}/approvals/{approvalId}` with action "approve"
- **THEN** the system removes the approval record from the agent's pending approvals
- **AND** returns success response with approval ID and action "approve"
- **AND** signals the Claude Agent SDK to proceed with the tool use

#### Scenario: Deny tool permission request

- **WHEN** a POST request is made to `/api/agents/{id}/approvals/{approvalId}` with action "deny"
- **THEN** the system removes the approval record from the agent's pending approvals
- **AND** returns success response with approval ID and action "deny"
- **AND** signals the Claude Agent SDK to abort/skip the tool use

#### Scenario: Process approval with invalid action

- **WHEN** a POST request is made to `/api/agents/{id}/approvals/{approvalId}` with an invalid action value
- **THEN** the system returns a 400 error with message "Invalid action. Must be 'approve' or 'deny'"

#### Scenario: Process non-existent approval

- **WHEN** a POST request is made to `/api/agents/{id}/approvals/{approvalId}` with an invalid approval ID
- **THEN** the system returns a 404 error with message "Approval request not found"

### Requirement: Approval UI Drawer

The system SHALL display pending approval requests in a drawer overlay with contextual information and action buttons.

#### Scenario: Display approval drawer

- **WHEN** a user clicks the approval alert on an agent card with pending approvals
- **THEN** the system displays a right-side drawer overlay
- **AND** shows a header with warning icon and pending approval count
- **AND** displays the agent name or ID in the drawer header
- **AND** provides a close button to dismiss the drawer

#### Scenario: Render approval request details

- **WHEN** the approval drawer is open with one or more pending approvals
- **THEN** each approval is displayed in a card showing:
  - Tool name with appropriate icon (✏️ for Write, 📝 for Edit, 🔧 for Bash, 🛠️ for others)
  - Description of the requested operation
  - Relevant parameters (file path for Write/Edit, command for Bash)
  - Timestamp of the request
- **AND** each card includes "Approve" and "Deny" action buttons
- **AND** cards use orange color scheme to indicate pending status

#### Scenario: Display empty approval drawer

- **WHEN** the approval drawer is open and all approvals have been processed
- **THEN** the system displays an "All Clear!" message with checkmark icon
- **AND** shows text "No pending approvals at this time"

#### Scenario: Approve individual request from drawer

- **WHEN** a user clicks the "Approve" button on an approval card
- **THEN** the system sends POST request to `/api/agents/{id}/approvals/{approvalId}` with action "approve"
- **AND** removes the approval card from the drawer immediately
- **AND** updates the pending approval count
- **AND** shows loading state on the button during processing

#### Scenario: Deny individual request from drawer

- **WHEN** a user clicks the "Deny" button on an approval card
- **THEN** the system sends POST request to `/api/agents/{id}/approvals/{approvalId}` with action "deny"
- **AND** removes the approval card from the drawer immediately
- **AND** updates the pending approval count
- **AND** shows loading state on the button during processing

#### Scenario: Batch approve all requests

- **WHEN** a user clicks the "Approve All" button in the drawer footer
- **THEN** the system sends approve requests for all pending approvals in parallel
- **AND** removes all approval cards from the drawer as they complete
- **AND** updates the pending approval count to 0
- **AND** shows loading state on the button during processing

#### Scenario: Real-time approval updates in drawer

- **WHEN** the approval drawer is open
- **THEN** the system polls `/api/agents/{id}/approvals` every 2 seconds
- **AND** updates the approval list when new requests are detected
- **AND** removes approvals that were processed elsewhere

### Requirement: Agent Card Approval Indicators

The system SHALL display visual indicators on agent cards when approvals are pending.

#### Scenario: Display approval badge on agent card

- **WHEN** an agent card is rendered and the agent has one or more pending approvals
- **THEN** the system displays an animated orange badge in the status section
- **AND** the badge shows "⚠️ X Approval(s) Needed" where X is the count
- **AND** the badge pulses to draw attention

#### Scenario: Display approval alert on agent card

- **WHEN** an agent card is rendered and the agent has pending approvals
- **THEN** the system displays a clickable orange alert box below the status section
- **AND** the alert shows "X permission(s) pending" with warning icon
- **AND** includes "Click to review →" text to indicate interactivity

#### Scenario: Open approval drawer from agent card

- **WHEN** a user clicks the approval alert on an agent card
- **THEN** the system opens the approval drawer for that specific agent
- **AND** prevents the click from triggering the agent card's modal
- **AND** loads the agent's pending approvals into the drawer

#### Scenario: Real-time approval count updates on agent card

- **WHEN** an agent card is rendered
- **THEN** the system polls `/api/agents/{id}/approvals` every 3 seconds
- **AND** updates the approval count badge and alert when changes are detected
- **AND** hides the badge and alert when count reaches 0

#### Scenario: Agent card without pending approvals

- **WHEN** an agent card is rendered and the agent has no pending approvals
- **THEN** the system does not display the approval badge or alert
- **AND** the agent card shows normal status indicators only

### Requirement: SDK Integration

The system SHALL integrate with the Claude Agent SDK's approval mechanism to pause and resume agent execution.

#### Scenario: Detect approval request from SDK

- **WHEN** the Claude Agent SDK emits an approval request event during agent execution
- **THEN** the system extracts the tool name, description, and parameters from the request
- **AND** calls `sessionManager.addPendingApproval()` to create the approval record
- **AND** stores a mapping between the approval ID and the SDK's approval promise/callback

#### Scenario: Resume execution after approval

- **WHEN** a user approves a pending tool permission request
- **THEN** the system looks up the SDK approval promise/callback using the approval ID
- **AND** resolves the promise or invokes the callback with approval signal
- **AND** removes the approval ID mapping from memory
- **AND** the agent continues execution with the approved tool

#### Scenario: Abort execution after denial

- **WHEN** a user denies a pending tool permission request
- **THEN** the system looks up the SDK approval promise/callback using the approval ID
- **AND** rejects the promise or invokes the callback with denial signal
- **AND** removes the approval ID mapping from memory
- **AND** the agent receives an error or skips the tool use

#### Scenario: Clean up pending approvals on agent stop

- **WHEN** an agent is stopped or terminated while it has pending approvals
- **THEN** the system denies all pending approvals for that agent
- **AND** signals the SDK to abort all pending tool uses
- **AND** clears the agent's pending approvals list
- **AND** removes all approval ID mappings

### Requirement: Mobile Responsiveness

The system SHALL ensure the approval workflow is fully functional on mobile devices.

#### Scenario: Display approval drawer on mobile

- **WHEN** the approval drawer is opened on a mobile device (screen width < 768px)
- **THEN** the drawer takes full screen width
- **AND** the backdrop covers the entire viewport
- **AND** the drawer content is scrollable on small screens
- **AND** touch interactions work correctly for approve/deny buttons

#### Scenario: Display approval badges on mobile

- **WHEN** an agent card is rendered on a mobile device
- **THEN** the approval badge wraps to new line if needed
- **AND** the approval alert is readable and tappable on small screens
- **AND** font sizes are appropriate for mobile viewing

