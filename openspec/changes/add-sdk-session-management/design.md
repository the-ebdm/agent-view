# SDK Session Management Design

## Context

The Claude Agent SDK manages conversation state through session IDs. When calling `query()`, the SDK returns an init message containing a unique session identifier. This session ID can be used with the `resume` option to continue a conversation, or with `forkSession: true` to branch the conversation into a new independent session.

Currently, Agent View ignores these session IDs, treating each agent spawn as a completely independent operation. This limits the application to one-shot interactions instead of conversational workflows.

### Constraints
- JavaScript async generators cannot be paused mid-execution (they run to completion or error)
- The SDK maintains conversation history server-side via session IDs
- Multiple agents can share the same original session through forking
- Session IDs must persist across server restarts for resume functionality

### Stakeholders
- **End users** - Developers using Agent View to manage AI agents
- **Future features** - Agent collaboration, task queuing depend on session continuity

## Goals / Non-Goals

### Goals
1. **Session ID tracking** - Capture and persist SDK session IDs automatically
2. **Reply functionality** - Enable follow-up messages to existing agents
3. **Fork functionality** - Branch conversations from any point in history
4. **True pause/resume** - Implement pause/resume using SDK session resumption
5. **Backward compatibility** - Existing agents without sessions continue working
6. **Restart recovery** - Resume paused sessions after server restarts

