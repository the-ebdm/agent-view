# Change Proposal: add-tool-permission-approval-system

## Problem Statement

When agents have restricted tool permissions (read-only or standard), they may encounter situations where they need to use a tool that's outside their granted permissions (e.g., Write, Edit, Bash). Currently, the Claude Agent SDK pauses execution and waits for approval, but Agent View has no mechanism to display these approval requests to users or allow them to approve/deny tool use.

This creates a poor user experience where:
- Agents appear "stuck" with no visible indication why
- Users cannot see what permission is being requested
- Users cannot approve or deny the request through the UI
- Agents remain blocked indefinitely until manually killed

### Current State

Agent View implements tool permissions with three presets:
- **read-only**: Only Read, Grep, Glob, WebFetch, WebSearch
- **standard**: Read + Write, Edit, Bash (common development tools)
- **full-access**: All available tools
- **custom**: User-defined tool list

When an agent with read-only permission tries to write a file, the SDK pauses execution but the approval request is invisible to the user.

### Desired State

Users should be able to:
1. See a visual indicator when agents have pending approval requests
2. View details of what tool and operation is being requested
3. Approve or deny individual permission requests
4. Batch approve multiple requests if needed
5. Have the agent continue or abort execution based on their decision

## Solution Overview

Implement a complete tool permission approval workflow with:

1. **Backend Tracking**: Store pending approval requests in agent session state
2. **API Endpoints**: Provide endpoints to fetch and process approval requests
3. **UI Components**: Build an approval drawer that displays pending requests with contextual information
4. **Real-time Updates**: Poll for new approval requests and update UI indicators
5. **SDK Integration**: Connect approval workflow to Claude Agent SDK's approval mechanism

## Scope

### In Scope

- Pending approval tracking in session manager
- API endpoints for fetching and processing approvals
- Permission approval drawer UI component
- Notification badges on agent cards showing pending approval count
- Approve/deny individual requests
- Batch "approve all" functionality
- Real-time polling for approval updates
- Integration hooks for SDK approval callbacks

### Out of Scope

- Approval history/audit log (future enhancement)
- Approval rules/automation (e.g., auto-approve certain patterns)
- Approval timeout mechanisms
- Multi-user approval workflows
- Approval notifications via external channels (email, SMS, etc.)

## Impact Assessment

### User Experience

**Positive Impact:**
- Clear visibility into why agents are paused
- Control over agent tool usage in real-time
- Better understanding of agent behavior and tool requirements
- Reduced frustration from "stuck" agents

**Potential Concerns:**
- Additional interaction required from users (mitigated by batch approval)
- Mobile UI needs to accommodate approval drawer

### Technical

**Benefits:**
- Extends existing permission system with user control
- Reuses polling infrastructure (consistent with current patterns)
- Clean separation between tracking, API, and UI layers

**Risks:**
- SDK integration complexity (approval callback mechanism unclear)
- Race conditions between approval and agent execution
- Memory growth if approvals accumulate without resolution

### Performance

**Expected Impact:**
- Minimal: Polling adds ~100ms/request per agent every 3s
- Approval state adds ~1KB per pending request to session memory
- No impact when agents run with full permissions

## Dependencies

- **Claude Agent SDK**: Requires understanding of SDK approval callback mechanism
- **Existing Permission System**: Builds on Phase 2 tool permissions
- **Polling Infrastructure**: Reuses existing agent status polling pattern
- **Session Manager**: Extends existing session state management

## Alternatives Considered

### Alternative 1: Modal Instead of Drawer

**Pros:**
- More prominent, harder to miss
- Consistent with existing modal patterns

**Cons:**
- Blocks view of agent output
- Less suitable for mobile (limited screen space)
- Cannot easily view multiple agents' approvals

**Decision**: Use drawer for better multi-agent support and non-blocking UI

### Alternative 2: Push Notifications via WebSocket

**Pros:**
- Instant notification without polling
- More efficient for infrequent approvals

**Cons:**
- Requires WebSocket infrastructure (not yet implemented)
- Additional complexity for connection management
- Overkill for current scale (few agents, 3s polling is acceptable)

