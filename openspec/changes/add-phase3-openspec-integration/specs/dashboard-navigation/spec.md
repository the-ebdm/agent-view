# Dashboard Navigation Capability

## ADDED Requirements

### Requirement: Unified Dashboard Layout
The system SHALL display all OpenSpec entities in the main dashboard alongside agent cards.

#### Scenario: Dashboard grid with mixed content
- **WHEN** user views dashboard
- **THEN** display agent cards and OpenSpec cards in unified grid
- **AND** use visual icons to distinguish card types
- **AND** maintain responsive grid layout (1 column mobile, 2-3 columns desktop)

#### Scenario: Section headers for organization
- **WHEN** dashboard has multiple entity types
- **THEN** display section headers: "Agents", "Active Changes", "Specifications", "Archives"
- **AND** allow collapsing/expanding each section

#### Scenario: Empty sections
- **WHEN** a section has no items
- **THEN** show helpful message: "No [entity type] yet. [Action to create]"

### Requirement: Global Search
The system SHALL provide search functionality across all OpenSpec content.

#### Scenario: Search bar in dashboard header
- **WHEN** user views dashboard
- **THEN** display search bar at top with placeholder: "Search specs, changes, requirements..."
- **AND** show search icon and keyboard shortcut hint (Cmd+K / Ctrl+K)

#### Scenario: Search across all entity types
- **WHEN** user enters search query
- **THEN** filter cards in real-time (debounce 200ms)
- **AND** search: change IDs, capability names, requirement text, scenario descriptions
- **AND** highlight matching text in cards

#### Scenario: Search results empty state
- **WHEN** search query returns no results
- **THEN** display message: "No results found for '[query]'"
- **AND** provide "Clear search" button

#### Scenario: Keyboard shortcut to focus search
- **WHEN** user presses Cmd+K (Mac) or Ctrl+K (Windows/Linux)
- **THEN** focus cursor in search bar
- **AND** select any existing search text

#### Scenario: Clear search
- **WHEN** user clicks "X" button in search bar
- **OR** presses Escape key
- **THEN** clear search query
- **AND** show all cards again

### Requirement: Card Filtering and Sorting
The system SHALL allow users to filter and sort OpenSpec cards.

#### Scenario: Filter by entity type
- **WHEN** user selects filter: "Changes only"
- **THEN** hide all cards except change cards
- **AND** update card count in section header

#### Scenario: Sort by name
- **WHEN** user selects sort: "Name A-Z"
- **THEN** sort all cards alphabetically by title
- **AND** maintain sort order when new cards appear

#### Scenario: Sort by date
- **WHEN** user selects sort: "Recently modified"
- **THEN** sort cards by last modified timestamp (newest first)

#### Scenario: Sort by status
- **WHEN** user selects sort: "Status"
- **THEN** sort changes by: Invalid > In Progress > Pending > Complete
- **AND** group by status with visual separators

### Requirement: Modal-Based Interactions
The system SHALL use modal dialogs for all detailed views and editing, avoiding separate routes.

#### Scenario: Open spec in modal
- **WHEN** user clicks on OpenSpec card
- **THEN** open modal overlay covering dashboard
- **AND** display breadcrumb: Dashboard > [entity type] > [entity name]
- **AND** show modal content with close button

#### Scenario: Modal z-index layering
- **WHEN** modal is open
- **THEN** dim dashboard background (dark overlay)
- **AND** prevent interaction with dashboard cards
- **AND** allow closing modal via Escape key or clicking overlay

#### Scenario: Nested modals
- **WHEN** user opens action from within modal (e.g., "Edit" while viewing)
- **THEN** stack modals with increasing z-index
- **AND** show back button to return to previous modal
- **AND** maintain breadcrumb trail

#### Scenario: Mobile modal full-screen
- **WHEN** modal opens on mobile device
- **THEN** expand modal to full screen (100% width/height)
- **AND** show header with back button and title
- **AND** support swipe-down gesture to close

### Requirement: Breadcrumb Navigation
The system SHALL provide breadcrumb trails for context awareness within nested views.

#### Scenario: Display breadcrumbs in modal header
- **WHEN** modal is open
- **THEN** show breadcrumb trail: Dashboard > [section] > [item]
- **AND** make each breadcrumb segment clickable

#### Scenario: Navigate via breadcrumbs
- **WHEN** user clicks breadcrumb segment
- **THEN** navigate to that level (close nested modals)
- **AND** update breadcrumb to reflect new level

#### Scenario: Breadcrumbs on mobile
- **WHEN** viewing on mobile device
- **THEN** truncate middle breadcrumb segments with "..."
- **AND** always show first and last segments

### Requirement: Quick Actions on Cards
The system SHALL provide contextual action buttons on each card.

#### Scenario: Capability card actions
- **WHEN** hovering over capability card
- **THEN** show action buttons: "View", "Edit"
- **AND** highlight card with subtle border

#### Scenario: Change card actions
- **WHEN** hovering over change card
- **THEN** show action buttons: "Edit", "Validate", "Archive" (if complete)
- **AND** show status-specific actions (e.g., "Apply" for pending changes)

#### Scenario: Archive card actions
- **WHEN** hovering over archive card
- **THEN** show action button: "View" only
- **AND** disable editing actions (read-only)

#### Scenario: Mobile card actions
- **WHEN** viewing on mobile device
- **THEN** always show action buttons (no hover)
- **AND** stack buttons vertically below card content

### Requirement: Responsive Grid Layout
The system SHALL adapt dashboard grid layout to screen size.

#### Scenario: Mobile layout (< 768px)
- **WHEN** viewing on mobile device
- **THEN** display cards in single column (100% width)
- **AND** stack sections vertically

#### Scenario: Tablet layout (768px - 1024px)
- **WHEN** viewing on tablet
- **THEN** display cards in 2-column grid
- **AND** adjust card padding for touch targets

#### Scenario: Desktop layout (> 1024px)
- **WHEN** viewing on desktop
- **THEN** display cards in 3-column grid
- **AND** show hover effects and tooltips

### Requirement: Card Visual Hierarchy
The system SHALL use visual design to distinguish card types and states.

#### Scenario: Entity type icons
- **WHEN** displaying cards
- **THEN** show distinctive icons:
  - 📋 for capability/spec cards
  - 🔄 for change cards
  - 📦 for archive cards
  - 🤖 for agent cards

#### Scenario: Status color coding
- **WHEN** displaying change cards
- **THEN** apply color-coded borders:
  - Green: Valid and complete
  - Yellow: In progress
  - Red: Invalid or errors
  - Gray: Pending

#### Scenario: Progress indicators
- **WHEN** change has tasks
- **THEN** show progress bar at bottom of card
- **AND** display percentage: "X/Y tasks (Z%)"

### Requirement: Context Menu Support
The system SHALL provide right-click context menus for advanced actions.

#### Scenario: Right-click on change card
- **WHEN** user right-clicks change card
- **THEN** show context menu with actions:
  - Edit
  - Validate
  - Duplicate
  - Delete
  - Archive (if complete)

#### Scenario: Right-click on spec card
- **WHEN** user right-clicks spec card
- **THEN** show context menu with actions:
  - View
  - Edit
  - Create related change

#### Scenario: Context menu on mobile
- **WHEN** user long-presses card on mobile
- **THEN** show context menu as bottom sheet
- **AND** include "Cancel" button
