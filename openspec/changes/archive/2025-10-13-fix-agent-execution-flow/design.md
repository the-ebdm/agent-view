# Design: Agent Execution Flow Fix

## Current Architecture (Broken)

```
User spawns agent:
  POST /api/agents/spawn
    → sessionManager.createSession(id, ...)
    → spawnAgent() creates query generator BUT DOESN'T START IT
    → Returns { id, status: 'running' } (LIE - not actually running!)

User opens modal:
  GET /api/agents/[id]/stream
    → getAgentQueryInstance() creates NEW query generator
    → streamAgentMessages() starts execution
    → Agent runs for the FIRST time

User closes modal, reopens:
  GET /api/agents/[id]/stream (AGAIN)
    → getAgentQueryInstance() creates ANOTHER NEW query generator
    → Agent runs AGAIN (duplicate execution!)
```

**Problem:** Stream endpoint initiates execution instead of subscribing to it.

## New Architecture (Fixed)

```
User spawns agent:
  POST /api/agents/spawn
    → sessionManager.createSession(id, ...)
    → executionManager.startAgent(id, { prompt, directory, permissions })
    → IMMEDIATELY starts query generator in background
    → Messages broadcast to registry as they arrive
    → Returns { id, status: 'running' } (TRUTH - actually running!)

User opens modal:
  GET /api/agents/[id]/stream
    → executionManager.subscribe(id, streamController)
    → Sends buffered messages (catch-up)
    → Sends live messages as they arrive
    → Agent already running, just viewing output

User closes modal:
  → Connection closes
  → executionManager.unsubscribe(id, streamController)
  → Agent CONTINUES running in background

User reopens modal:
  GET /api/agents/[id]/stream (AGAIN)
    → executionManager.subscribe(id, streamController)
    → Sends buffered messages (sees what happened while disconnected)
    → Sends live messages
    → SAME agent, NO re-execution
```

## Component Design

### AgentExecutionManager

**Responsibilities:**
- Start agent query generators
- Store running generators by agent ID
- Broadcast messages to subscribers
- Buffer recent messages for late subscribers
- Handle lifecycle events (completion, errors)
- Clean up completed agents

**Data Structures:**

```typescript
class AgentExecutionManager {
  // Running query generators (one per agent)
  private activeExecutions: Map<string, AsyncGenerator>;

  // Message buffers for late subscribers (last N messages per agent)
  private messageBuffers: Map<string, AgentMessage[]>;

  // Active stream subscriptions (agent ID → Set of controllers)
  private subscribers: Map<string, Set<ReadableStreamDefaultController>>;

  // Execution promises for cleanup
  private executionPromises: Map<string, Promise<void>>;
}
```

**Key Methods:**

```typescript
// Start agent execution in background
async startAgent(
  id: string,
  params: { prompt, directory, toolPermissions }
): Promise<void>

// Subscribe to agent's message stream
subscribe(
  id: string,
  controller: ReadableStreamDefaultController
): void

// Unsubscribe from agent's stream
unsubscribe(
  id: string,
  controller: ReadableStreamDefaultController
): void

// Broadcast message to all subscribers
private broadcastMessage(
  id: string,
  message: AgentMessage
): void

// Get buffered messages for late subscribers
getBufferedMessages(id: string): AgentMessage[]

// Stop agent execution (for lifecycle controls)
stopAgent(id: string): void
```

### Message Flow

```
Agent Execution (Background):
  query({ prompt, options }) generates messages
    ↓
  for await (message of streamAgentMessages(generator))
    ↓
  executionManager.broadcastMessage(id, message)
    ↓
  [1] Add to message buffer (ring buffer, max 100)
  [2] Send to sessionManager for persistence
  [3] Broadcast to all active subscribers (SSE streams)
    ↓
  subscribers.get(id).forEach(controller => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
  })
```

### Stream Subscription Flow

```
Client connects to /api/agents/[id]/stream:
  ↓
new ReadableStream({
  start(controller) {
    [1] Register subscriber
    executionManager.subscribe(id, controller)

    [2] Send buffered messages (catch-up)
    const buffered = executionManager.getBufferedMessages(id)
    buffered.forEach(msg => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
    })

    [3] Live messages arrive via broadcastMessage
  },

  cancel() {
    [4] Unregister subscriber
    executionManager.unsubscribe(id, controller)
  }
})
```

