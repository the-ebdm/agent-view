# change-workflow Specification

## Purpose
TBD - created by archiving change add-phase3-openspec-integration. Update Purpose after archive.
## Requirements
### Requirement: Change Scaffolding
The system SHALL provide UI buttons to scaffold new OpenSpec changes using slash commands.

#### Scenario: Create new change via button
- **WHEN** user clicks "New Proposal" button on dashboard
- **THEN** show dialog prompting for change ID
- **AND** validate change ID is kebab-case and unique
- **AND** execute `/openspec:proposal [change-id]` slash command
- **AND** create directory structure: `openspec/changes/[change-id]/`

#### Scenario: Scaffold with templates
- **WHEN** slash command completes
- **THEN** create `proposal.md` with template sections (Why, What Changes, Impact)
- **AND** create `tasks.md` with empty task list
- **AND** create `specs/` directory for deltas
- **AND** open proposal.md in editor

#### Scenario: Validate change ID format
- **WHEN** user enters change ID in dialog
- **THEN** validate format is kebab-case (lowercase, hyphens only)
- **AND** show error if format invalid: "Use kebab-case (e.g., add-new-feature)"

#### Scenario: Prevent duplicate change IDs
- **WHEN** user enters change ID that already exists
- **THEN** show error: "Change ID already exists. Choose a different name."
- **AND** suggest appending `-2`, `-3`, etc.

### Requirement: Slash Command Integration
The system SHALL provide UI buttons that wrap existing `.claude/commands` slash commands.

#### Scenario: Execute /openspec:proposal
- **WHEN** user clicks "New Proposal" button
- **AND** enters valid change ID
- **THEN** execute slash command: `/openspec:proposal [change-id]`
- **AND** show command output in notification
- **AND** refresh dashboard to show new change card

#### Scenario: Execute /openspec:apply
- **WHEN** user clicks "Apply" button on change card
- **THEN** execute slash command: `/openspec:apply [change-id]`
- **AND** show command output in modal dialog
- **AND** update change status to "In Progress"

#### Scenario: Execute /openspec:archive
- **WHEN** user clicks "Archive" button on completed change card
- **THEN** show confirmation dialog with archiving options
- **AND** execute slash command: `/openspec:archive [change-id] --yes`
- **AND** move change to archive/
- **AND** refresh dashboard

#### Scenario: Display command output
- **WHEN** slash command completes
- **THEN** display stdout in notification or modal
- **AND** show stderr in error notification if command failed
- **AND** provide "View Full Output" button to see complete logs

### Requirement: Task Tracking
The system SHALL display and update task checklists from tasks.md files.

#### Scenario: Display task checklist
- **WHEN** viewing change in modal
- **THEN** parse tasks.md for checklist items (`- [ ]` / `- [x]`)
- **AND** display interactive checkboxes for each task
- **AND** show progress bar: X/Y tasks complete

#### Scenario: Check off task
- **WHEN** user clicks checkbox for task
- **THEN** update task in tasks.md from `- [ ]` to `- [x]`
- **AND** save file
- **AND** update progress bar on card
- **AND** show notification: "Task marked complete"

#### Scenario: Uncheck task
- **WHEN** user unchecks completed task
- **THEN** update task in tasks.md from `- [x]` to `- [ ]`
- **AND** save file
- **AND** update progress bar

#### Scenario: Add new task
- **WHEN** user clicks "Add Task" button in checklist
- **THEN** show input field for task description
- **AND** append new task to tasks.md: `- [ ] [description]`
- **AND** save file and refresh display

### Requirement: Change Status Management
The system SHALL track and display change status based on task completion.

#### Scenario: Derive status from task progress
- **WHEN** tasks.md has 0% tasks complete
- **THEN** show status: "Pending" with ⏳ icon

#### Scenario: In progress status
- **WHEN** tasks.md has 1-99% tasks complete
- **THEN** show status: "In Progress" with 🔄 icon

#### Scenario: Complete status
- **WHEN** tasks.md has 100% tasks complete
- **THEN** show status: "Complete" with ✅ icon
- **AND** enable "Archive" button

#### Scenario: Update status on task change
- **WHEN** user checks/unchecks task
- **THEN** recalculate completion percentage
- **AND** update status indicator on card

### Requirement: Archive Workflow
The system SHALL guide users through archiving completed changes.

#### Scenario: Enable archive when complete
- **WHEN** change status is "Complete" (100% tasks)
- **AND** validation passes (✅ status)
- **THEN** enable "Archive" button on change card

#### Scenario: Archive confirmation dialog
- **WHEN** user clicks "Archive" button
- **THEN** show confirmation dialog with options:
  - [ ] Skip spec updates (--skip-specs flag)
  - [ ] Auto-confirm (--yes flag)
- **AND** display warning: "This will move the change to archive/"

#### Scenario: Execute archiving
- **WHEN** user confirms archive
- **THEN** execute `/openspec:archive [change-id]` with selected flags
- **AND** show progress: "Archiving..."
- **AND** move change from `changes/` to `changes/archive/YYYY-MM-DD-[change-id]/`
- **AND** refresh dashboard

#### Scenario: Archive without validation
- **WHEN** user attempts to archive
- **AND** validation status is ❌ invalid
- **THEN** show warning: "Change has validation errors. Archive anyway?"
- **AND** require explicit confirmation

### Requirement: Change File Management
The system SHALL allow creating and managing files within a change directory.

#### Scenario: Create spec delta
- **WHEN** user clicks "Add Spec Delta" button in change view
- **THEN** show dialog prompting for capability name
- **AND** create `specs/[capability]/spec.md` with delta template
- **AND** open in editor with template content:
  ```markdown
  ## ADDED Requirements
  ### Requirement: [Name]
  [Description]

  #### Scenario: [Name]
  - **WHEN** [condition]
  - **THEN** [expected result]
  ```

#### Scenario: Delete spec delta
- **WHEN** user clicks "Delete" on spec delta file
- **THEN** show confirmation: "Delete [capability]/spec.md?"
- **AND** remove file from `specs/[capability]/` if confirmed
- **AND** refresh change view

#### Scenario: Create design.md
- **WHEN** user clicks "Add Design Doc" button
- **THEN** create `design.md` with template structure
- **AND** open in editor

### Requirement: Validation Before Archive
The system SHALL require validation to pass before allowing archive.

#### Scenario: Validate before enabling archive
- **WHEN** change status is "Complete"
- **AND** validation has not been run
- **THEN** show "Validate" button instead of "Archive"
- **AND** display message: "Run validation before archiving"

#### Scenario: Archive only when valid
- **WHEN** validation status is ✅ valid
- **AND** change status is "Complete"
- **THEN** enable "Archive" button

#### Scenario: Block archive if invalid
- **WHEN** validation status is ❌ invalid
- **THEN** disable "Archive" button
- **AND** show tooltip: "Fix validation errors before archiving"

