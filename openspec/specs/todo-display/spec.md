# todo-display Specification

## Purpose
TBD - created by archiving change add-agent-todo-list-view. Update Purpose after archive.
## Requirements
### Requirement: Todo List Display
The system SHALL display agent todos in a structured list view within the agent interaction modal.

#### Scenario: Display todos from TodoWrite messages
- **WHEN** an agent emits a TodoWrite tool_use message
- **THEN** the todo list section appears in the agent modal
- **AND** todos are displayed with status icons and text
- **AND** the most recent TodoWrite message determines current todo state

#### Scenario: Show todo status icons
- **WHEN** viewing the todo list
- **THEN** completed todos show ✅ icon with green styling
- **AND** in-progress todos show 🔧 icon with blue/yellow styling
- **AND** pending todos show ⭕ icon with gray styling
- **AND** icons are consistently sized and aligned

#### Scenario: Display in-progress task with activeForm
- **WHEN** a todo has status "in_progress"
- **THEN** the system displays the todo's `activeForm` text (e.g., "Running tests")
- **AND** completed/pending todos display `content` text (e.g., "Run tests")
- **AND** the in-progress todo is visually emphasized (bold or highlighted)

#### Scenario: Todo list with no todos
- **WHEN** an agent has not emitted any TodoWrite messages
- **THEN** the todo list section does not render (null)
- **AND** no empty state is shown
- **AND** the modal layout remains unchanged

#### Scenario: Todo list updates in real-time
- **WHEN** a new TodoWrite message arrives in the agent stream
- **THEN** the todo list updates within 1 second
- **AND** status icons change to reflect new states
- **AND** the progress bar updates to reflect new completion count
- **AND** transitions are smooth without jarring layout shifts

### Requirement: Progress Visualization
The system SHALL display aggregate progress metrics for the current todo list.

#### Scenario: Show completion progress
- **WHEN** viewing a todo list
- **THEN** the system displays "X/Y completed" text
- **AND** X is the count of todos with status "completed"
- **AND** Y is the total count of todos
- **AND** progress text is prominent and easy to scan

#### Scenario: Show progress bar
- **WHEN** viewing an expanded todo list
- **THEN** a progress bar is displayed
- **AND** the bar width reflects completion percentage (X/Y * 100%)
- **AND** the bar uses a green color for completed portion
- **AND** the bar uses a gray color for incomplete portion

#### Scenario: All todos completed
- **WHEN** all todos have status "completed"
- **THEN** progress text shows "Y/Y completed ✨"
- **AND** progress bar is fully green
- **AND** a celebration indicator (sparkle emoji) is shown

#### Scenario: No todos completed
- **WHEN** no todos have status "completed"
- **THEN** progress text shows "0/Y completed"
- **AND** progress bar is fully gray
- **AND** no special indicators are shown

### Requirement: Collapse and Expand
The system SHALL allow users to collapse and expand the todo list section.

#### Scenario: Collapse todo list
- **WHEN** the user clicks the collapse button on an expanded todo list
- **THEN** the todo list collapses to show only progress summary
- **AND** the button shows "▼" (expand indicator)
- **AND** the full todo list is hidden
- **AND** collapse state is saved to localStorage with key "agent-todo-collapsed"

#### Scenario: Expand todo list
- **WHEN** the user clicks the expand button on a collapsed todo list
- **THEN** the todo list expands to show full list
- **AND** the button shows "▲" (collapse indicator)
- **AND** all todo items are visible
- **AND** collapse state is saved to localStorage with key "agent-todo-collapsed"

#### Scenario: Default collapse state on desktop
- **WHEN** viewing the agent modal on desktop (>= 640px width)
- **THEN** the todo list is expanded by default
- **AND** localStorage preference overrides default if present

#### Scenario: Default collapse state on mobile
- **WHEN** viewing the agent modal on mobile (< 640px width)
- **THEN** the todo list is collapsed by default
- **AND** localStorage preference overrides default if present

#### Scenario: Collapsed view shows progress summary
- **WHEN** the todo list is collapsed
- **THEN** the section displays "📋 Tasks: X/Y completed ▼"
- **AND** clicking anywhere in the section expands it
- **AND** the progress summary is visible at a glance

### Requirement: Mobile Responsive Design
The system SHALL optimize the todo list display for mobile devices.

#### Scenario: Mobile todo list layout
- **WHEN** viewing the todo list on mobile (< 640px width)
- **THEN** todos display in a single column
- **AND** font size is 14px minimum for readability
- **AND** touch targets are 44px minimum height
- **AND** horizontal padding is reduced to maximize space

#### Scenario: Mobile collapse toggle
- **WHEN** tapping the collapse/expand button on mobile
- **THEN** the toggle responds immediately (< 100ms)
- **AND** the tap target is at least 44px tall
- **AND** the interaction feels natural and responsive

