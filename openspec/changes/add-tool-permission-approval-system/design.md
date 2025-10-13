# Design Document: Tool Permission Approval System

## Architecture Overview

The tool permission approval system consists of four layers:

```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer                            │
│  - PermissionApprovalDrawer                            │
│  - AgentCard (badges & alerts)                         │
│  - ActiveAgentsDashboard (drawer management)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP Polling (2-3s)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   API Layer                             │
│  GET  /api/agents/[id]/approvals                       │
│  POST /api/agents/[id]/approvals/[approvalId]          │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Function Calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Session Manager Layer                      │
│  - AgentSessionManager                                 │
│    - addPendingApproval()                              │
│    - getPendingApprovals()                             │
│    - approveRequest()                                  │
│    - denyRequest()                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Callback/Promise Resolution
                     ▼
┌─────────────────────────────────────────────────────────┐
│               SDK Integration Layer                     │
│  - Stream Handler (detect approval requests)           │
│  - Execution Manager (approval callback mapping)       │
│  - Claude Agent SDK (pause/resume execution)          │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Approval Request Creation

```
Agent Execution
  ↓
Claude SDK detects restricted tool use
  ↓
SDK emits approval request event/callback
  ↓
Stream Handler intercepts event
  ↓
sessionManager.addPendingApproval(agentId, toolName, description, params)
  ↓
PendingApproval record created in memory
  ↓
Approval ID mapped to SDK promise/callback
```

### 2. Approval Display

```
AgentCard renders
  ↓
useEffect polls /api/agents/{id}/approvals every 3s
  ↓
API returns { approvals: [...], count: N }
  ↓
AgentCard updates badge and alert
  ↓
User clicks alert
  ↓
Dashboard opens PermissionApprovalDrawer
  ↓
Drawer polls /api/agents/{id}/approvals every 2s
  ↓
Drawer renders approval cards
```

### 3. Approval Processing

```
User clicks "Approve" button
  ↓
POST /api/agents/{id}/approvals/{approvalId} { action: "approve" }
  ↓
API validates request
  ↓
sessionManager.approveRequest(agentId, approvalId)
  ↓
Look up SDK promise/callback by approval ID
  ↓
Resolve promise or call callback with approval signal
  ↓
Remove approval from pending list
  ↓
Remove approval ID mapping
  ↓
SDK resumes agent execution with tool use
  ↓
UI removes approval card from drawer
```

## Component Diagrams

### Session Manager Data Structure

```typescript
class AgentSessionManager {
  private sessions: Map<string, AgentSession>;
  private approvalCallbacks: Map<string, ApprovalCallback>; // NEW

  // AgentSession structure
  {
    id: string;
    name: string;
    ...
    pendingApprovals: PendingApproval[]; // NEW
  }

  // PendingApproval structure
  {
    id: string;                    // "approval_1234567890_abc123"
    toolName: ToolName;            // "Write" | "Edit" | "Bash" | ...
    description: string;           // "Write to docs/analysis/dead-code.md"
    params: Record<string, unknown>; // { file_path: "/path/to/file" }
    timestamp: number;             // Unix timestamp
  }

  // ApprovalCallback structure (to be designed)
  {
    approvalId: string;
    agentId: string;
    resolve: (approved: boolean) => void;  // Promise resolver
    timeout?: NodeJS.Timeout;              // Optional timeout
  }
}
```

### UI Component Hierarchy

```
ActiveAgentsDashboard
├── AgentCard (for each agent)
│   ├── Badge (approval count, if > 0)
│   ├── ApprovalAlert (clickable, if > 0)
│   └── onOpenApprovals → sets drawerAgentId
└── PermissionApprovalDrawer (conditional)
    ├── Header (count, close button)
    ├── Content (scrollable)
    │   ├── ApprovalCard (for each approval)
    │   │   ├── Icon (tool-specific)
    │   │   ├── Description
    │   │   ├── Params (file_path, command, etc.)
    │   │   ├── Timestamp
    │   │   └── Actions (Approve, Deny buttons)
    │   └── EmptyState (when no approvals)
    └── Footer (Approve All, Close buttons)
