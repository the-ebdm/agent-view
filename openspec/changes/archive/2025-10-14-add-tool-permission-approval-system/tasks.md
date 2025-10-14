# Implementation Tasks: add-tool-permission-approval-system

## Overview

This document tracks the implementation of a complete tool permission approval workflow that allows users to grant or deny tool access to agents at runtime.

### Implementation Summary

**Status**: ~85% Complete - Core functionality implemented and ready for testing

**What's Working**:
1. ✅ **Backend API** - Endpoints for fetching and processing approval requests
2. ✅ **UI Components** - Approval drawer, agent card badges, and interactive controls
3. ✅ **SDK Integration** - Full integration with Claude Agent SDK's `canUseTool` callback
   - Agents pause execution when requesting restricted tools
   - User approvals/denials resume or abort agent execution
   - Automatic cleanup on agent termination
   - Promise-based workflow for seamless SDK integration

**How It Works**:
```
Agent requests tool → SDK calls canUseTool() → Check permissions
  ├─ Allowed → Auto-approve, agent continues
  └─ Restricted → Create approval request → UI shows drawer
                   → User approves/denies → Promise resolves → Agent continues/aborts
```

**What's Next**: Manual testing with restricted agents (Phase 4)

---

## Phase 1: Backend Foundation (COMPLETED ✓)

### Task 1.1: Extend Type Definitions (COMPLETED ✓)
- [x] Add `PendingApproval` interface to `src/types/agent.ts`
  - Fields: id, toolName, description, params, timestamp
- [x] Add `pendingApprovals` array field to `AgentSession` interface
- [x] Export `ToolName` type for type safety

**Validation**: TypeScript compiles without errors, types are available for import

### Task 1.2: Implement Session Manager Methods (COMPLETED ✓)
- [x] Add `addPendingApproval()` method to `AgentSessionManager`
  - Generate unique approval ID
  - Create `PendingApproval` record
  - Add to session's pending approvals array
  - Return approval ID
- [x] Add `getPendingApprovals()` method
  - Return array of pending approvals for given agent
- [x] Add `approveRequest()` method
  - Find and remove approval from pending list
  - Log approval action
  - Add TODO comment for SDK signal
- [x] Add `denyRequest()` method
  - Find and remove approval from pending list
  - Log deny action
  - Add TODO comment for SDK signal

**Validation**: Methods exist, handle errors appropriately, log actions correctly

### Task 1.3: Create Approvals API Endpoint (COMPLETED ✓)
- [x] Create `/api/agents/[id]/approvals/route.ts`
- [x] Implement GET handler
  - Await params destructuring (Next.js 15 requirement)
  - Check if agent exists (404 if not)
  - Call `sessionManager.getPendingApprovals()`
  - Return JSON with approvals array and count
- [x] Add error handling with try/catch
- [x] Return appropriate status codes

**Validation**:
- Endpoint returns 404 for invalid agent ID
- Returns empty array when no approvals pending
- Returns approvals array with count

### Task 1.4: Create Approval Action API Endpoint (COMPLETED ✓)
- [x] Create `/api/agents/[id]/approvals/[approvalId]/route.ts`
- [x] Define Zod schema for action validation (`approve` | `deny`)
- [x] Implement POST handler
  - Await params destructuring
  - Parse and validate request body
  - Check if agent and approval exist (404 if not)
  - Call appropriate session manager method
  - Return success response
- [x] Add comprehensive error handling

**Validation**:
- Endpoint validates action parameter
- Returns 404 for invalid agent or approval ID
- Successfully processes approve/deny actions
- Returns success response with action details

## Phase 2: UI Components (COMPLETED ✓)

### Task 2.1: Create Permission Approval Drawer Component (COMPLETED ✓)
- [x] Create `/src/components/features/permission-approval-drawer.tsx`
- [x] Implement drawer structure
  - Right-side overlay with backdrop
  - Header with warning icon and pending count
  - Scrollable content area
  - Footer with batch actions
