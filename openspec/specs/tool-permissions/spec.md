# tool-permissions Specification

## Purpose
TBD - created by archiving change add-phase2-multi-agent. Update Purpose after archive.
## Requirements
### Requirement: Tool Permission Configuration
The system SHALL allow per-agent tool access control via allowlist configuration.

#### Scenario: Spawn agent with default permissions
- **WHEN** an agent is spawned without `toolPermissions` parameter
- **THEN** the agent uses the "standard" preset
- **AND** the agent has access to: Read, Grep, Glob, WebFetch
- **AND** the agent is denied: Write, Edit, Bash, WebSearch, Task

#### Scenario: Spawn agent with read-only preset
- **WHEN** an agent is spawned with `toolPermissions: { preset: "read-only" }`
- **THEN** the agent has access to: Read, Grep, Glob only
- **AND** all other tools are denied

#### Scenario: Spawn agent with full-access preset
- **WHEN** an agent is spawned with `toolPermissions: { preset: "full-access" }`
- **THEN** the agent has access to all available tools
- **AND** tools include: Read, Write, Edit, Bash, Grep, Glob, Task, WebFetch, WebSearch

#### Scenario: Spawn agent with custom tool list
- **WHEN** an agent is spawned with `toolPermissions: { preset: "custom", tools: ["Read", "Write", "Grep"] }`
- **THEN** the agent has access only to the specified tools
- **AND** all other tools are denied

#### Scenario: Spawn agent with invalid tool name
- **WHEN** an agent is spawned with an invalid tool in the custom list
- **THEN** the system returns a 400 error with message "Invalid tool: {toolName}"
- **AND** lists valid tool names in the error response

### Requirement: Tool Permission Presets
The system SHALL provide predefined permission presets for common use cases.

#### Scenario: Read-only preset definition
- **WHEN** the "read-only" preset is selected
- **THEN** the agent can use: Read, Grep, Glob
- **AND** Description: "Safe for exploration and analysis. Cannot modify files or execute commands."

#### Scenario: Standard preset definition
- **WHEN** the "standard" preset is selected (default)
- **THEN** the agent can use: Read, Grep, Glob, WebFetch
- **AND** Description: "Safe tools for development. Can search and fetch but cannot modify files."

#### Scenario: Full-access preset definition
- **WHEN** the "full-access" preset is selected
- **THEN** the agent can use all tools: Read, Write, Edit, Bash, Grep, Glob, Task, WebFetch, WebSearch
- **AND** Description: "Complete access. Use with caution. Can modify files and execute commands."

#### Scenario: Custom preset behavior
- **WHEN** the "custom" preset is selected
- **THEN** the user must explicitly choose which tools to enable
- **AND** Description: "Manual control over each tool. Select specific tools for fine-grained access."

### Requirement: Tool Permission Enforcement
The system SHALL enforce tool permissions during agent execution.

#### Scenario: Agent attempts to use allowed tool
- **WHEN** an agent with Read permission attempts to read a file
- **THEN** the tool execution succeeds
- **AND** the tool result is returned to the agent
- **AND** the tool_use and tool_result messages appear in the stream

#### Scenario: Agent attempts to use denied tool
- **WHEN** an agent without Write permission attempts to write a file
- **THEN** the tool execution fails immediately
- **AND** an error message is returned: "Tool 'Write' not permitted for this agent"
- **AND** the error appears in the stream as an error message
- **AND** the agent can continue with other operations

#### Scenario: Permission check performance
- **WHEN** an agent attempts to use any tool
- **THEN** the permission check completes within 10ms
- **AND** does not block the streaming response

### Requirement: Tool Permission UI
The system SHALL provide a form for configuring tool permissions during agent spawn.

#### Scenario: Display permission presets
- **WHEN** the spawn form loads
- **THEN** a "Tool Permissions" section displays four preset options:
  - Read-Only (radio button)
  - Standard (radio button, selected by default)
  - Full Access (radio button)
  - Custom (radio button)
- **AND** each preset shows its description

#### Scenario: Select preset
- **WHEN** the user selects a preset radio button
- **THEN** the preset is highlighted
- **AND** if "Custom" is selected, a tool checklist appears
- **AND** if other presets are selected, the tool checklist is hidden

#### Scenario: Configure custom permissions
- **WHEN** the user selects "Custom" preset
- **THEN** a checklist of all tools appears with checkboxes
- **AND** each tool shows its name and icon
- **AND** dangerous tools (Bash, Write, Edit) show a warning icon (⚠️)

#### Scenario: Tool checkbox interactions
- **WHEN** the user checks/unchecks a tool in custom mode
- **THEN** the checkbox updates immediately
- **AND** dangerous tools show confirmation tooltip on hover
- **AND** the form tracks selected tools for submission

