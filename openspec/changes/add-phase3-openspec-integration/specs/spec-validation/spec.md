# Spec Validation Capability

## ADDED Requirements

### Requirement: Real-Time Validation
The system SHALL validate OpenSpec content in real-time as users edit files.

#### Scenario: Validate on edit with debounce
- **WHEN** user edits content in markdown editor
- **THEN** debounce validation trigger for 500ms
- **AND** execute `openspec validate [id] --strict` after debounce
- **AND** update validation status indicator

#### Scenario: Show validation in progress
- **WHEN** validation is running
- **THEN** display spinner icon on card and in editor
- **AND** show "Validating..." status text

#### Scenario: Display validation success
- **WHEN** validation completes with no errors
- **THEN** show ✅ green checkmark on card
- **AND** display "Valid" status in editor
- **AND** hide error panel if previously shown

#### Scenario: Display validation errors
- **WHEN** validation completes with errors
- **THEN** show ❌ red X icon on card
- **AND** display "Invalid" status in editor
- **AND** show error panel with list of validation errors

### Requirement: Validation Status Indicators
The system SHALL display visual validation status on dashboard cards and in editor.

#### Scenario: Pending validation state
- **WHEN** debounce timer is active (edit within 500ms)
- **THEN** show ⏳ gray pending icon on card
- **AND** display "Pending validation..." text

#### Scenario: Valid state
- **WHEN** validation passed
- **THEN** show ✅ green checkmark on card
- **AND** display "All checks passed" text

#### Scenario: Invalid state
- **WHEN** validation failed
- **THEN** show ❌ red X icon on card
- **AND** display "X errors found" text with error count

#### Scenario: No validation yet
- **WHEN** file hasn't been validated (newly created or not edited)
- **THEN** show ⚪ gray circle on card
- **AND** display "Not validated" text

### Requirement: Inline Error Display
The system SHALL display validation errors inline within the editor interface.

#### Scenario: Show error panel below editor
- **WHEN** validation returns errors
- **THEN** display collapsible error panel below editor
- **AND** list each error with file, line number, and message
- **AND** provide "Jump to error" button for each error

#### Scenario: Jump to error line
- **WHEN** user clicks "Jump to error" button
- **THEN** scroll editor to error line number
- **AND** highlight the problematic line
- **AND** focus cursor on that line

#### Scenario: Highlight error lines in editor
- **WHEN** validation errors reference specific line numbers
- **THEN** add red border to left of error lines in editor
- **AND** display error icon in line gutter

### Requirement: Validation Caching
The system SHALL cache validation results to avoid redundant CLI calls.

#### Scenario: Cache validation result
- **WHEN** validation completes successfully
- **THEN** cache result for 30 seconds
- **AND** associate cache with file content hash

#### Scenario: Return cached result if content unchanged
- **WHEN** validation requested
- **AND** file content matches cached hash
- **AND** cache is less than 30 seconds old
- **THEN** return cached validation result immediately
- **AND** skip CLI execution

#### Scenario: Invalidate cache on edit
- **WHEN** user edits file content
- **THEN** clear validation cache for that file
- **AND** trigger new validation after debounce

### Requirement: Validation Timeout
The system SHALL timeout validation after 5 seconds to prevent hanging.

#### Scenario: Timeout after 5 seconds
- **WHEN** validation CLI call exceeds 5 seconds
- **THEN** abort validation process
- **AND** show warning: "Validation timed out. Run `openspec validate` in CLI for details."

#### Scenario: Retry after timeout
- **WHEN** validation times out
- **AND** user clicks "Retry" button
- **THEN** execute validation again with 10 second timeout
- **AND** show extended timeout warning if exceeded

### Requirement: Manual Validation Trigger
The system SHALL allow users to manually trigger validation on-demand.

#### Scenario: Validate button on card
- **WHEN** user clicks "Validate" button on change card
- **THEN** immediately execute `openspec validate [id] --strict`
- **AND** update validation status on card
- **AND** display validation results in notification

#### Scenario: Validate button in editor
- **WHEN** user clicks "Validate" button in editor toolbar
- **THEN** immediately execute validation (bypass debounce)
- **AND** show results in inline error panel

#### Scenario: Validate all changes
- **WHEN** user clicks "Validate All" button on dashboard
- **THEN** execute validation for all active changes sequentially
- **AND** show progress indicator (X/Y validated)
- **AND** display summary of results

### Requirement: Validation Rate Limiting
The system SHALL rate limit validation requests to prevent excessive CLI calls.

#### Scenario: Limit to 10 validations per second
- **WHEN** validation requests exceed 10/second
- **THEN** queue additional requests
- **AND** process queued requests at rate limit
- **AND** show "Rate limited" warning if queue exceeds 5

#### Scenario: Prioritize manual validation
- **WHEN** user manually triggers validation
- **AND** validation queue is not empty
- **THEN** move manual validation to front of queue
- **AND** process before auto-triggered validations

### Requirement: Validation Error Formatting
The system SHALL format validation errors for readability in UI.

#### Scenario: Format error with file and line
- **WHEN** validation error includes file path and line number
- **THEN** display as: `[file]:[line] - [error message]`
- **AND** make file path clickable to open in editor

#### Scenario: Format error without line number
- **WHEN** validation error doesn't include line number
- **THEN** display as: `[file] - [error message]`

#### Scenario: Group errors by file
- **WHEN** multiple errors exist in same file
- **THEN** group errors under file name heading
- **AND** show error count per file: `[file] (3 errors)`
