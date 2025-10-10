# Design: OpenSpec Integration

## Context

Agent View is a multi-agent orchestration platform that uses OpenSpec for spec-driven development. The OpenSpec workflow (proposal → implementation → archive) is currently CLI-only and external to the application. This design brings OpenSpec into the dashboard as a first-class feature, enabling users to manage specs while monitoring agents.

### Constraints
- **Mobile-first** - All OpenSpec features must work on mobile
- **Real-time validation** - Feedback within 500ms of edits
- **No separate routes** - Everything in dashboard modals
- **Slash command integration** - Reuse existing .claude/commands
- **Read-write access** - Full CRUD on OpenSpec files

### Stakeholders
- **Developers** - Primary users managing specs and agents
- **AI Agents** - Will use specs as guardrails (Phase 3+)
- **Future contributors** - Need discoverable spec structure

## Goals / Non-Goals

### Goals
1. **Unified interface** - Manage agents and specs in one place
2. **Fast feedback** - Real-time validation without blocking
3. **Mobile accessibility** - Full OpenSpec workflow on phone
4. **Slash command reuse** - Leverage existing .claude/commands patterns
5. **Incremental adoption** - Users can still use CLI if preferred

### Non-Goals
1. **Git integration** - No commit/push from UI (use CLI)
2. **Multi-user editing** - Single-user local development only
3. **Agent auto-generation** - Agents don't create specs (yet)
4. **Spec diffing** - Use CLI for detailed diffs
5. **Version control** - Rely on git for history

## Decisions

### 1. Dashboard-Only Architecture

**Decision**: All OpenSpec UI lives in dashboard modals, no separate routes.

**Why**:
- Keeps navigation simple and mobile-friendly
- Avoids state synchronization between routes
- Matches existing agent management pattern
- Reduces cognitive load (one place for everything)

**Alternatives Considered**:
- Separate `/openspec` route - Rejected: breaks mobile flow, requires navigation
- Sidebar panel - Rejected: too narrow on mobile, conflicts with agent cards

**Implementation**:
```typescript
// Dashboard shows OpenSpec cards alongside agent cards
<DashboardGrid>
  <AgentCards agents={agents} />
  <OpenSpecCards specs={specs} changes={changes} />
</DashboardGrid>

// Clicking a card opens a modal
<OpenSpecModal
  type="change"
  id="add-phase3-openspec-integration"
  onClose={() => setSelectedSpec(null)}
/>
```

### 2. API-Based File Operations

**Decision**: Use Next.js API routes to read/write OpenSpec files, not client-side fs access.

**Why**:
- Security: Server validates all file paths (prevent directory traversal)
- Consistency: Same pattern as agent API routes
- Mobile-friendly: Works with remote access via Tailscale
- Validation: Server-side openspec CLI execution

**Implementation**:
```typescript
// API route structure
src/app/api/openspec/
├── list/route.ts              // GET specs and changes
├── validate/[id]/route.ts     // POST validate change
├── spec/[id]/route.ts         // GET/PUT/DELETE spec
└── change/[id]/route.ts       // GET/PUT/DELETE change
```

**Security**:
- Validate all paths are within `openspec/`
- Reject any paths with `..` or absolute paths
- Rate limit validation requests (max 10/sec)

### 3. Real-Time Validation with Debouncing

**Decision**: Validate on edit with 500ms debounce + visual feedback.

**Why**:
- Fast feedback improves developer experience
- Debouncing prevents excessive CLI calls
- Visual indicators show validation state clearly

**Flow**:
```
User edits → Debounce 500ms → POST /api/openspec/validate → Update UI
                                   ↓
                           Run: openspec validate [id] --strict
                                   ↓
                           Return: { valid, errors[] }
```

**States**:
- ⏳ **Pending** - Debounce timer active (gray icon)
- ✅ **Valid** - Passed validation (green icon)
- ❌ **Invalid** - Errors found (red icon + error list)
- 🔄 **Validating** - API call in progress (spinner)

### 4. Slash Command Button Wrappers

**Decision**: UI buttons invoke slash commands via API, don't duplicate logic.

**Why**:
- Single source of truth (slash command files)
- Consistent behavior between CLI and UI
- Slash commands already have prompts and validation
- Easy to extend (just add new command files)

**Implementation**:
```typescript
// SlashCommandButton component
<SlashCommandButton
  command="/openspec:proposal"
  args="add-new-feature"
  icon={<PlusIcon />}
  label="New Proposal"
/>

// API route
POST /api/slash-command
{
  command: "/openspec:proposal",
  args: "add-new-feature"
}
→ Executes command, returns result
```

**Commands to Wrap**:
- `/openspec:proposal` - Create new change
- `/openspec:apply` - Implement change
- `/openspec:archive` - Archive after deploy

### 5. Markdown Editor with Split Preview