#### Scenario: Display tool descriptions
- **WHEN** the user hovers over a tool name
- **THEN** a tooltip appears with the tool's description:
  - Read: "Read file contents"
  - Write: "Create or overwrite files"
  - Edit: "Modify existing files"
  - Bash: "Execute shell commands"
  - Grep: "Search file contents"
  - Glob: "Find files by pattern"
  - Task: "Spawn sub-agents"
  - WebFetch: "Fetch web page contents"
  - WebSearch: "Search the web"

### Requirement: Permission Validation
The system SHALL validate tool permission configurations before agent spawn.

#### Scenario: Validate preset parameter
- **WHEN** spawn request includes invalid preset value
- **THEN** the system returns 400 error with message "Invalid preset: {value}"
- **AND** lists valid presets: read-only, standard, full-access, custom

#### Scenario: Validate custom tools list
- **WHEN** spawn request includes custom preset without tools array
- **THEN** the system returns 400 error with message "Custom preset requires 'tools' array"

#### Scenario: Validate empty tools list
- **WHEN** spawn request includes custom preset with empty tools array
- **THEN** the system returns 400 error with message "Custom preset must include at least one tool"

#### Scenario: Validate tool names
- **WHEN** spawn request includes unrecognized tool names
- **THEN** the system returns 400 error listing invalid tools
- **AND** suggests correct tool names

### Requirement: Permission Display
The system SHALL display agent tool permissions in the UI.

#### Scenario: Show permissions on agent card
- **WHEN** viewing an agent card
- **THEN** a permissions indicator shows the preset name or "Custom"
- **AND** tooltip on hover lists allowed tools

#### Scenario: Show permissions in expanded view
- **WHEN** viewing expanded agent output
- **THEN** a "Permissions" section displays:
  - Preset name or "Custom"
  - List of allowed tools with icons
  - Count: "X of 9 tools enabled"

#### Scenario: Show permission errors in stream
- **WHEN** an agent attempts to use a denied tool
- **THEN** an error message appears in the output stream
- **AND** the message format: "⚠️ Tool '{toolName}' blocked by permissions"
- **AND** styled with warning colors

#### Scenario: Permission indicator color coding
- **WHEN** viewing permission indicators
- **THEN** colors represent risk level:
  - Read-only: Blue
  - Standard: Green
  - Full Access: Orange with warning icon
  - Custom: Gray

### Requirement: Tool Permission Modification
The system SHALL support modifying tool permissions for paused agents.

#### Scenario: Modify permissions for paused agent
- **WHEN** a paused agent's permissions are updated via API
- **THEN** the new permissions take effect upon resume
- **AND** the agent's session is updated with new permissions
- **AND** the UI shows updated permissions immediately

#### Scenario: Cannot modify permissions for running agent
- **WHEN** an attempt is made to modify permissions for a running agent
- **THEN** the system returns 400 error with message "Cannot modify permissions while agent is running"
- **AND** suggests pausing the agent first

#### Scenario: Modify permissions for completed agent via restart
- **WHEN** restarting a completed agent
- **THEN** the restart API accepts updated toolPermissions
- **AND** the new agent uses the updated permissions
- **AND** the old agent's permissions remain unchanged in history

### Requirement: Security Warnings
The system SHALL display security warnings for dangerous tool combinations.

#### Scenario: Warn about Bash + Write combination
- **WHEN** the user enables both Bash and Write in custom mode
- **THEN** a warning banner appears: "⚠️ This combination allows file system modification and command execution"

#### Scenario: Warn about full-access preset
- **WHEN** the user selects "Full Access" preset
- **THEN** a prominent warning displays: "⚠️ Full access allows file modification and command execution. Use only for trusted tasks."

#### Scenario: Confirm dangerous permissions
- **WHEN** the user spawns an agent with full-access or Bash enabled
- **THEN** a confirmation modal asks: "Grant full access to agent?"
- **AND** lists the dangerous tools being enabled
- **AND** requires explicit confirmation before spawning

### Requirement: Default Permission Policy
The system SHALL apply sensible default permissions for security.

#### Scenario: Default to standard preset
- **WHEN** no toolPermissions are specified at spawn
- **THEN** the "standard" preset is used
- **AND** the agent can read and search but not modify

#### Scenario: Remember last used preset
- **WHEN** the user spawns an agent with custom permissions
- **THEN** the next spawn form pre-selects the same preset and tools
- **AND** the selection persists until browser refresh
- **AND** resets to "standard" on refresh

#### Scenario: Suggest permissions based on prompt
- **WHEN** the user enters a prompt containing "read" or "search"
- **THEN** the UI suggests "Read-Only" preset with info tooltip
- **WHEN** the prompt contains "modify", "edit", or "change"
- **THEN** the UI suggests "Full Access" with security warning