```

## SDK Integration Strategy

### Current Understanding

The Claude Agent SDK likely provides one of these patterns:

1. **Event-based**: SDK emits events that can be subscribed to
2. **Callback-based**: SDK accepts approval handler function during initialization
3. **Promise-based**: Tool use returns a promise that can be intercepted
4. **Middleware pattern**: SDK allows middleware to intercept tool calls

### Proposed Integration Approach

**Phase 1: Research** (2-3 hours)
- Review `@anthropic-ai/claude-agent-sdk` source code or documentation
- Identify approval mechanism (likely in tool execution layer)
- Create minimal test case to trigger approval request
- Document SDK API surface for approvals

**Phase 2: Implement Interceptor** (2-3 hours)

```typescript
// Option A: Event-based (if SDK emits events)
agentQuery.on('approval_required', (event) => {
  const approvalId = sessionManager.addPendingApproval(
    agentId,
    event.toolName,
    event.description,
    event.params
  );

  // Store resolver for later use
  approvalCallbacks.set(approvalId, {
    agentId,
    resolve: event.resolve, // SDK provides resolver
  });
});

// Option B: Callback-based (if SDK accepts handler)
const agentQuery = query({
  prompt,
  options: {
    cwd: directory,
    allowedTools,
    onApprovalRequired: async (toolName, params) => {
      const approvalId = sessionManager.addPendingApproval(
        agentId,
        toolName,
        `Use ${toolName}`,
        params
      );

      // Return promise that resolves when user approves/denies
      return new Promise((resolve) => {
        approvalCallbacks.set(approvalId, { agentId, resolve });
      });
    }
  }
});

// Option C: Wrapper/Proxy pattern (if no built-in support)
const originalToolExecutor = sdk.executeTool;
sdk.executeTool = async (toolName, params) => {
  if (!isToolAllowed(toolName, agent.permissions)) {
    const approvalId = sessionManager.addPendingApproval(
      agentId,
      toolName,
      `Use ${toolName}`,
      params
    );

    const approved = await waitForApproval(approvalId);
    if (!approved) {
      throw new Error('Tool use denied by user');
    }
  }

  return originalToolExecutor(toolName, params);
};
```

**Phase 3: Implement Resolution** (1-2 hours)

```typescript
class AgentSessionManager {
  private approvalCallbacks = new Map<string, ApprovalCallback>();

  approveRequest(agentId: string, approvalId: string): void {
    const session = this.sessions.get(agentId);
    if (!session || !session.pendingApprovals) {
      throw new Error('Agent or approval not found');
    }

    // Remove from pending
    const approvalIndex = session.pendingApprovals.findIndex(a => a.id === approvalId);
    if (approvalIndex === -1) {
      throw new Error('Approval not found');
    }
    session.pendingApprovals.splice(approvalIndex, 1);

    // Resolve SDK callback
    const callback = this.approvalCallbacks.get(approvalId);
    if (callback) {
      callback.resolve(true); // Signal approval
      this.approvalCallbacks.delete(approvalId);
    }

    console.log(`[SessionManager] Approved request ${approvalId} for agent ${agentId}`);
  }