**Decision**: Split-pane editor (markdown left, preview right) with mobile collapse.

**Why**:
- Standard markdown editing pattern
- Real-time preview shows rendering issues
- Mobile: Stack vertically with tab toggle

**Libraries**:
- **Editor**: `<textarea>` with syntax highlighting (simple, works everywhere)
- **Preview**: `react-markdown` with `react-syntax-highlighter`
- **Parsing**: `gray-matter` for YAML frontmatter

**Mobile Adaptation**:
- Desktop: Side-by-side 50/50 split
- Mobile: Tabs (Edit | Preview) with swipe gesture

### 6. Dashboard Card Layout

**Decision**: Card grid with visual hierarchy (specs, changes, archives).

**Why**:
- Visual overview of all OpenSpec entities
- Familiar pattern (matches agent cards)
- Easy to scan and search
- Status indicators at-a-glance

**Card Types**:

1. **Capability Card** (specs/)
   - Title: Capability name
   - Icon: 📋 spec icon
   - Stats: # requirements, # scenarios
   - Actions: View, Edit

2. **Change Card** (changes/)
   - Title: Change ID
   - Icon: 🔄 change icon
   - Progress bar: X/Y tasks complete
   - Status: Pending, In Progress, Complete
   - Actions: Edit, Validate, Archive

3. **Archive Card** (changes/archive/)
   - Title: Archived change name
   - Icon: 📦 archive icon
   - Date: Archive timestamp
   - Actions: View only

**Search Integration**:
- Global search bar filters all card types
- Search: title, capability, requirement text
- Highlight matching text in cards

## Risks / Trade-offs

### Risk 1: Performance on Large Spec Sets
**Risk**: Hundreds of specs could slow down dashboard.

**Mitigation**:
- Virtual scrolling for card grid (react-virtual)
- Lazy load markdown content (only fetch when viewing)
- Pagination: 50 cards per page
- Search indexes in memory (fast filtering)

**Acceptance**: If specs grow beyond 100, revisit architecture.

### Risk 2: Concurrent Edit Conflicts
**Risk**: User edits spec in UI while agent modifies same file.

**Mitigation**:
- **Phase 3**: Show warning if file modified externally
- **Future**: File watching + reload prompt
- **Workaround**: User saves agent work first

**Acceptance**: Single-user local dev means conflicts are rare.

### Risk 3: Mobile Editor Usability
**Risk**: Markdown editing on mobile keyboard is painful.

**Mitigation**:
- Markdown toolbar (bold, italic, code, list buttons)
- Smart indentation (preserve list/code block formatting)
- Keyboard shortcuts (Ctrl+B, Ctrl+I)
- Auto-save every 5s (prevent data loss)

**Validation**: Test with iPhone 13 mini (smallest target screen).

### Risk 4: Validation Performance
**Risk**: `openspec validate` could take >2s on large changes.

**Mitigation**:
- Debounce to 500ms (don't validate on every keystroke)
- Show spinner during validation
- Cache validation results for 30s (unless file changes)
- Timeout after 5s, show warning

**Acceptance**: If validation exceeds 5s regularly, optimize CLI.

## Migration Plan

### Phase 3.1: Read-Only Foundation (Week 1)
1. API routes for listing specs/changes
2. Dashboard cards with view-only modals
3. Search functionality
4. Basic markdown rendering

**Validation**: Can browse all OpenSpec content on mobile.

### Phase 3.2: Editor + Validation (Week 2)
1. Markdown editor component
2. Split-pane preview
3. Real-time validation
4. Save functionality

**Validation**: Can edit and validate a change in UI.

### Phase 3.3: Workflow Integration (Week 3)
1. Slash command button wrappers
2. Task checklist tracking
3. Archive flow
4. Mobile markdown toolbar

**Validation**: Can complete full change workflow (create → edit → archive) in UI.

## Open Questions

### Q1: Should we support multi-file editing?
**Status**: Deferred to Phase 4.

**Reasoning**: Most changes involve 1-3 files. Tab-based editing adds complexity. Start simple.

### Q2: Do we need spec diffing in UI?
**Status**: Use CLI for now (`openspec diff`).

**Reasoning**: Diffing is complex and rarely used. CLI is sufficient.

### Q3: Should agents get read-only access to specs?
**Status**: Phase 3+ enhancement.

**Reasoning**: Agents need to read specs to respect guardrails. Write access is dangerous (agents could modify their own constraints).

**Future**: Add agent tool permission for spec reading.

### Q4: How to handle validation errors that reference line numbers?
**Status**: Show inline annotations in editor.

**Reasoning**: Validation errors like "Line 42: Missing scenario" should highlight the line. Use CodeMirror/Monaco if basic textarea is insufficient.

**Decision Point**: After implementing textarea editor, assess if annotations are needed.