**Decision**: Use polling for consistency with existing patterns, can migrate to WebSocket later

### Alternative 3: Auto-approve After Timeout

**Pros:**
- Prevents indefinite agent blocking
- Better for unattended operation

**Cons:**
- Security risk (auto-escalating permissions)
- Goes against explicit permission model
- Complex timeout configuration

**Decision**: Require explicit approval, add timeout as future enhancement if needed

## Success Criteria

### Functional

- [ ] Users can see pending approval count on agent cards
- [ ] Users can open approval drawer for any agent with pending requests
- [ ] Users can view tool name, description, and parameters for each request
- [ ] Users can approve individual requests
- [ ] Users can deny individual requests
- [ ] Users can batch approve all pending requests
- [ ] Approval/denial removes request from pending list
- [ ] Agent continues execution after approval (SDK integration)
- [ ] Agent receives error/skip after denial (SDK integration)

### Non-Functional

- [ ] Approval UI updates within 3 seconds of new request
- [ ] Drawer renders correctly on mobile and desktop
- [ ] No memory leaks from accumulated approval state
- [ ] API endpoints return within 200ms
- [ ] UI remains responsive during approval processing

## Timeline Estimate

- **Backend (Session + API)**: 2-3 hours (COMPLETED ✓)
- **UI Components**: 3-4 hours (COMPLETED ✓)
- **SDK Integration**: 4-6 hours (COMPLETED ✓)
- **Testing & Polish**: 2-3 hours (NOT STARTED)

**Total**: 11-16 hours

**Status**: ~85% complete (Backend + UI + SDK integration done, testing pending)

## Open Questions

### 1. SDK Approval Mechanism (RESOLVED ✓)

**Question**: What is the exact API for hooking into the Claude Agent SDK's approval flow?

**Answer**: The SDK provides a `canUseTool` callback in query options:

```typescript
canUseTool: async (toolName: string, input: Record<string, unknown>) => {
  return { behavior: "allow" | "deny", message?: string }
}
```

**Implementation Plan**:
- Add `canUseTool` callback to `query()` options in execution manager
- Check if tool is in allowed list, auto-allow if yes
- For restricted tools, create pending approval and wait on Promise
- Resolve Promise when user approves/denies
- Return appropriate behavior to SDK

### 2. Approval Request Creation (RESOLVED ✓)

**Question**: When/how should approval records be created?

**Answer**: Inside the `canUseTool` callback when a restricted tool is requested:

1. SDK calls `canUseTool(toolName, input)`
2. We check if tool is in allowed list
3. If not allowed, call `sessionManager.addPendingApproval()`
4. Store Promise resolver in execution manager
5. Wait for user approval via Promise
6. Resolve Promise when API endpoint processes approval

### 3. Multi-Agent Conflicts (DECIDED)

**Question**: How to handle when multiple agents have pending approvals?

**Decision**: Keep per-agent drawer approach
- Each agent card shows its own approval count
- Drawer opens for specific agent when clicked
- Simpler UX for initial implementation
- Consider global approval view in future enhancement

**Rationale**: Better for mobile (less cluttered), clearer ownership of approvals, consistent with per-agent actions

### 4. Approval Persistence (DECIDED)

**Question**: Should pending approvals persist across server restarts?

**Decision**: In-memory only for initial implementation
- Acceptable for local development server
- Avoids database complexity
- Document limitation clearly to users
- Add database persistence in future if users request it

**Rationale**: Simpler initial implementation, low impact (restarts are rare), can add later if needed

## Notes

This proposal documents the permission approval system that has been partially implemented. The backend tracking and UI components are complete and functional. The remaining work focuses on integrating with the Claude Agent SDK's approval mechanism to actually pause/resume agent execution based on user decisions.

The implementation follows Agent View's conventions:
- REST API endpoints under `/api/agents/[id]/approvals`
- Polling-based updates (3s interval for agent cards, 2s for drawer)
- Component composition (drawer, card badges, dashboard integration)
- Tailwind CSS styling with mobile-first responsive design