  denyRequest(agentId: string, approvalId: string): void {
    // Similar to approveRequest but resolve(false)
    const session = this.sessions.get(agentId);
    if (!session || !session.pendingApprovals) {
      throw new Error('Agent or approval not found');
    }

    const approvalIndex = session.pendingApprovals.findIndex(a => a.id === approvalId);
    if (approvalIndex === -1) {
      throw new Error('Approval not found');
    }
    session.pendingApprovals.splice(approvalIndex, 1);

    const callback = this.approvalCallbacks.get(approvalId);
    if (callback) {
      callback.resolve(false); // Signal denial
      this.approvalCallbacks.delete(approvalId);
    }

    console.log(`[SessionManager] Denied request ${approvalId} for agent ${agentId}`);
  }
}
```

### Edge Cases & Error Handling

1. **Agent terminated with pending approvals**
   - On `stopAgent()`, iterate pending approvals and auto-deny all
   - Clean up approval callbacks to prevent memory leaks
   - Log termination with pending approvals count

2. **Approval timeout** (optional enhancement)
   - Add `timeout` field to `ApprovalCallback`
   - Set timeout when creating approval (e.g., 5 minutes)
   - Auto-deny on timeout and notify user
   - Clear timeout on manual approval/denial

3. **Multiple approvals for same tool**
   - Queue approvals in order received
   - Show all in drawer with distinct IDs
   - Process independently (no deduplication)

4. **Browser refresh with pending approvals**
   - In-memory state lost (acceptable limitation)
   - SDK will error or timeout
   - Document behavior: "Refreshing loses pending approvals"

5. **Concurrent approval from multiple UI sessions**
   - Race condition: both could approve same request
   - Handle 404 gracefully in UI (approval already processed)
   - Show toast: "Approval already processed"

## Performance Considerations

### Polling Overhead

**Current**:
- Agent cards poll every 3s
- Drawer polls every 2s
- Each poll = 1 HTTP request (lightweight JSON response)

**Impact**:
- 10 agents × 20 polls/min = 200 requests/min
- ~3-4 requests/sec at peak
- Negligible load for local server

**Future Optimization**:
- Use WebSocket for real-time push (Phase 5)
- Reduces polling overhead to zero
- Better for scaling to 20+ concurrent agents

### Memory Usage

**Per Approval**:
- ~1KB for `PendingApproval` record
- ~500 bytes for approval callback mapping
- Total: ~1.5KB per pending approval

**Worst Case**:
- 10 agents × 5 pending approvals = 75KB
- Negligible for Node.js process
- Cleanup on approval resolution prevents accumulation

### API Response Time

**Target**: < 200ms for all approval endpoints

**GET `/api/agents/{id}/approvals`**:
- Memory lookup: < 1ms
- JSON serialization: < 5ms
- Total: < 10ms (well under target)

**POST `/api/agents/{id}/approvals/{approvalId}`**:
- Memory lookup + modification: < 1ms
- Callback resolution: < 1ms
- JSON response: < 5ms
- Total: < 10ms (well under target)

## Security Considerations

### Approval Hijacking

**Threat**: Malicious user approves/denies another user's agent

**Mitigation** (future):
- Add session-based authentication
- Verify approval ownership before processing
- For now: single-user application (no mitigation needed)

### Permission Escalation

**Threat**: Agent bypasses permissions through approval

**Current Behavior**: By design - approvals are permission escalation mechanism

**Mitigation**:
- Show clear warning for dangerous tools (Bash, Write system files)
- Add optional approval rules (e.g., never allow `rm -rf`)
- Consider approval audit log

### Tool Parameter Injection

**Threat**: Agent requests approval with malicious parameters

**Mitigation**:
- Display full parameters in approval drawer
- Truncate long parameters with "show more" option
- Highlight suspicious patterns (e.g., shell injection attempts)
- User makes final decision

## Testing Strategy

### Unit Tests (Future)

```typescript
describe('AgentSessionManager approval methods', () => {
  it('should create pending approval with unique ID', () => {
    const id = manager.addPendingApproval(agentId, 'Write', 'desc', {});
    expect(id).toMatch(/^approval_\d+_[a-z0-9]+$/);
  });

  it('should retrieve pending approvals for agent', () => {
    manager.addPendingApproval(agentId, 'Write', 'desc', {});
    const approvals = manager.getPendingApprovals(agentId);
    expect(approvals).toHaveLength(1);
  });

  it('should remove approval on approve', () => {
    const id = manager.addPendingApproval(agentId, 'Write', 'desc', {});
    manager.approveRequest(agentId, id);
    expect(manager.getPendingApprovals(agentId)).toHaveLength(0);
  });

  // ... more tests
});
```

### Integration Tests (Future)

```typescript
describe('Approval API endpoints', () => {
  it('should return pending approvals', async () => {
    const response = await fetch(`/api/agents/${agentId}/approvals`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('approvals');
    expect(data).toHaveProperty('count');
  });

  it('should process approval action', async () => {
    const response = await fetch(
      `/api/agents/${agentId}/approvals/${approvalId}`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      }
    );
    expect(response.status).toBe(200);
  });

  // ... more tests
});
```

### Manual Testing Checklist

See tasks.md Task 4.1 for comprehensive manual testing scenarios.

## Migration & Rollout

### Phase 1: Backend + UI (COMPLETED)
- No migration needed (new feature)
- No breaking changes to existing APIs
- Safe to deploy immediately

### Phase 2: SDK Integration (PENDING)
- Requires SDK research and implementation
- May need SDK version upgrade
- Test thoroughly with restricted agents

### Phase 3: Production Rollout (FUTURE)
- Deploy to local development server first
- Monitor for approval workflow issues
- Gather user feedback on UX
- Consider approval timeout configuration

## Future Enhancements

### Approval History & Audit Log

Track all approval decisions for debugging and security:

```typescript
interface ApprovalAuditEntry {
  approvalId: string;
  agentId: string;
  toolName: string;
  action: 'approve' | 'deny' | 'timeout';
  timestamp: number;
  userId?: string; // for multi-user future
}
```

### Approval Rules Engine

Allow users to define approval rules:

```typescript
interface ApprovalRule {
  id: string;
  condition: {
    toolName?: string;
    paramPattern?: RegExp;
    agentName?: string;
  };
  action: 'auto_approve' | 'auto_deny' | 'require_approval';
}

