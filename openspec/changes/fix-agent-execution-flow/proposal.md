# Proposal: Fix Agent Execution Flow

## Problem Statement

The current agent execution architecture has a critical flaw where agents are re-executed every time a user opens the agent interaction modal. This occurs because:

1. **`/api/agents/spawn`** creates an agent session but does NOT start execution
2. **`/api/agents/[id]/stream`** creates a NEW query generator and starts execution each time it's called
3. Opening the modal triggers the stream endpoint, causing duplicate agent executions

**User Impact:**
- Users cannot safely view agent output without triggering re-execution
- Multiple modal opens = multiple redundant agent tasks running concurrently
- Wasted API calls and compute resources
- Confusing behavior: "Why is my agent running the same task multiple times?"

## Proposed Solution

Implement a proper background execution model where:

1. **`/api/agents/spawn`** immediately starts agent execution in the background
2. Agent execution continues independently of UI connections
3. **`/api/agents/[id]/stream`** subscribes to already-running agent's output
4. Multiple subscribers can view the same agent's stream simultaneously
5. Agent execution persists even when no clients are connected

## Architecture Changes

### 1. Agent Execution Registry

Create a central registry (`AgentExecutionManager`) that:
- Stores running query generator instances per agent ID
- Broadcasts messages to multiple stream subscribers
- Manages agent lifecycle (pause/resume/stop)
- Handles cleanup when agents complete

### 2. Spawn Endpoint Behavior

**Current:** Creates session metadata only
**New:** Creates session + starts background execution + returns immediately

```typescript
POST /api/agents/spawn
→ sessionManager.createSession(...)
→ executionManager.startAgent(id, prompt, directory, permissions)
→ Background: query generator starts, messages broadcast to registry
→ Response: { id, name, status: 'running' }
```

### 3. Stream Endpoint Behavior

**Current:** Creates new query generator, starts execution
**New:** Subscribes to existing agent's message stream

```typescript
GET /api/agents/[id]/stream
→ executionManager.subscribe(id)
→ SSE stream of messages from registry
→ Handles late subscribers (sends recent messages + live stream)
→ Unsubscribe on connection close
```

### 4. Message Broadcasting

Implement pub/sub pattern:
- Agent execution emits messages to registry
- Registry maintains message buffer per agent (e.g., last 100 messages)
- Stream subscribers receive: buffered messages + live updates
- Multiple subscribers can connect/disconnect independently

## Benefits

1. **Correct behavior**: Agents run exactly once per spawn
2. **Multiple viewers**: Multiple users/tabs can view same agent
3. **Persistent execution**: Agents continue running even if UI disconnects
4. **Mobile-friendly**: Mobile users can disconnect/reconnect without disruption
5. **Resource efficient**: No duplicate executions

## Implementation Scope

### In Scope
- AgentExecutionManager class with pub/sub registry
- Refactor `/api/agents/spawn` to start execution
- Refactor `/api/agents/[id]/stream` to subscribe
- Message buffering for late subscribers
- Cleanup on agent completion

### Out of Scope
- Generator-based pause/resume (deferred to Phase 2 completion)
- Persistent state across server restarts
- Cross-process agent execution (single Node.js process only)

## Risks & Mitigations

**Risk:** Memory leaks from accumulated messages
**Mitigation:** Implement message buffer limits (100 messages/agent) and cleanup on completion

**Risk:** Breaking existing Phase 2 functionality
**Mitigation:** Minimal changes to session manager, lifecycle methods remain unchanged

**Risk:** Complexity of pub/sub implementation
**Mitigation:** Use simple EventEmitter pattern, defer to libraries only if needed

## Success Criteria

1. Agent spawns once per `/api/agents/spawn` call
2. Opening modal does NOT trigger re-execution
3. Multiple modal opens show same agent output
4. Agent continues running when modal is closed
5. Late subscribers receive recent message history + live updates

## Dependencies

- Requires Phase 2 session manager (already implemented)
- No external dependencies needed
- Compatible with current Phase 2 UI components

## Estimated Effort

- Design & implementation: 4-6 hours
- Testing & validation: 2-3 hours
- Documentation: 1 hour
- **Total: 7-10 hours**

## Related Changes

- **Blocks:** Phase 2 completion (without this, multi-agent UX is broken)
- **Depends on:** Phase 2 session manager (already complete)
- **Related to:** `add-phase2-multi-agent` (fixes critical bug in Phase 2)
