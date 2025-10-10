# Implementation Tasks: Phase 3 OpenSpec Integration

## 1. Foundation & Dependencies

- [x] 1.1 Install npm dependencies: `gray-matter`, `react-markdown`, `react-syntax-highlighter`, `@types/react-syntax-highlighter`
- [x] 1.2 Create `src/lib/openspec/` directory structure
- [x] 1.3 Create `src/components/openspec/` directory structure
- [x] 1.4 Create `src/app/api/openspec/` directory structure
- [x] 1.5 Add OpenSpec types to `src/types/openspec.ts`

## 2. OpenSpec CLI Wrapper

- [x] 2.1 Create `src/lib/openspec/cli-wrapper.ts` with exec wrapper for openspec commands
- [x] 2.2 Implement `listSpecs()` function to parse `openspec list --specs --json`
- [x] 2.3 Implement `listChanges()` function to parse `openspec list --json`
- [x] 2.4 Implement `validateChange(id)` function to run `openspec validate [id] --strict`
- [x] 2.5 Implement `showChange(id)` function to parse `openspec show [id] --json`
- [x] 2.6 Implement `showSpec(id)` function to parse `openspec show [id] --type spec --json`
- [x] 2.7 Add error handling and timeout (5s default) to all CLI calls
- [ ] 2.8 Add unit tests for CLI wrapper functions

## 3. File System Operations

- [x] 3.1 Create `src/lib/openspec/fs-operations.ts` with secure file path validation
- [x] 3.2 Implement `readOpenSpecFile(path)` with path traversal protection
- [x] 3.3 Implement `writeOpenSpecFile(path, content)` with validation
- [x] 3.4 Implement `listOpenSpecFiles(directory)` for browsing structure
- [x] 3.5 Implement `createChangeDirectory(id)` for scaffolding
- [x] 3.6 Implement `moveToArchive(id)` for archiving changes
- [x] 3.7 Add rate limiting (max 100 file ops/minute per user)
- [ ] 3.8 Add unit tests for file operations with mock filesystem

## 4. Markdown Parsing

- [x] 4.1 Create `src/lib/openspec/parser.ts` for markdown parsing
- [x] 4.2 Implement `parseSpecMarkdown(content)` to extract requirements and scenarios
- [x] 4.3 Implement `parseTasksMarkdown(content)` to extract checklist items
- [x] 4.4 Implement `parseProposalMarkdown(content)` to extract sections
- [x] 4.5 Implement `updateTaskCheckbox(content, taskIndex, checked)` to toggle checkboxes
- [x] 4.6 Add gray-matter integration for YAML frontmatter parsing
- [ ] 4.7 Add unit tests for parser functions with sample markdown

## 5. API Routes - List Operations

- [x] 5.1 Create `src/app/api/openspec/list/route.ts` for GET all entities
- [x] 5.2 Implement listing specs from `openspec/specs/`
- [x] 5.3 Implement listing changes from `openspec/changes/`
- [x] 5.4 Implement listing archives from `openspec/changes/archive/`
- [x] 5.5 Add query parameters for filtering (type, status)
- [x] 5.6 Add response caching (30s TTL)
- [x] 5.7 Add error handling and validation

## 6. API Routes - CRUD Operations

- [x] 6.1 Create `src/app/api/openspec/spec/[id]/route.ts` for spec operations
- [x] 6.2 Implement GET to read spec by ID
- [x] 6.3 Implement PUT to update spec content
- [x] 6.4 Create `src/app/api/openspec/change/[id]/route.ts` for change operations
- [x] 6.5 Implement GET to read change by ID (proposal, tasks, deltas)
- [x] 6.6 Implement PUT to update change files
- [x] 6.7 Implement DELETE to remove change directory
- [x] 6.8 Add validation for all write operations

## 7. API Routes - Validation

- [ ] 7.1 Create `src/app/api/openspec/validate/[id]/route.ts` for validation
- [ ] 7.2 Implement POST to trigger validation for change
- [ ] 7.3 Add debouncing via Redis/in-memory cache (500ms)
- [ ] 7.4 Implement validation result caching (30s, keyed by content hash)
- [ ] 7.5 Add rate limiting (max 10/sec per user)
- [ ] 7.6 Implement timeout handling (5s default, 10s retry)
- [ ] 7.7 Format validation errors for UI display

## 8. API Routes - Slash Commands

