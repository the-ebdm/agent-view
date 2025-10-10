# UI Dashboard Specification

## ADDED Requirements

### Requirement: Agent Spawn Form
The system SHALL provide a form interface for users to spawn agents with a prompt and working directory.

#### Scenario: Display spawn form
- **WHEN** a user loads the dashboard page
- **THEN** the system displays a form with a prompt text area and directory input field
- **AND** displays a "Spawn Agent" button

#### Scenario: Submit valid spawn request
- **WHEN** a user enters a prompt and directory, then clicks "Spawn Agent"
- **THEN** the system sends a POST request to `/api/agents/spawn`
- **AND** displays a loading spinner on the button
- **AND** disables the form inputs during submission

#### Scenario: Display spawn success
- **WHEN** the agent spawn request succeeds
- **THEN** the system clears the form
- **AND** displays the agent's streaming output
- **AND** updates the status badge to "running"

#### Scenario: Display spawn error
- **WHEN** the agent spawn request fails
- **THEN** the system displays an error message above the form
- **AND** re-enables the form for retry

#### Scenario: Validate form inputs
- **WHEN** a user attempts to submit the form with an empty prompt
- **THEN** the system displays a validation error "Prompt is required"
- **AND** does not submit the request

### Requirement: Mobile-Responsive Layout
The system SHALL provide a responsive layout that adapts to mobile and desktop screen sizes.

#### Scenario: Desktop layout (≥768px)
- **WHEN** the dashboard is viewed on a desktop screen (768px or wider)
- **THEN** the system displays a two-column layout
- **AND** the left column contains the spawn form and history list
- **AND** the right column contains the streaming output display

#### Scenario: Mobile layout (<768px)
- **WHEN** the dashboard is viewed on a mobile screen (less than 768px)
- **THEN** the system displays a stacked vertical layout
- **AND** the spawn form appears at the top
- **AND** the streaming output appears below the form
- **AND** the history list is accessible via a drawer or collapsible section

#### Scenario: Touch-friendly interactions on mobile
- **WHEN** the dashboard is used on a mobile device
- **THEN** all interactive elements have a minimum touch target of 44x44px
- **AND** buttons and links respond to touch events correctly

### Requirement: Agent Status Indicator
The system SHALL display a visual status badge indicating the current agent's state.

#### Scenario: Display idle status
- **WHEN** no agent is currently running
- **THEN** the system displays a gray status badge with text "Idle"

#### Scenario: Display running status
- **WHEN** an agent is actively running
- **THEN** the system displays a blue pulsing status badge with text "Running"

#### Scenario: Display completed status
- **WHEN** an agent has finished successfully
- **THEN** the system displays a green status badge with text "Completed"

#### Scenario: Display error status
- **WHEN** an agent encounters an error
- **THEN** the system displays a red status badge with text "Error"

### Requirement: Agent History List
The system SHALL display a list of previous agent runs with the ability to view their outputs.

#### Scenario: Display history list
- **WHEN** the dashboard loads and agent history exists
- **THEN** the system displays a list of up to 10 previous agent runs
- **AND** each item shows the agent's prompt (truncated), timestamp, and status

#### Scenario: Select historical agent run
- **WHEN** a user clicks on a historical agent run in the list
- **THEN** the system displays that agent's complete message history
- **AND** updates the status badge to reflect the historical agent's status
- **AND** highlights the selected history item

#### Scenario: Empty history state
- **WHEN** no agent runs exist in history
- **THEN** the system displays a message "No agent history yet"
- **AND** prompts the user to spawn their first agent

#### Scenario: History updates after new agent spawn
- **WHEN** a new agent is spawned successfully
- **THEN** the system adds the new agent to the top of the history list
- **AND** removes the oldest item if more than 10 runs exist

### Requirement: Page Metadata and Branding
The system SHALL display appropriate branding and metadata for Agent View.

#### Scenario: Display page title
- **WHEN** a user loads the dashboard
- **THEN** the browser tab title shows "Agent View"

#### Scenario: Display page description
- **WHEN** the page metadata is rendered
- **THEN** the meta description is "Manage and monitor Claude Code agents from your browser"

### Requirement: Environment Setup Instructions
The system SHALL display setup instructions when the ANTHROPIC_API_KEY is not configured.

#### Scenario: Missing API key on page load
- **WHEN** the dashboard loads and ANTHROPIC_API_KEY is not configured
- **THEN** the system displays a warning banner at the top of the page
- **AND** shows instructions to set the ANTHROPIC_API_KEY environment variable
- **AND** disables the agent spawn form

#### Scenario: Hide warning when API key is configured
- **WHEN** the dashboard loads and ANTHROPIC_API_KEY is properly configured
- **THEN** the system does not display the API key warning banner
- **AND** enables the agent spawn form

### Requirement: Base UI Components
The system SHALL provide reusable base UI components following the project's design system.

#### Scenario: Button component variants
- **WHEN** UI components use the Button component
- **THEN** the button supports variants: "primary", "secondary", and "ghost"
- **AND** supports size options: "sm", "md", "lg"
- **AND** supports a "loading" state with a spinner

#### Scenario: Input component styling
- **WHEN** forms use the Input or Textarea component
- **THEN** the inputs have consistent border, padding, and focus states
- **AND** support error states with red borders and error messages

#### Scenario: Card component layout
- **WHEN** content is displayed in a Card component
- **THEN** the card has consistent padding, border radius, and shadow
- **AND** supports optional header and footer sections

#### Scenario: Badge component styling
- **WHEN** status indicators use the Badge component
- **THEN** the badge supports color variants: "gray", "blue", "green", "red"
- **AND** renders with appropriate text size and padding for readability