#### Scenario: Mobile todo list scrolling
- **WHEN** the todo list has 10+ items on mobile
- **THEN** the list is scrollable within the modal
- **AND** scrolling is smooth (60fps)
- **AND** the progress summary remains visible at the top

### Requirement: Integration with Agent Modal
The system SHALL integrate the todo list section into the existing agent interaction modal.

#### Scenario: Todo list positioning in modal
- **WHEN** viewing an agent with todos
- **THEN** the todo list section appears after the approval banner (if present)
- **AND** appears before the messages area
- **AND** is styled consistently with other modal sections

#### Scenario: Modal layout with todos
- **WHEN** viewing the agent modal with todos
- **THEN** the modal layout is:
  1. Header (agent name, status, controls)
  2. Approval banner (if pending approvals)
  3. Todo list section
  4. Messages area
  5. Input area
- **AND** all sections are properly spaced

#### Scenario: Modal layout without todos
- **WHEN** viewing the agent modal without todos
- **THEN** the modal layout is:
  1. Header (agent name, status, controls)
  2. Approval banner (if pending approvals)
  3. Messages area
  4. Input area
- **AND** no gap or placeholder is shown where todos would be

### Requirement: Dark Mode Support
The system SHALL support dark mode styling for the todo list.

#### Scenario: Dark mode todo list styling
- **WHEN** viewing the todo list in dark mode
- **THEN** background colors are dark (gray-800)
- **AND** text colors are light (gray-100/200)
- **AND** border colors are dark (gray-700)
- **AND** status icons remain legible with adjusted colors

#### Scenario: Dark mode progress bar
- **WHEN** viewing the progress bar in dark mode
- **THEN** completed portion uses green-600 (not green-500)
- **AND** incomplete portion uses gray-700 (not gray-300)
- **AND** bar has sufficient contrast with background

### Requirement: Error Handling and Graceful Degradation
The system SHALL handle malformed or missing todo data gracefully.

#### Scenario: Malformed TodoWrite message
- **WHEN** a TodoWrite message has invalid todo data structure
- **THEN** the system logs a warning to console
- **AND** the todo list section does not render
- **AND** no error is shown to the user
- **AND** the modal remains functional

#### Scenario: Missing required todo fields
- **WHEN** a todo item is missing `content`, `activeForm`, or `status`
- **THEN** that todo item is filtered out
- **AND** remaining valid todos are displayed
- **AND** progress metrics reflect only valid todos

#### Scenario: Invalid todo status value
- **WHEN** a todo has a status other than "pending", "in_progress", or "completed"
- **THEN** that todo item is filtered out
- **AND** remaining valid todos are displayed

#### Scenario: Multiple TodoWrite messages
- **WHEN** an agent emits multiple TodoWrite messages over time
- **THEN** only the most recent TodoWrite message determines current state
- **AND** older todo lists are discarded
- **AND** the display reflects the latest task breakdown

### Requirement: Accessibility
The system SHALL ensure the todo list is accessible to keyboard and screen reader users.

#### Scenario: Keyboard navigation for collapse toggle
- **WHEN** the user tabs to the collapse/expand button
- **THEN** the button receives visible focus indicator
- **AND** pressing Enter or Space toggles collapse state
- **AND** focus remains on the button after toggle

#### Scenario: Screen reader announcements
- **WHEN** a screen reader encounters the todo list section
- **THEN** the section is announced as "Agent task list"
- **AND** collapse button is announced with state: "Expand task list, 3 of 5 completed"
- **AND** each todo is announced with status: "Task 1, Analyze component structure, completed"

#### Scenario: ARIA attributes for todo list
- **WHEN** the todo list is rendered
- **THEN** the section has `aria-label="Agent task list"`
- **AND** collapse button has `aria-expanded` reflecting current state
- **AND** todo list has `role="list"`
- **AND** each todo has `role="listitem"` with descriptive `aria-label`

### Requirement: Performance
The system SHALL render todo lists efficiently without impacting agent stream performance.

#### Scenario: Parse todos from message stream
- **WHEN** extracting todos from the agent message stream
- **THEN** parsing uses memoized computation (useMemo)
- **AND** parsing only re-runs when messages array changes
- **AND** no perceptible lag is introduced to message rendering

#### Scenario: Render todo list with 20+ items
- **WHEN** displaying a todo list with 20+ items
- **THEN** all items render without perceptible delay (< 16ms)
- **AND** scrolling remains smooth (60fps)
- **AND** no performance warnings appear in React DevTools

#### Scenario: Update single todo status
- **WHEN** a new TodoWrite message changes one todo's status
- **THEN** only the changed todo item re-renders
- **AND** other todo items remain stable (React keys based on content)
- **AND** no full list re-mount occurs