- [ ] 8.1 Create `src/app/api/slash-command/route.ts` for command execution
- [ ] 8.2 Implement POST to execute slash commands from `.claude/commands/`
- [ ] 8.3 Add command whitelist for security (only openspec:*)
- [ ] 8.4 Capture stdout/stderr from command execution
- [ ] 8.5 Implement command timeout (30s)
- [ ] 8.6 Add audit logging for command execution
- [ ] 8.7 Return structured response with status, output, errors

## 9. Dashboard Integration

- [x] 9.1 Update `src/app/page.tsx` to fetch OpenSpec entities
- [x] 9.2 Add OpenSpec cards to dashboard grid
- [x] 9.3 Implement section headers ("Active Changes", "Specifications", "Archives")
- [x] 9.4 Add collapsible sections for each entity type
- [x] 9.5 Implement empty state messages for each section
- [x] 9.6 Add loading skeletons during data fetch
- [ ] 9.7 Implement error boundaries for OpenSpec section

## 10. Card Components

- [x] 10.1 Create `src/components/openspec/openspec-card.tsx` base component
- [x] 10.2 Create `src/components/openspec/capability-card.tsx` for specs
- [x] 10.3 Add capability name, icon (📋), and statistics display
- [x] 10.4 Create `src/components/openspec/change-card.tsx` for changes
- [x] 10.5 Add change ID, icon (🔄), progress bar, and status indicator
- [x] 10.6 Create `src/components/openspec/archive-card.tsx` for archives
- [x] 10.7 Add archive name, icon (📦), and date display
- [x] 10.8 Implement hover effects and action button display

## 11. Search Functionality

- [x] 11.1 Create search bar component integrated in OpenSpec section
- [ ] 11.2 Add to dashboard header with keyboard shortcut (Cmd/Ctrl+K)
- [x] 11.3 Implement debounced search (200ms) with real-time filtering
- [ ] 11.4 Create search index for entity names, requirements, scenarios
- [ ] 11.5 Implement text highlighting for matching results in cards
- [ ] 11.6 Add "Clear search" button and Escape key handler
- [x] 11.7 Implement empty state for no results

## 12. Modal Viewer

- [x] 12.1 Create `src/components/openspec/openspec-modal.tsx` base component
- [x] 12.2 Implement modal overlay with backdrop dimming
- [x] 12.3 Add breadcrumb navigation in modal header
- [x] 12.4 Implement close on Escape key and overlay click
- [x] 12.5 Create `src/components/openspec/spec-viewer.tsx` for viewing specs
- [x] 12.6 Implement tab interface for multi-file changes (proposal, tasks, deltas)
- [x] 12.7 Add z-index stacking for nested modals
- [ ] 12.8 Implement mobile full-screen mode

## 13. Markdown Rendering

- [x] 13.1 Create `src/components/openspec/markdown-renderer.tsx` component
- [x] 13.2 Integrate react-markdown for content rendering
- [x] 13.3 Add react-syntax-highlighter for code blocks
- [x] 13.4 Configure syntax highlighting for TypeScript, JavaScript, Bash, JSON, YAML
- [x] 13.5 Implement custom renderers for headings, lists, links
- [x] 13.6 Add styling for spec-specific elements (requirements, scenarios)
- [ ] 13.7 Implement collapsible requirement sections

## 14. Markdown Editor

- [ ] 14.1 Create `src/components/openspec/markdown-editor.tsx` component
- [ ] 14.2 Implement split-pane layout (editor left, preview right)
- [ ] 14.3 Add textarea with basic syntax highlighting
- [ ] 14.4 Implement real-time preview update
- [ ] 14.5 Create `src/components/openspec/editor-toolbar.tsx` for formatting buttons
- [ ] 14.6 Add toolbar buttons: Bold, Italic, Code, Code Block, List, Heading
- [ ] 14.7 Implement formatting actions (wrap selected text, insert at cursor)
- [ ] 14.8 Add keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)

## 15. Mobile Editor Layout

- [ ] 15.1 Implement responsive layout detection (< 768px = mobile)
- [ ] 15.2 Create tab interface for mobile (Edit | Preview tabs)
- [ ] 15.3 Add swipe gesture support for tab switching
- [ ] 15.4 Stack editor and preview vertically on mobile
- [ ] 15.5 Add mobile-optimized toolbar (larger touch targets)
- [ ] 15.6 Implement auto-scroll to cursor position

## 16. Auto-Save Functionality

