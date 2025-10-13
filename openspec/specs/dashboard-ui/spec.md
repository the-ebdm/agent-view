# dashboard-ui Specification

## Purpose
TBD - created by archiving change add-phase2-multi-agent. Update Purpose after archive.
## Requirements
### Requirement: Agent Card Grid Layout
The system SHALL display active agents in a responsive card grid layout.

#### Scenario: Display agent cards in grid
- **WHEN** the dashboard loads with active agents
- **THEN** agents are displayed as cards in a grid layout
- **AND** desktop shows 2-3 columns depending on screen width
- **AND** tablet shows 2 columns
- **AND** mobile shows 1 column (vertical stack)

#### Scenario: Empty dashboard state
- **WHEN** no agents are active
- **THEN** the dashboard displays an empty state:
  - Large icon (🤖)
  - Heading: "No Active Agents"
  - Description: "Spawn an agent to get started"
  - "Spawn Agent" button (prominent)

#### Scenario: Dashboard with many agents
- **WHEN** 10+ agents are active
- **THEN** the grid becomes scrollable
- **AND** cards maintain consistent size
- **AND** scroll position is preserved when navigating

#### Scenario: Grid responsiveness
- **WHEN** the browser window is resized
- **THEN** the grid adapts smoothly to new width
- **AND** cards reflow without jarring layout shifts
- **AND** mobile breakpoint triggers at 640px

### Requirement: Agent Card Design
The system SHALL display each agent in a compact, informative card.

#### Scenario: Agent card content
- **WHEN** viewing an agent card
- **THEN** the card displays:
  - Agent name (editable with inline edit icon)
  - Status badge with icon
  - Directory path (truncated with tooltip)
  - Message count (e.g., "23 messages")
  - Elapsed time (e.g., "5m 32s" or "1h 12m")
  - Tool permissions indicator
  - Quick actions: Pause/Resume, Stop buttons

#### Scenario: Running agent card appearance
- **WHEN** viewing a running agent card
- **THEN** the card has:
  - Pulsing status indicator
  - "Pause" and "Stop" buttons visible
  - Last message preview (first 100 chars)
  - Animated border or glow effect

#### Scenario: Paused agent card appearance
- **WHEN** viewing a paused agent card
- **THEN** the card has:
  - "Paused" badge (yellow/orange)
  - "Resume" and "Stop" buttons visible
  - Dimmed appearance
  - Pause duration displayed

#### Scenario: Card hover interaction
- **WHEN** the user hovers over an agent card
- **THEN** the card elevates with shadow
- **AND** shows full prompt text in tooltip
- **AND** highlights the card border
- **AND** action buttons become more prominent

#### Scenario: Card click interaction
- **WHEN** the user clicks an agent card
- **THEN** the card expands to full-screen view
- **AND** shows complete agent output
- **AND** displays full control panel
- **AND** adds "Collapse" or "Back" button

### Requirement: Agent Card Actions
The system SHALL provide quick action buttons on each agent card.

#### Scenario: Pause button on running agent
- **WHEN** clicking "Pause" on a running agent card
- **THEN** the agent pauses immediately
- **AND** button changes to "Resume"
- **AND** card appearance updates to paused state
- **AND** no confirmation is required

#### Scenario: Resume button on paused agent
- **WHEN** clicking "Resume" on a paused agent card
- **THEN** the agent resumes immediately
- **AND** button changes to "Pause"
- **AND** card appearance updates to running state

#### Scenario: Stop button with confirmation
- **WHEN** clicking "Stop" on any agent card
- **THEN** a confirmation modal appears: "Stop Agent X?"
- **AND** shows warning: "This cannot be undone"
- **AND** provides "Cancel" and "Stop" buttons
- **AND** stops agent only after confirmation

#### Scenario: Action button loading states
- **WHEN** a lifecycle operation is in progress
- **THEN** the clicked button shows a spinner
- **AND** all buttons on that card are disabled
- **AND** buttons re-enable after operation completes

### Requirement: Expanded Agent View
The system SHALL provide a full-screen view when clicking an agent card.

