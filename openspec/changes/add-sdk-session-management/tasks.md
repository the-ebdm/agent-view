# Implementation Tasks

## 1. Database Schema & Infrastructure

- [ ] 1.1 Add `session_id TEXT` column to agents table (nullable)
- [ ] 1.2 Create index on `session_id` column for fast lookups
- [ ] 1.3 Test database migration with existing agents (verify NULL handling)
- [ ] 1.4 Update `AgentsRepository.create()` to accept and store session_id
- [ ] 1.5 Update `AgentsRepository.update()` to handle session_id updates
- [ ] 1.6 Update `AgentsRepository.findById()` to return session_id

## 2. Type System Updates

- [ ] 2.1 Add `sessionId?: string` to `AgentSession` interface in `src/types/agent.ts`
- [ ] 2.2 Add `sessionId?: string` to `AgentHistoryItem` interface
- [ ] 2.3 Update `AgentWithMetrics` type if needed
- [ ] 2.4 Verify TypeScript compilation with new fields

## 3. SDK Session Metadata Extraction

- [ ] 3.1 Update `src/lib/agent-sdk/stream-handler.ts` to detect system/init messages
- [ ] 3.2 Extract `session_id` from init message data structure
- [ ] 3.3 Return session metadata separately from regular messages (yield metadata object)
- [ ] 3.4 Handle missing/malformed session_id gracefully (log warning, continue)
- [ ] 3.5 Add logging for session_id extraction (debug level)
- [ ] 3.6 Test with real SDK queries to verify message format

## 4. Execution Manager Session Capture

- [ ] 4.1 Update `AgentExecutionManager.runAgent()` to listen for session metadata
- [ ] 4.2 Call `sessionManager.updateSessionId(agentId, sessionId)` when received
- [ ] 4.3 Handle case where session_id arrives after agent already started
- [ ] 4.4 Add logging for session capture events
- [ ] 4.5 Test session capture with multiple concurrent agents

## 5. Session Manager Updates

- [ ] 5.1 Add `updateSessionId(id: string, sessionId: string)` method to `AgentSessionManager`
- [ ] 5.2 Update in-memory session with sessionId field
- [ ] 5.3 Persist sessionId to database via `AgentsRepository.update()`
- [ ] 5.4 Update `createSession()` to accept optional sessionId parameter
- [ ] 5.5 Handle NULL sessionId gracefully in all methods
- [ ] 5.6 Update session hydration to load sessionId from database

## 6. SDK Client Resume & Fork Functions

- [ ] 6.1 Create `src/lib/agent-sdk/client.ts` if not exists
- [ ] 6.2 Add `resumeAgent(sessionId, prompt, options)` function
- [ ] 6.3 Add `forkAgent(sessionId, prompt, options)` function with `forkSession: true`
- [ ] 6.4 Add error handling for invalid/expired session IDs
- [ ] 6.5 Add TypeScript types for resume/fork parameters
- [ ] 6.6 Test resume and fork with real SDK

## 7. Reply API Endpoint

- [ ] 7.1 Create `src/app/api/agents/[id]/reply/route.ts`
- [ ] 7.2 Validate request body schema (message: string, required)
- [ ] 7.3 Load agent from session manager and verify session_id exists
- [ ] 7.4 Return 400 if agent has no session_id
- [ ] 7.5 Create new agent with "{originalName} (reply)" naming
- [ ] 7.6 Call SDK with `resume: session_id` and provided message
- [ ] 7.7 Start execution via execution manager
- [ ] 7.8 Return new agent info (id, name, status)
- [ ] 7.9 Add error handling for SDK errors
- [ ] 7.10 Test with running, completed, and paused agents

## 8. Fork API Endpoint

- [ ] 8.1 Create `src/app/api/agents/[id]/fork/route.ts`
- [ ] 8.2 Validate request body schema (prompt: string, name?: string)
- [ ] 8.3 Load agent from session manager and verify session_id exists
- [ ] 8.4 Return 400 if agent has no session_id
- [ ] 8.5 Generate unique name if not provided (use "{originalName} (fork)" or auto-generate)
- [ ] 8.6 Call SDK with `resume: session_id` and `forkSession: true`
- [ ] 8.7 Start execution via execution manager
- [ ] 8.8 Return new agent info with new session_id
- [ ] 8.9 Test fork from running and historical agents
- [ ] 8.10 Test multiple forks from same parent