- [ ] 16.1 Implement auto-save timer (5s interval)
- [ ] 16.2 Track content changes since last save
- [ ] 16.3 Show "Saving..." indicator during save
- [ ] 16.4 Show "Saved" indicator with timestamp after success
- [ ] 16.5 Implement save on modal close
- [ ] 16.6 Add confirmation prompt for unsaved changes on close
- [ ] 16.7 Store last save timestamp in component state

## 17. Validation UI

- [ ] 17.1 Create `src/components/openspec/validation-indicator.tsx` component
- [ ] 17.2 Implement status icons: ⏳ pending, ✅ valid, ❌ invalid, 🔄 validating
- [ ] 17.3 Add status text and error count display
- [ ] 17.4 Create `src/components/openspec/validation-panel.tsx` for error display
- [ ] 17.5 Implement collapsible error panel below editor
- [ ] 17.6 Display error list with file, line number, message
- [ ] 17.7 Add "Jump to error" buttons for each error
- [ ] 17.8 Implement line highlighting for errors in editor

## 18. Validation Integration

- [ ] 18.1 Add validation status to card state
- [ ] 18.2 Trigger validation on editor content change (500ms debounce)
- [ ] 18.3 Show validation indicator on card
- [ ] 18.4 Update validation panel in editor
- [ ] 18.5 Implement manual "Validate" button on card
- [ ] 18.6 Implement manual "Validate" button in editor toolbar
- [ ] 18.7 Add "Validate All" button to dashboard

## 19. Task Checklist

- [ ] 19.1 Create `src/components/openspec/task-checklist.tsx` component
- [ ] 19.2 Parse tasks.md for checklist items (`- [ ]` / `- [x]`)
- [ ] 19.3 Render interactive checkboxes for each task
- [ ] 19.4 Implement checkbox toggle handler (update tasks.md)
- [ ] 19.5 Show progress bar: X/Y tasks complete
- [ ] 19.6 Add "Add Task" button with input field
- [ ] 19.7 Update card progress bar when tasks change

## 20. Change Status Management

- [ ] 20.1 Implement status derivation from task completion percentage
- [ ] 20.2 Add status indicator to change cards (Pending, In Progress, Complete)
- [ ] 20.3 Update status when tasks change
- [ ] 20.4 Enable "Archive" button only when status is "Complete"
- [ ] 20.5 Add status filter to dashboard ("Show only Complete")

## 21. Slash Command Buttons

- [ ] 21.1 Create `src/components/openspec/slash-command-button.tsx` component
- [ ] 21.2 Add "New Proposal" button to dashboard
- [ ] 21.3 Implement dialog for change ID input with validation
- [ ] 21.4 Execute `/openspec:proposal [change-id]` on confirm
- [ ] 21.5 Add "Apply" button to change cards
- [ ] 21.6 Execute `/openspec:apply [change-id]` and show output
- [ ] 21.7 Add "Archive" button to complete change cards
- [ ] 21.8 Implement archive confirmation dialog with options

## 22. Archive Workflow

- [ ] 22.1 Create archive confirmation dialog component
- [ ] 22.2 Add checkboxes for --skip-specs and --yes flags
- [ ] 22.3 Show warning about moving to archive/
- [ ] 22.4 Execute `/openspec:archive [change-id]` with flags
- [ ] 22.5 Show archiving progress indicator
- [ ] 22.6 Refresh dashboard after archive completes
- [ ] 22.7 Block archive if validation is invalid (add override option)

## 23. File Management

- [ ] 23.1 Implement "Add Spec Delta" button in change view
- [ ] 23.2 Create capability name input dialog
- [ ] 23.3 Generate delta template with ADDED/MODIFIED/REMOVED sections
- [ ] 23.4 Create file and open in editor
- [ ] 23.5 Implement "Delete" button for spec deltas
- [ ] 23.6 Add confirmation dialog for file deletion
- [ ] 23.7 Implement "Add Design Doc" button with template

## 24. Responsive Layout

- [ ] 24.1 Implement mobile grid layout (1 column, < 768px)
- [ ] 24.2 Implement tablet grid layout (2 columns, 768px-1024px)
- [ ] 24.3 Implement desktop grid layout (3 columns, > 1024px)
- [ ] 24.4 Add touch target sizing for mobile (min 44x44px)
- [ ] 24.5 Test responsive behavior on iPhone, iPad, desktop

## 25. Context Menus