#### Scenario: Expand agent view
- **WHEN** clicking an agent card (not on action buttons)
- **THEN** the view transitions to full-screen agent view
- **AND** shows complete agent output with scrolling
- **AND** displays full control panel at top
- **AND** back/collapse button in header

#### Scenario: Expanded view header
- **WHEN** in expanded agent view
- **THEN** the header displays:
  - Back button (arrow)
  - Agent name (editable)
  - Status badge
  - Full control buttons (Pause/Resume/Stop/Restart)
  - Message count and elapsed time

#### Scenario: Expanded view output
- **WHEN** in expanded agent view
- **THEN** the output section displays:
  - All messages in full detail
  - Real-time streaming updates
  - Auto-scroll to latest message
  - Scroll to manually explore history

#### Scenario: Collapse to dashboard
- **WHEN** clicking "Back" or pressing Escape key
- **THEN** the view returns to card grid
- **AND** scroll position is preserved
- **AND** the agent card is highlighted briefly

#### Scenario: Switch between agents in expanded view
- **WHEN** in expanded agent view
- **THEN** left/right arrow keys switch to previous/next agent
- **AND** agent selector dropdown shows all agents
- **AND** selecting from dropdown switches immediately

### Requirement: Spawn Agent Control
The system SHALL provide accessible controls for spawning new agents.

#### Scenario: Spawn button placement
- **WHEN** the dashboard is displayed
- **THEN** a "Spawn Agent" button appears in the top-right header
- **AND** alternatively, a floating action button (FAB) in bottom-right
- **AND** button is always visible and accessible

#### Scenario: Spawn form modal
- **WHEN** clicking "Spawn Agent"
- **THEN** a modal/drawer slides in from right
- **AND** displays the spawn form:
  - Agent name input (optional, placeholder: "Auto-generate")
  - Directory input (required)
  - Prompt textarea (required)
  - Tool permissions section
  - "Spawn" button

#### Scenario: Close spawn form
- **WHEN** the spawn form is open
- **THEN** clicking outside modal or pressing Escape closes it
- **AND** form data is preserved (not cleared)
- **AND** confirmation is shown if form has unsaved changes

### Requirement: Dashboard Header
The system SHALL display a header with key metrics and global controls.

#### Scenario: Header content
- **WHEN** viewing the dashboard
- **THEN** the header displays:
  - App logo and name
  - Active agent count (e.g., "5 active agents")
  - Total message count across all agents
  - "Spawn Agent" button
  - "Stop All" button (if agents active)

#### Scenario: Active agent counter
- **WHEN** agents are spawned or stopped
- **THEN** the counter updates in real-time
- **AND** color codes based on count:
  - 0: Gray
  - 1-5: Green
  - 6-10: Yellow with warning
  - 10+: Red with warning

#### Scenario: Stop All button
- **WHEN** clicking "Stop All" with active agents
- **THEN** a confirmation modal appears: "Stop all X agents?"
- **AND** shows warning: "All active work will be terminated"
- **AND** lists agent names
- **AND** stops all agents after confirmation

#### Scenario: Dashboard metrics
- **WHEN** multiple agents are active
- **THEN** aggregate metrics are displayed:
  - Total messages: Sum of all agent messages
  - Total elapsed time: Sum of all active times
  - Shown in header or metrics panel

### Requirement: Mobile Responsive Design
The system SHALL optimize the dashboard for mobile devices.

#### Scenario: Mobile card layout
- **WHEN** viewing on mobile (< 640px width)
- **THEN** cards display in single column
- **AND** cards are full-width with margins
- **AND** touch targets are at least 44px tall

#### Scenario: Mobile card swipe
- **WHEN** on mobile
- **THEN** user can swipe left on card to reveal action buttons
- **OR** long-press card to show action menu
- **AND** swipe gestures feel natural and responsive

#### Scenario: Mobile expanded view
- **WHEN** expanding agent on mobile
- **THEN** the view takes full screen
- **AND** back button is prominent in top-left
- **AND** controls are accessible without scrolling
- **AND** output area is optimized for small screen