### Non-Goals
- Multi-agent conversation merging (multiple agents collaborating on same session)
- Session expiration policies (rely on SDK's session management)
- Session transfer between users (authentication out of scope)
- Visual conversation tree UI (simple fork indicator sufficient for v1)

## Decisions

### Decision 1: Session ID Storage Location

**Options:**
1. In-memory only (lost on restart)
2. Database column on agents table ✓
3. Separate sessions table with 1:1 relationship

**Choice:** Database column on agents table

**Rationale:**
- Simple 1:1 relationship (one session per agent)
- No additional joins required for queries
- Nullable column handles legacy agents gracefully
- Index enables fast lookups by session_id

### Decision 2: Pause/Resume Implementation

**Options:**
1. Try to suspend JavaScript generator (impossible with current JS)
2. Stop generator + resume with SDK session ✓
3. Implement custom message buffering and replay

**Choice:** Stop generator + resume with SDK session

**Rationale:**
- JavaScript generators cannot be paused mid-execution
- SDK's `resume` option preserves full conversation history automatically
- Clean separation: pause = graceful stop, resume = new generator with session
- No custom state management needed (SDK handles it)

**Trade-offs:**
- Slight delay on resume (must restart generator)
- Cannot pause mid-tool-execution (waits for tool completion)
- Acceptable because: pauses typically last minutes/hours, not milliseconds

### Decision 3: Reply vs Resume Semantics

**Options:**
1. Single "continue" operation with optional message
2. Separate "reply" (with message) and "resume" (without message) ✓
3. Reply only (always require a message)

**Choice:** Separate "reply" and "resume" operations

**Rationale:**
- Reply = user sends new message (conversational)
- Resume = continue where left off (workflow control)
- Matches user mental models for each operation
- Resume can be implemented as reply with empty/system message

### Decision 4: Fork Relationship Tracking

**Options:**
1. No tracking (forks are independent) ✓
2. Track parent_session_id for lineage visualization
3. Full fork tree with bidirectional relationships

**Choice:** No tracking initially (defer to future enhancement)

**Rationale:**
- Session forking is advanced feature (low initial usage expected)
- Can add parent_session_id column later without breaking changes
- Keep v1 implementation simple and focused on core functionality
- UI can still show "forked from {parent.name}" using in-memory data during creation

### Decision 5: Session Metadata Extraction

**Options:**
1. Process all system messages in stream handler ✓
2. Add special "session" message type to AgentMessage union
3. Use separate callback/event for session metadata

**Choice:** Process system messages in stream handler, return metadata alongside messages

**Rationale:**
- Centralized SDK message processing in one place
- Stream handler already processes all SDK messages
- Can extract session_id and other metadata in single pass
- Execution manager receives metadata naturally during stream processing

## Architecture

### Session Capture Flow
```
SDK.query()
  → yields init message with session_id
  → stream-handler extracts session_id
  → execution-manager receives metadata
  → session-manager stores session_id
  → agents-repository persists to DB
```

### Reply Flow
```
User clicks "Reply" button
  → POST /api/agents/{id}/reply { message }
  → Load agent from DB (get session_id)
  → SDK.query({ resume: session_id, prompt: message })
  → Start new execution with resumed context
  → Stream messages as normal agent
```

### Fork Flow
```
User clicks "Fork" button
  → POST /api/agents/{id}/fork { prompt, name? }
  → Load agent from DB (get session_id)
  → SDK.query({ resume: session_id, forkSession: true, prompt })
  → Creates new agent with new session_id
  → Both sessions exist independently
```

### Pause/Resume Flow (Rearchitected)
```
Pause:
  1. Call stopAgent(id, permanent=false)
  2. Set lifecycleState = 'paused'
  3. Preserve session_id in DB
  4. Generator stops gracefully

Resume:
  1. Load agent from DB (get session_id)
  2. SDK.query({ resume: session_id })
  3. Start new execution-manager generator
  4. Set lifecycleState = 'running'
  5. Conversation continues from exact point
```

## Risks / Trade-offs

### Risk 1: Session Expiration
**Risk:** SDK may expire sessions after period of inactivity
**Mitigation:**
- Document session lifetime limitations
- Add error handling for "session expired" responses
- Future: Implement session keep-alive pings for paused agents

### Risk 2: Generator Restart Delay
**Risk:** Resume operation requires starting new generator (not instantaneous)
**Impact:** ~1-2 second delay when resuming paused agents
**Mitigation:**
- Show "Resuming..." UI state during transition
- Pre-warm generator on resume button click (before user confirmation)
- Acceptable because pauses typically last minutes/hours

### Risk 3: Mid-Tool Pause
**Risk:** Cannot pause agent while SDK is executing a tool
**Impact:** Pause request must wait for current tool to complete
**Mitigation:**
- Show "Pausing..." state while waiting
- Add timeout (30 seconds) before force-stop
- Document limitation in UI tooltips

### Risk 4: Concurrent Session Operations
**Risk:** User could try to reply, fork, and resume same session simultaneously
**Mitigation:**
- Add API-level locking (prevent concurrent operations on same agent)
- UI disables conflicting buttons during operations
- Return 409 Conflict if operation already in progress

## Migration Plan

### Phase 1: Database Schema (Non-Breaking)
1. Add nullable `session_id TEXT` column to `agents` table
2. Add index on `session_id` for fast lookups
3. No data migration needed (NULLs handled gracefully)
4. Deploy schema change (backward compatible)

### Phase 2: Session Capture (Additive)
1. Update stream-handler to extract session_id from init messages
2. Update execution-manager to store session_id when received
3. Update session-manager to persist session_id to DB
4. New agents automatically capture sessions
5. Legacy agents remain functional (NULL session_id)

### Phase 3: Reply & Fork APIs (New Endpoints)
1. Implement `/api/agents/{id}/reply` endpoint
2. Implement `/api/agents/{id}/fork` endpoint
3. Add SDK client functions for resume and fork
4. No impact on existing functionality

### Phase 4: UI Enhancements (Progressive)
1. Add session indicator badges to agent cards
2. Add reply interface to agent output view
3. Add fork button to agent context menus
4. Features only appear for agents with session_id

### Phase 5: Pause/Resume Refactor (Behavior Change)
1. Refactor pause to use stopAgent + preserve session
2. Refactor resume to use SDK session resumption
3. Test extensively (behavior changes from state-only to execution control)
4. Document new pause/resume semantics

### Rollback Strategy
- Each phase is independently deployable
- Phases 1-4 are purely additive (can be rolled back without data loss)
- Phase 5 requires testing before production deployment
- Database migration is non-destructive (add column, no deletes)

## Open Questions

1. **Q:** Should forks inherit tool permissions from parent?
   **A:** Deferred - v1 uses default permissions, future enhancement for permission inheritance

2. **Q:** Should there be a limit on forks per session?
   **A:** Deferred - rely on 20 concurrent agent limit for now, monitor usage patterns

3. **Q:** Should reply create a new agent or extend existing?
   **A:** Create new agent - maintains clean separation and history tracking

4. **Q:** How to handle session_id conflicts (same session resumed twice)?
   **A:** SDK handles conflict resolution, app treats as new independent agent instance