// Example: Auto-approve Read operations
{
  condition: { toolName: 'Read' },
  action: 'auto_approve'
}

// Example: Always deny dangerous Bash commands
{
  condition: {
    toolName: 'Bash',
    paramPattern: /rm\s+-rf\s+\//
  },
  action: 'auto_deny'
}
```

### WebSocket Push Notifications

Replace polling with real-time push:

```typescript
// Server-side
io.to(`agent-${agentId}`).emit('approval_required', {
  approvalId,
  toolName,
  description,
  params,
});

// Client-side
socket.on('approval_required', (data) => {
  setApprovals(prev => [...prev, data]);
});
```

### Mobile Push Notifications

For true remote monitoring:
- Integrate with mobile push notification service
- Send notification when approval required
- Deep link to approval drawer
- Consider privacy implications

## Open Questions & Decisions

### 1. SDK Integration Mechanism

**Question**: How does the Claude Agent SDK handle approval requests?

**Options**:
- A) Event emitter pattern
- B) Callback function during initialization
- C) Promise/async-await pattern
- D) No built-in support (requires wrapper)

**Decision**: TO BE DETERMINED after SDK research (Task 3.1)

### 2. Approval Timeout

**Question**: Should approvals auto-expire after timeout?

**Decision**: NOT IN SCOPE for initial implementation
- Add as Phase 5 enhancement if users request it
- Configurable timeout (default: never)
- Log timeout events for debugging

### 3. Approval Persistence

**Question**: Should pending approvals persist across server restarts?

**Decision**: NO for initial implementation
- In-memory only (acceptable for local dev server)
- Document limitation clearly
- Add database persistence in Phase 4 if needed

### 4. Multi-Agent Approval View

**Question**: Should drawer show approvals for all agents or one at a time?

**Decision**: ONE AGENT AT A TIME (current implementation)
- Simpler UX for initial release
- Consistent with per-agent actions
- Consider global view in Phase 5 if users need it

## Conclusion

This design provides a comprehensive, layered approach to tool permission approvals. The current implementation (Phases 1-2: Backend + UI) is complete and functional. The remaining work focuses on SDK integration, which requires research into the Claude Agent SDK's approval mechanism. Once SDK integration is complete, the system will provide a full end-to-end approval workflow that enhances user control and visibility into agent behavior.