#### Scenario: Mobile spawn form
- **WHEN** opening spawn form on mobile
- **THEN** form takes full screen (not modal)
- **AND** keyboard doesn't obscure inputs
- **AND** submit button stays visible at bottom

#### Scenario: Mobile performance
- **WHEN** using dashboard on mobile with 5+ agents
- **THEN** scrolling remains smooth (60fps)
- **AND** interactions feel responsive (< 100ms)
- **AND** battery usage is reasonable

### Requirement: Agent Search and Filter
The system SHALL provide search and filter controls for finding agents.

#### Scenario: Search agents by name
- **WHEN** typing in the search box
- **THEN** cards are filtered to show only matching names
- **AND** search is case-insensitive
- **AND** search matches partial names
- **AND** clear button appears to reset search

#### Scenario: Filter by status
- **WHEN** selecting status filter dropdown
- **THEN** options include: All, Running, Paused, Completed
- **AND** cards are filtered to show only matching status
- **AND** filter persists until changed

#### Scenario: Filter by directory
- **WHEN** selecting directory filter
- **THEN** dropdown shows all unique directories
- **AND** cards are filtered to show only matching directory

#### Scenario: Combined filters
- **WHEN** multiple filters are applied
- **THEN** cards match ALL filter criteria (AND logic)
- **AND** no results shows empty state: "No agents match filters"

### Requirement: Agent Sorting
The system SHALL provide sorting options for agent cards.

#### Scenario: Sort by creation time
- **WHEN** "Sort by: Newest" is selected (default)
- **THEN** agents are sorted by startTime descending
- **AND** most recently spawned agents appear first

#### Scenario: Sort by name
- **WHEN** "Sort by: Name" is selected
- **THEN** agents are sorted alphabetically by name
- **AND** case-insensitive sorting

#### Scenario: Sort by activity
- **WHEN** "Sort by: Most Active" is selected
- **THEN** agents are sorted by lastActivityTime descending
- **AND** most recently active agents appear first

#### Scenario: Sort by message count
- **WHEN** "Sort by: Messages" is selected
- **THEN** agents are sorted by messageCount descending
- **AND** agents with most messages appear first

### Requirement: Keyboard Navigation
The system SHALL support keyboard shortcuts for efficient navigation.

#### Scenario: Navigate between cards
- **WHEN** in dashboard view
- **THEN** Tab key moves focus between agent cards
- **AND** Enter key expands focused card
- **AND** Arrow keys navigate grid spatially

#### Scenario: Expanded view shortcuts
- **WHEN** in expanded agent view
- **THEN** keyboard shortcuts work:
  - Escape: Collapse to dashboard
  - Left/Right arrows: Previous/next agent
  - P: Pause/Resume agent
  - S: Stop agent (with confirmation)
  - R: Restart agent

#### Scenario: Global shortcuts
- **WHEN** anywhere in the app
- **THEN** shortcuts work:
  - Cmd/Ctrl + N: Open spawn form
  - Cmd/Ctrl + /: Focus search box
  - Numbers 1-9: Jump to agent 1-9

#### Scenario: Keyboard accessibility
- **WHEN** navigating with keyboard only
- **THEN** all functionality is accessible
- **AND** focus indicators are visible
- **AND** tab order is logical

### Requirement: Real-time Updates
The system SHALL update the dashboard in real-time as agents change state.

#### Scenario: Real-time status updates
- **WHEN** an agent's status changes (running → paused)
- **THEN** the card updates within 1 second
- **AND** status badge changes color/icon
- **AND** action buttons update appropriately

#### Scenario: Real-time metrics updates
- **WHEN** agents are running
- **THEN** elapsed time updates every second
- **AND** message count updates immediately when new message arrives
- **AND** updates are batched to avoid excessive re-renders

#### Scenario: Real-time card additions
- **WHEN** a new agent is spawned
- **THEN** a new card appears in the grid immediately
- **AND** animates in smoothly
- **AND** scrolls into view if off-screen

#### Scenario: Real-time card removals
- **WHEN** an agent is stopped
- **THEN** the card animates out and disappears
- **AND** remaining cards reflow smoothly
- **AND** focus moves to next card if stopped card was focused