## Lifecycle Integration

### Pause/Resume (Future)

Current proposal **does not** implement generator pause/resume. Instead:
- `pauseAgent()` sets `lifecycleState` to 'paused' (metadata only)
- Agent continues running but messages are queued
- `resumeAgent()` sets state back to 'running', messages flow again

**Note:** True generator suspension requires storing generator state, which is complex. Deferred to Phase 2 task 3.2-3.4.

### Stop

```typescript
stopAgent(id: string): void {
  const generator = activeExecutions.get(id)
  if (generator && generator.return) {
    await generator.return() // Gracefully close generator
  }

  // Notify all subscribers
  broadcastMessage(id, {
    type: 'system',
    content: 'Agent stopped by user',
    timestamp: Date.now()
  })

  // Clean up
  activeExecutions.delete(id)
  subscribers.delete(id)
  executionPromises.delete(id)
}
```

### Completion/Error

Agent automatically cleans up when execution completes:

```typescript
private async runAgent(id: string, params: SpawnParams): Promise<void> {
  try {
    const generator = query({ prompt: params.prompt, options: {...} })
    activeExecutions.set(id, generator)

    for await (const message of streamAgentMessages(generator)) {
      broadcastMessage(id, message)

      if (message.type === 'error' || message.type === 'result') {
        break // Agent finished
      }
    }
  } finally {
    // Always clean up
    activeExecutions.delete(id)
    setTimeout(() => {
      // Keep messages buffered for 5 minutes after completion
      messageBuffers.delete(id)
      subscribers.delete(id)
    }, 5 * 60 * 1000)
  }
}
```

## Error Handling

### Agent Execution Errors

```typescript
try {
  for await (const message of streamAgentMessages(generator)) {
    broadcastMessage(id, message)
  }
} catch (error) {
  const errorMessage = {
    type: 'error',
    content: error.message,
    timestamp: Date.now()
  }

  broadcastMessage(id, errorMessage)
  sessionManager.addMessage(id, errorMessage)
  sessionManager.updateStatus(id, 'error')
}
```

### Subscriber Connection Errors

```typescript
broadcastMessage(id: string, message: AgentMessage): void {
  const subs = subscribers.get(id)
  if (!subs) return

  const failedControllers: Set<ReadableStreamDefaultController> = new Set()

  subs.forEach(controller => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
    } catch (error) {
      // Controller closed or errored
      failedControllers.add(controller)
    }
  })

  // Remove failed subscribers
  failedControllers.forEach(controller => {
    subs.delete(controller)
  })
}
```

### Agent Not Found

```typescript
// In /api/agents/[id]/stream
const session = sessionManager.getSession(id)
if (!session) {
  return new Response('Agent not found', { status: 404 })
}

// Check if execution exists
if (!executionManager.hasAgent(id)) {
  // Agent completed or was stopped
  // Return buffered messages only
  const buffered = executionManager.getBufferedMessages(id)
  if (buffered.length === 0) {
    return new Response('Agent execution not found', { status: 404 })
  }

  // Stream buffered messages then close
  return new ReadableStream({
    start(controller) {
      buffered.forEach(msg => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
      })
      controller.close()
    }
  })
}
```

## Memory Management

### Message Buffer Limits

```typescript
private readonly MAX_BUFFER_SIZE = 100 // messages per agent

private addToBuffer(id: string, message: AgentMessage): void {
  let buffer = messageBuffers.get(id)
  if (!buffer) {
    buffer = []
    messageBuffers.set(id, buffer)
  }

  buffer.push(message)

  // Ring buffer: remove oldest if over limit
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.shift()
  }
}
```

### Cleanup Strategy

```typescript
// Immediate cleanup on agent stop
stopAgent(id) → delete activeExecutions, subscribers

// Delayed cleanup on agent completion
onAgentComplete(id) → setTimeout(() => {
  messageBuffers.delete(id)
  subscribers.delete(id)
}, 5 * 60 * 1000) // Keep for 5 min

// Hard limit on total agents
private readonly MAX_CONCURRENT_AGENTS = 20

startAgent(id, params) → {
  if (activeExecutions.size >= MAX_CONCURRENT_AGENTS) {
    throw new Error('Maximum concurrent agents reached')
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('AgentExecutionManager', () => {
  it('starts agent execution immediately')
  it('broadcasts messages to multiple subscribers')
  it('buffers messages for late subscribers')
  it('handles subscriber disconnect gracefully')
  it('cleans up on agent completion')
  it('prevents duplicate agent starts')
})
```