- [ ] 25.1 Create `src/components/openspec/context-menu.tsx` component
- [ ] 25.2 Implement right-click handler on cards
- [ ] 25.3 Add context menu for change cards (Edit, Validate, Duplicate, Delete, Archive)
- [ ] 25.4 Add context menu for spec cards (View, Edit, Create related change)
- [ ] 25.5 Implement long-press handler for mobile
- [ ] 25.6 Show context menu as bottom sheet on mobile

## 26. Visual Design

- [ ] 26.1 Define color scheme for status indicators (green, yellow, red, gray)
- [ ] 26.2 Add entity type icons (📋, 🔄, 📦, 🤖)
- [ ] 26.3 Implement color-coded card borders based on status
- [ ] 26.4 Add progress bar styling with color gradients
- [ ] 26.5 Implement hover effects for desktop cards
- [ ] 26.6 Add transitions and animations (smooth, 200ms duration)

## 27. Filtering and Sorting

- [ ] 27.1 Create filter dropdown component ("All", "Changes", "Specs", "Archives")
- [ ] 27.2 Implement filter handler to show/hide cards
- [ ] 27.3 Create sort dropdown component ("Name A-Z", "Recently Modified", "Status")
- [ ] 27.4 Implement sort functions for each option
- [ ] 27.5 Persist filter/sort preferences to localStorage
- [ ] 27.6 Add card count indicators in section headers

## 28. Error Handling

- [ ] 28.1 Add error boundaries around OpenSpec components
- [ ] 28.2 Implement retry logic for failed API calls
- [ ] 28.3 Show user-friendly error messages in notifications
- [ ] 28.4 Add fallback UI for corrupted markdown files
- [ ] 28.5 Log errors to console for debugging
- [ ] 28.6 Implement offline detection and warning

## 29. Performance Optimization

- [ ] 29.1 Implement virtual scrolling for card grid (react-virtual)
- [ ] 29.2 Add lazy loading for markdown content
- [ ] 29.3 Implement pagination (50 cards per page)
- [ ] 29.4 Optimize search index with memoization
- [ ] 29.5 Add request debouncing for validation (500ms)
- [ ] 29.6 Cache API responses (30s TTL)

## 30. Testing

- [ ] 30.1 Write unit tests for CLI wrapper functions
- [ ] 30.2 Write unit tests for markdown parser
- [ ] 30.3 Write unit tests for file operations
- [ ] 30.4 Write component tests for card components
- [ ] 30.5 Write component tests for modal and editor
- [ ] 30.6 Write integration tests for validation flow
- [ ] 30.7 Write E2E test for create → edit → archive workflow

## 31. Documentation

- [ ] 31.1 Document OpenSpec API routes in README
- [ ] 31.2 Add inline code comments for complex logic
- [ ] 31.3 Create user guide for OpenSpec UI features
- [ ] 31.4 Document slash command integration
- [ ] 31.5 Add troubleshooting section for common issues
- [ ] 31.6 Update project.md with Phase 3 completion status

## 32. Mobile Testing

- [ ] 32.1 Test dashboard on iPhone 13 mini (smallest target)
- [ ] 32.2 Test modal interactions on mobile
- [ ] 32.3 Test editor on mobile keyboard
- [ ] 32.4 Test swipe gestures for tab switching
- [ ] 32.5 Validate touch target sizes (min 44x44px)
- [ ] 32.6 Test via Tailscale remote access

## 33. Accessibility

- [ ] 33.1 Add ARIA labels to interactive elements
- [ ] 33.2 Ensure keyboard navigation works for all actions
- [ ] 33.3 Test with screen reader (VoiceOver/NVDA)
- [ ] 33.4 Verify color contrast meets WCAG AA standards
- [ ] 33.5 Add focus indicators for keyboard navigation
- [ ] 33.6 Implement skip links for modal content

## 34. Security Hardening

- [ ] 34.1 Validate all file paths to prevent directory traversal
- [ ] 34.2 Sanitize markdown content to prevent XSS
- [ ] 34.3 Rate limit API endpoints (10 req/sec for validation, 100 req/min for files)
- [ ] 34.4 Add CSRF protection to POST endpoints
- [ ] 34.5 Whitelist slash commands (only openspec:*)
- [ ] 34.6 Audit log all file write operations

## 35. Deployment

- [ ] 35.1 Test full workflow on staging environment
- [ ] 35.2 Run `openspec validate --strict` on all changes
- [ ] 35.3 Deploy to microk8s cluster (heimdall/odin)
- [ ] 35.4 Verify Tailscale remote access works
- [ ] 35.5 Test on mobile device via Tailscale
- [ ] 35.6 Archive Phase 3 change after successful deployment