## 9. Pause/Resume Refactor

- [ ] 9.1 Update `AgentExecutionManager.stopAgent()` to accept `permanent: boolean` parameter
- [ ] 9.2 When `permanent=false`, preserve agent's session_id and set lifecycleState='paused'
- [ ] 9.3 Update `POST /api/agents/[id]/pause` to call `stopAgent(id, false)`
- [ ] 9.4 Update `AgentSessionManager.pauseAgent()` to verify session_id exists
- [ ] 9.5 Add 30-second timeout for graceful shutdown on pause
- [ ] 9.6 Update `POST /api/agents/[id]/resume` to use SDK session resumption
- [ ] 9.7 Create new SDK query with `resume: session_id` in resume endpoint
- [ ] 9.8 Start new execution via execution manager on resume
- [ ] 9.9 Clear pausedTime and set lifecycleState='running' on resume
- [ ] 9.10 Test pause/resume cycle preserves conversation context
- [ ] 9.11 Test resume after server restart (load from DB)
- [ ] 9.12 Handle session expiration errors gracefully

## 10. UI - Reply Interface

- [ ] 10.1 Create `src/components/features/agent-reply.tsx` component
- [ ] 10.2 Add text input with submit button and keyboard shortcuts (Cmd+Enter)
- [ ] 10.3 Add "Reply" button to agent card for agents with session_id
- [ ] 10.4 Show reply interface inline in agent output view
- [ ] 10.5 Disable reply UI for agents without session_id (show tooltip explaining why)
- [ ] 10.6 Show loading state while reply is being processed
- [ ] 10.7 Redirect to new agent after successful reply
- [ ] 10.8 Display error messages for failed replies
- [ ] 10.9 Test reply UI on mobile and desktop

## 11. UI - Fork Interface

- [ ] 11.1 Add "Fork" button to agent card context menu
- [ ] 11.2 Create fork modal/dialog with prompt input and name input (optional)
- [ ] 11.3 Show "Forked from {parentName}" indicator on forked agents
- [ ] 11.4 Disable fork button for agents without session_id
- [ ] 11.5 Show loading state while fork is being created
- [ ] 11.6 Redirect to new forked agent after successful fork
- [ ] 11.7 Display error messages for failed forks
- [ ] 11.8 Test fork UI workflow end-to-end

## 12. UI - Session Indicators

- [ ] 12.1 Add session status badge to agent cards showing "Session Available" or "No Session"
- [ ] 12.2 Show session_id in agent detail/info panel (with copy-to-clipboard button)
- [ ] 12.3 Update pause/resume button states based on session availability
- [ ] 12.4 Add tooltips explaining session-dependent features
- [ ] 12.5 Style session indicators consistently across UI

## 13. Testing & Validation

- [ ] 13.1 Test session_id capture with multiple concurrent agents
- [ ] 13.2 Test reply to running agent (continues conversation)
- [ ] 13.3 Test reply to completed agent (extends from end)
- [ ] 13.4 Test fork from running agent (independent branches)
- [ ] 13.5 Test fork from historical agent
- [ ] 13.6 Test multiple forks from same parent (verify independence)
- [ ] 13.7 Test pause/resume with session resumption (verify context preserved)
- [ ] 13.8 Test resume after server restart (load paused agents from DB)
- [ ] 13.9 Test legacy agents without session_id (verify graceful degradation)
- [ ] 13.10 Test session expiration handling (when SDK returns expired session error)
- [ ] 13.11 Performance test: session_id lookups with index vs without
- [ ] 13.12 Stress test: 20 concurrent agents with session capture

## 14. Documentation & Cleanup

- [ ] 14.1 Update `docs/ARCHITECTURE.md` with session management architecture
- [ ] 14.2 Document pause/resume implementation approach
- [ ] 14.3 Document reply and fork workflows with examples
- [ ] 14.4 Update `CLAUDE.md` with session management features
- [ ] 14.5 Add API endpoint documentation for reply and fork
- [ ] 14.6 Add code comments explaining session capture flow
- [ ] 14.7 Update database schema documentation
- [ ] 14.8 Run `openspec validate add-sdk-session-management --strict` and resolve issues
- [ ] 14.9 Archive change proposal when complete