### Integration Tests

```typescript
describe('Agent Execution Flow', () => {
  it('spawns agent and starts execution')
  it('multiple stream connections see same output')
  it('late subscriber receives message history')
  it('agent continues running when all subscribers disconnect')
  it('stopped agent cannot receive new subscriptions')
})
```

### Manual Test Cases

1. **Basic Flow:**
   - Spawn agent
   - Open modal → see output
   - Close modal → agent continues
   - Reopen modal → see same output

2. **Multiple Subscribers:**
   - Spawn agent
   - Open 2 browser tabs
   - Both see same output in real-time

3. **Late Subscriber:**
   - Spawn agent
   - Wait 10 seconds
   - Open modal → see last 100 messages + live stream

4. **Stop Agent:**
   - Spawn agent
   - Click stop
   - Try to open modal → see error or final state

## Migration Path

### Phase 1: Create ExecutionManager (This Proposal)
- Implement AgentExecutionManager
- Refactor spawn endpoint
- Refactor stream endpoint
- No breaking changes to UI

### Phase 2: Add Pause/Resume (Future)
- Implement generator state storage
- True pause via generator suspension
- Resume via generator continuation

### Phase 3: Persistence (Future)
- Save execution state to disk
- Restore on server restart
- Requires serializable generator state

## Performance Considerations

### Broadcast Efficiency

```typescript
// Current: O(n) per message per agent (n = subscribers)
// Acceptable: Max 10 subscribers per agent expected

// Future optimization if needed:
// - Batch broadcasts (every 100ms)
// - Use shared buffer views (zero-copy)
```

### Memory Usage

```typescript
// Per agent:
// - Generator instance: ~1-5 KB
// - Message buffer (100 msgs × ~500 bytes): ~50 KB
// - Subscriber set: ~100 bytes/subscriber

// 20 concurrent agents × (5 KB + 50 KB) = ~1.1 MB
// Negligible memory footprint
```

### CPU Usage

```typescript
// Agent execution: CPU bound (Claude API, tool execution)
// Message broadcasting: Minimal overhead (<1% CPU)
// No optimization needed for initial implementation
```

## Security Considerations

### Agent Isolation

- Each agent has separate query generator (already isolated)
- Directory scoping enforced by SDK (already implemented)
- Tool permissions per agent (already implemented)

### Stream Authorization

**Current:** No auth (local network only via Tailscale)

**Future considerations:**
- Session tokens per stream connection
- Prevent agent ID enumeration
- Rate limit stream connections

### Resource Limits

```typescript
// Prevent resource exhaustion
const MAX_CONCURRENT_AGENTS = 20
const MAX_MESSAGE_BUFFER = 100
const CLEANUP_DELAY = 5 * 60 * 1000 // 5 min

// Reject new agents if limit reached
if (activeExecutions.size >= MAX_CONCURRENT_AGENTS) {
  throw new Error('Too many concurrent agents')
}
```

## Open Questions

1. **Q:** Should we support reconnecting to agents after server restart?
   **A:** No, out of scope. Server restart terminates all agents (acceptable for MVP).

2. **Q:** How long to keep message buffers after agent completion?
   **A:** 5 minutes (configurable). Enough for user to reconnect if needed.

3. **Q:** Should we implement backpressure if subscribers are slow?
   **A:** No, drop slow subscribers. SSE is fire-and-forget.

4. **Q:** What happens if agent execution fails before first subscriber connects?
   **A:** Messages still buffered, error state visible when subscriber connects.

## Success Metrics

- [ ] Zero duplicate agent executions
- [ ] Multiple tabs can view same agent
- [ ] Modal open/close does not affect agent execution
- [ ] Late subscribers see message history
- [ ] Memory usage remains under 10 MB for 20 agents
- [ ] No memory leaks after 100 agent spawn/complete cycles
