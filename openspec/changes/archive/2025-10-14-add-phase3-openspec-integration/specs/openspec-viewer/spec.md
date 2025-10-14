# OpenSpec Viewer Capability

## ADDED Requirements

### Requirement: OpenSpec Entity Listing
The system SHALL provide a dashboard-based view of all OpenSpec entities including specifications, changes, and archives.

#### Scenario: List all specifications
- **WHEN** user views the dashboard
- **THEN** all capabilities from `openspec/specs/` are displayed as cards
- **AND** each card shows capability name, requirement count, and scenario count

#### Scenario: List active changes
- **WHEN** user views the dashboard
- **THEN** all changes from `openspec/changes/` are displayed as cards
- **AND** each card shows change ID, progress (X/Y tasks), and validation status

#### Scenario: List archived changes
- **WHEN** user views the dashboard
- **THEN** archived changes from `openspec/changes/archive/` are displayed as cards
- **AND** each card shows archive date and change ID

#### Scenario: Empty state
- **WHEN** no OpenSpec entities exist
- **THEN** display helpful message with instructions to create first spec

### Requirement: OpenSpec Card Display
The system SHALL display OpenSpec entities as cards with visual hierarchy and status indicators.

#### Scenario: Capability card layout
- **WHEN** displaying a capability card
- **THEN** show 📋 icon, capability name, and statistics
- **AND** provide "View" and "Edit" action buttons

#### Scenario: Change card layout
- **WHEN** displaying a change card
- **THEN** show 🔄 icon, change ID, progress bar, and validation status
- **AND** provide "Edit", "Validate", and "Archive" action buttons
- **AND** display visual status indicator (⏳ pending, ✅ valid, ❌ invalid)

#### Scenario: Archive card layout
- **WHEN** displaying an archive card
- **THEN** show 📦 icon, archived change name, and archive date
- **AND** provide "View" action button only (read-only)

### Requirement: OpenSpec Content Viewing
The system SHALL display OpenSpec content in modal dialogs with formatted markdown rendering.

#### Scenario: View capability spec
- **WHEN** user clicks "View" on a capability card
- **THEN** open modal displaying spec.md content
- **AND** render markdown with syntax highlighting for code blocks
- **AND** provide collapsible sections for requirements
- **AND** show breadcrumb navigation (Dashboard > Specs > [capability])

#### Scenario: View change proposal
- **WHEN** user clicks "View" on a change card
- **THEN** open modal displaying proposal.md, tasks.md, and spec deltas
- **AND** provide tabs to switch between files
- **AND** render all markdown with proper formatting

#### Scenario: View archived change
- **WHEN** user clicks "View" on an archive card
- **THEN** open modal with read-only view of archived content
- **AND** display archive date and completion status

### Requirement: Markdown Editor Interface
The system SHALL provide an in-app markdown editor with real-time preview for editing OpenSpec files.

#### Scenario: Edit spec in split-pane editor
- **WHEN** user clicks "Edit" on a capability or change card
- **THEN** open modal with split-pane interface
- **AND** display markdown source in left pane (editable textarea)
- **AND** display rendered preview in right pane
- **AND** update preview in real-time as user types

#### Scenario: Mobile editor layout
- **WHEN** viewing editor on mobile device (width < 768px)
- **THEN** stack editor and preview vertically
- **AND** provide tabs to toggle between "Edit" and "Preview" modes
- **AND** support swipe gestures to switch tabs

#### Scenario: Save edited content
- **WHEN** user clicks "Save" button
- **THEN** write changes to corresponding file in `openspec/`
- **AND** show success notification
- **AND** update dashboard to reflect changes

#### Scenario: Discard changes
- **WHEN** user clicks "Cancel" or modal close
- **THEN** prompt for confirmation if unsaved changes exist
- **AND** discard edits and close modal if confirmed

### Requirement: Markdown Formatting Toolbar
The system SHALL provide toolbar buttons for common markdown formatting operations.

#### Scenario: Apply bold formatting
- **WHEN** user selects text and clicks "Bold" button
- **THEN** wrap selected text with `**asterisks**`
- **AND** update preview to show bolded text

#### Scenario: Insert code block
- **WHEN** user clicks "Code Block" button
- **THEN** insert triple backticks with cursor positioned for language identifier
- **AND** update preview to show syntax-highlighted code block

#### Scenario: Format as list
- **WHEN** user selects multiple lines and clicks "List" button
- **THEN** prefix each line with `- ` (unordered) or `1. ` (ordered)
- **AND** preserve existing indentation

### Requirement: Syntax Highlighting
The system SHALL apply syntax highlighting to code blocks in markdown preview.

#### Scenario: Highlight TypeScript code
- **WHEN** rendering markdown with ```typescript code block
- **THEN** apply TypeScript syntax highlighting with color-coded tokens

#### Scenario: Highlight bash commands
- **WHEN** rendering markdown with ```bash code block
- **THEN** apply shell script syntax highlighting

#### Scenario: Support multiple languages
- **WHEN** rendering code blocks
- **THEN** support syntax highlighting for: TypeScript, JavaScript, Bash, JSON, YAML, Markdown

### Requirement: Collapsible Sections
The system SHALL allow users to collapse and expand requirement sections in spec view.

#### Scenario: Collapse requirement section
- **WHEN** user clicks on requirement header
- **THEN** hide all scenarios under that requirement
- **AND** show expand icon (▶) next to header

#### Scenario: Expand requirement section
- **WHEN** user clicks on collapsed requirement header
- **THEN** show all scenarios under that requirement
- **AND** show collapse icon (▼) next to header

#### Scenario: Expand all sections
- **WHEN** user clicks "Expand All" button
- **THEN** expand all requirement sections in spec view

### Requirement: Auto-Save Functionality
The system SHALL automatically save editor content at regular intervals.

#### Scenario: Auto-save every 5 seconds
- **WHEN** user is editing content in markdown editor
- **AND** content has changed since last save
- **THEN** automatically save content every 5 seconds
- **AND** show "Saving..." indicator during save
- **AND** show "Saved" indicator after successful save

#### Scenario: Skip auto-save if no changes
- **WHEN** user is editing but content hasn't changed
- **THEN** do not trigger auto-save
- **AND** maintain last save timestamp

#### Scenario: Auto-save on modal close
- **WHEN** user closes modal with unsaved changes
- **AND** auto-save is pending
- **THEN** save changes before closing
- **AND** show confirmation after save completes