- [x] Add approval list rendering
  - Display tool name with appropriate icon
  - Show description and timestamp
  - Render tool-specific params (file paths, commands)
  - Color-coded cards with orange theme
- [x] Implement action handlers
  - Individual approve/deny buttons
  - "Approve All" batch action
  - Loading states and error handling
- [x] Add polling mechanism
  - Fetch approvals every 2s while drawer open
  - Update approval list on changes
- [x] Handle empty state
  - Show "All Clear" message when no approvals

**Validation**:
- Drawer renders correctly on mobile and desktop
- Approvals display with correct icons and params
- Actions remove items from list immediately
- Polling updates list in real-time
- Empty state appears when list is empty

### Task 2.2: Add Notification Badge to Agent Card (COMPLETED ✓)
- [x] Update `AgentCard` component props
  - Add `onOpenApprovals` callback prop
- [x] Add approval count state
  - useState for count storage
  - useEffect for polling (every 3s)
  - Fetch from `/api/agents/${id}/approvals`
- [x] Add approval badge to status section
  - Orange pulsing badge with count
  - Conditional rendering (only when count > 0)
- [x] Add clickable approval alert
  - Orange background with border
  - Shows count and "Click to review" text
  - Calls `onOpenApprovals` on click
  - Stops event propagation to prevent card modal

**Validation**:
- Badge appears when approvals pending
- Badge count updates every 3s
- Click opens approval drawer
- Badge animates with pulse effect

### Task 2.3: Integrate Drawer into Dashboard (COMPLETED ✓)
- [x] Import `PermissionApprovalDrawer` in `ActiveAgentsDashboard`
- [x] Add state for drawer agent ID
- [x] Pass `onOpenApprovals` callback to agent cards
- [x] Render drawer conditionally
  - Pass agent ID and open state
  - Handle drawer close callback
- [x] Ensure drawer works for multiple agents
  - Each card can open its own approval drawer
  - Only one drawer open at a time

**Validation**:
- Drawer opens when clicking approval alert on any agent card
- Drawer shows correct approvals for selected agent
- Closing drawer returns to dashboard view
- Works correctly with multiple active agents

## Phase 3: SDK Integration (COMPLETED ✓)

**Core implementation complete!** The approval workflow is fully functional and ready for testing.

### Task 3.1: Research Claude Agent SDK Approval Mechanism (COMPLETED ✓)
- [x] Read Claude Agent SDK documentation for approval/permission APIs
- [x] Identify callback/promise mechanism for tool approval requests
- [x] Determine how to programmatically approve/deny tool use
- [x] Understand context provided during approval request (tool name, params)

**Findings**:
- SDK provides `canUseTool` callback in query options
- Callback receives `toolName` and `input` parameters
- Returns `{ behavior: "allow" | "deny", message?: string, updatedInput?: input }`
- Callback can be async, perfect for waiting on user approval
- Permission evaluation order: Hooks → Deny rules → Permission modes → Allow rules → canUseTool

**Validation**: ✓ SDK approval API documented in design.md

### Task 3.2: Implement canUseTool Callback in Execution Manager (COMPLETED ✓)
- [x] Update `src/lib/agent-execution-manager.ts`
- [x] Add `approvalCallbacks` Map to store Promise resolvers
- [x] Add `canUseTool` callback to query options in `runAgent()`
- [x] Check if tool is in allowed list, auto-allow if yes
- [x] Create pending approval when tool requires approval
- [x] Wait for approval using Promise pattern
- [x] Return appropriate behavior based on approval result
- [x] Add `generateDescription()` helper method
- [x] Add `waitForApproval()` helper method

**Validation**: ✓ Implemented
- canUseTool callback is invoked for every tool use
- Pending approvals are created only for restricted tools
- Agent execution pauses waiting for approval

