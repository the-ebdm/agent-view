# Add Phase 3: OpenSpec Integration

## Why

Agent View currently manages multiple Claude Code agents but lacks visibility into its own specification structure. Users and agents need to:

1. **Discover specifications** - Understand what capabilities exist and what's being changed
2. **Enforce guardrails** - Prevent agents from violating specs during code edits
3. **Manage changes** - Create and track OpenSpec proposals through the UI
4. **Navigate efficiently** - Find relevant specs and changes without leaving the dashboard

This phase integrates OpenSpec directly into the Agent View dashboard, making spec-driven development a first-class feature of the multi-agent orchestration platform.

## What Changes

### 1. OpenSpec Viewer (Full Management Interface)
- **Dashboard-based navigation** - Cards for capabilities, changes, and archives
- **In-app markdown editor** - Create/edit proposals, specs, and tasks
- **Real-time preview** - Split-pane markdown rendering
- **Syntax highlighting** - Code blocks and spec formatting
- **Visual status indicators** - Change progress, validation status
- **Collapsible sections** - Expandable requirements and scenarios

### 2. Spec Validation on Edit
- **Real-time validation** - Run `openspec validate` on every edit
- **Inline error display** - Show validation errors in editor
- **Validation status indicators** - Visual feedback on dashboard cards
- **Agent guardrails** - Warn agents when edits might violate specs (future enhancement)

### 3. Change Workflow with Slash Command Integration
- **Scaffold via UI buttons** - Create change structure with one click
- **Slash command wrappers** - UI buttons that invoke `/openspec:proposal`, `/openspec:apply`, `/openspec:archive`
- **Task tracking** - Checkboxes for tasks.md with progress indicators
- **Validation integration** - Automatic validation before archiving

### 4. Dashboard Navigation
- **Everything on dashboard** - No separate routes, modal-based interactions
- **Search-first** - Global search bar for specs, changes, requirements
- **Card grid layout** - Visual overview of capabilities and changes
- **Quick actions** - Edit, validate, archive buttons on cards
- **Breadcrumb navigation** - Context awareness within nested structures

## Impact

### New Capabilities
- `openspec-viewer` - Browse and manage OpenSpec content in UI
- `spec-validation` - Real-time validation with inline feedback
- `change-workflow` - UI-driven proposal creation and management
- `dashboard-navigation` - Unified navigation for all OpenSpec entities

### Affected Code
- `src/app/page.tsx` - Dashboard with OpenSpec cards
- `src/components/openspec/` - New component directory
  - `openspec-card.tsx` - Card for capabilities/changes
  - `openspec-editor.tsx` - Markdown editor with validation
  - `openspec-viewer.tsx` - Modal for viewing specs
  - `slash-command-button.tsx` - Wrapper for .claude/commands
- `src/app/api/openspec/` - New API routes
  - `list/route.ts` - List specs and changes
  - `validate/route.ts` - Run validation
  - `[type]/[id]/route.ts` - CRUD operations
- `src/lib/openspec/` - OpenSpec integration utilities
  - `cli-wrapper.ts` - Execute openspec CLI commands
  - `parser.ts` - Parse markdown structure
  - `validator.ts` - Validation logic

### Dependencies
- **New**: `gray-matter` - Parse YAML frontmatter
- **New**: `react-markdown` - Render markdown in UI
- **New**: `react-syntax-highlighter` - Code block highlighting
- **Existing**: OpenSpec CLI (already installed)

### Breaking Changes
None - purely additive feature set.

### Migration Path
Not applicable - new functionality only.