### Task 3.3: Implement Approval Resolution Methods (COMPLETED ✓)
- [x] Add `resolveApproval()` method to `AgentExecutionManager`
  - Look up approval callback by ID
  - Resolve Promise with approved boolean
  - Clean up callback from Map
  - Log resolution
- [x] Update `approveRequest()` in `AgentSessionManager`
  - Remove approval from pending list
  - Call `executionManager.resolveApproval(approvalId, true)`
- [x] Update `denyRequest()` in `AgentSessionManager`
  - Remove approval from pending list
  - Call `executionManager.resolveApproval(approvalId, false)`
- [x] Update `stopAgent()` in `AgentExecutionManager`
  - Auto-deny all pending approvals for stopped agent
  - Clean up all approval callbacks
  - Clear pending approvals list
- [x] Update `stopAgent()` in `AgentSessionManager`
  - Auto-deny all pending approvals before stopping
  - Clear session's pending approvals array

**Validation**: ✓ Implemented
- Approving request resolves Promise with true
- Denying request resolves Promise with false
- Agent continues execution after approval
- Agent receives deny error after denial
- Stopped agents clean up all pending approvals

### Task 3.4: Add Approval State to Agent Messages (OPTIONAL ENHANCEMENT)

**Status**: Deferred - Not required for core functionality

This task would add approval requests to the message history stream for better visibility, but the approval drawer already provides this information. Can be implemented as a future enhancement if users request it.

- [x] Consider storing approval request as a special message type
  - Add `'approval_request'` to `MessageType` union
  - Display approval requests in agent output stream
- [ ] Add approval decision messages
  - Show "Approved: Write to file.txt" in message history
  - Show "Denied: Bash command 'rm -rf /'" in message history
- [ ] Update message rendering in `AgentInteractionModal`

**Validation**:
- Approval requests visible in agent message history
- Approval decisions recorded and displayed

### Task 3.5: Handle Edge Cases (OPTIONAL ENHANCEMENT)

**Status**: Partially complete - Core edge cases already handled

Most critical edge cases are already handled in Task 3.3 (agent termination cleanup). Additional polish can be added if issues arise during testing.

- [x] Agent terminated with pending approvals (✓ Implemented in Task 3.3)
  - Clear pending approvals on agent stop
  - Return error to SDK for any unresolved approvals
- [ ] Multiple approval requests for same tool
  - Queue approvals in order received (already works naturally via Promise queue)
  - Process sequentially or allow batch approval (batch approve already implemented in UI)
- [x] Approval request while drawer is closed (✓ Works via polling)
  - Badge immediately shows new count
  - Next poll updates drawer if open
- [ ] Browser refresh with pending approvals
  - In-memory approvals lost (acceptable for now)
  - Document limitation in user-facing error message

**Validation**:
- Edge cases handled gracefully without crashes
- Clear error messages for failure scenarios

## Phase 4: Testing & Polish (NOT STARTED)

### Task 4.1: Manual Testing Scenarios
- [ ] Test with read-only agent attempting file write
  - Verify approval request appears
  - Approve and verify agent continues
  - Deny and verify agent receives error
- [ ] Test with standard agent attempting restricted tool
  - Verify approval workflow for tools outside preset
- [ ] Test batch approval with multiple requests
  - Create agent with multiple approval needs
  - Use "Approve All" and verify all processed
- [ ] Test on mobile device
  - Verify drawer renders correctly
  - Test touch interactions
  - Verify badge visibility

**Validation**: All test scenarios pass successfully

### Task 4.2: Polish UI/UX
- [ ] Review approval drawer styling
  - Ensure consistent with Agent View design system
  - Verify dark mode compatibility
  - Check accessibility (keyboard navigation, screen readers)
- [ ] Add loading indicators
  - Show spinner during approval API calls
  - Disable buttons during processing
- [ ] Improve error messaging
  - User-friendly error for approval failures
  - Clear indication when agent no longer exists
- [ ] Add keyboard shortcuts (optional)
  - 'A' to approve highlighted request
  - 'D' to deny highlighted request

**Validation**:
- UI polish complete and approved by code review
- No accessibility violations in Chrome DevTools

### Task 4.3: Performance Optimization
- [ ] Review polling frequency
  - Measure network overhead
  - Adjust intervals if needed (currently 2s drawer, 3s cards)
- [ ] Add request debouncing
  - Prevent duplicate API calls during rapid approval actions
- [ ] Implement cleanup for completed approvals
  - Remove old approval records after resolution
  - Monitor memory usage during long-running agents

**Validation**:
- Performance metrics within acceptable ranges
- No memory leaks detected after 1 hour of operation

### Task 4.4: Documentation
- [ ] Add JSDoc comments to new methods
  - `addPendingApproval()`, `approveRequest()`, `denyRequest()`
  - API endpoint functions
  - React component props
- [ ] Update README if needed
  - Document permission approval workflow
  - Add screenshot of approval drawer
- [ ] Add inline code comments
  - Explain non-obvious SDK integration logic
  - Document edge case handling

**Validation**: Code is well-documented and self-explanatory

## Dependencies

- **Phase 1 → Phase 2**: API endpoints must exist before UI can consume them
- **Phase 2 → Phase 3**: UI components must exist before SDK integration can provide meaningful UX
- **Phase 3 → Phase 4**: SDK integration must work before comprehensive testing

## Parallelizable Work

- Task 1.3 and 1.4 (both API endpoints) can be built in parallel
- Task 2.1, 2.2, 2.3 (all UI components) can be built in parallel if multiple developers
- Task 4.1, 4.2, 4.3, 4.4 (testing & polish) can proceed in parallel

## Critical Path

Phase 1 (Backend) → Phase 2 (UI) → Phase 3 (SDK Integration) → Phase 4 (Testing & Polish)

The critical path runs through SDK integration (Phase 3), as it's the most complex and uncertain component.

## Current Status: ~85% Complete

- ✅ Phase 1: Backend Foundation (100% complete)
- ✅ Phase 2: UI Components (100% complete)
- ✅ Phase 3: SDK Integration (100% core features, optional enhancements deferred)
  - ✅ Task 3.1: SDK Research
  - ✅ Task 3.2: canUseTool Callback Implementation
  - ✅ Task 3.3: Approval Resolution Methods
  - ⏸️ Task 3.4: Approval Messages (optional enhancement)
  - ⏸️ Task 3.5: Additional Edge Cases (optional enhancement)
- ⏸️ Phase 4: Testing & Polish (0% complete - ready to begin)

## Implementation Notes

### Files Modified

**Core Integration**:
- `src/lib/agent-execution-manager.ts` - Added `canUseTool` callback, approval Promise management
- `src/lib/agent-session-manager.ts` - Updated approve/deny/stop methods to call execution manager

**Key Methods Added**:
- `AgentExecutionManager.waitForApproval()` - Creates Promise that pauses agent
- `AgentExecutionManager.resolveApproval()` - Resolves Promise to resume agent
- `AgentExecutionManager.generateDescription()` - Creates human-readable approval descriptions

### Testing Recommendations

To verify the implementation:

1. **Create read-only agent** - Set tool permissions to "read-only" preset
2. **Request restricted action** - Ask agent to write a file or run a bash command
3. **Verify approval flow**:
   - Agent card shows orange approval badge
   - Clicking badge opens approval drawer
   - Approval shows tool name, description, and parameters
   - Approving request allows agent to continue
   - Denying request sends error to agent
4. **Test edge cases**:
   - Stop agent with pending approvals (should auto-deny)
   - Multiple approvals (should queue naturally)
   - Batch approve all

### Known Limitations

- Pending approvals are stored in-memory only (lost on server restart)
- Approval requests not visible in agent message history (optional enhancement)
- No approval timeout mechanism (agents wait indefinitely)

These limitations are acceptable for the initial implementation and can be addressed in future iterations if needed.
