# Implementation Tasks: Fix Agent Execution Flow

## 1. Create AgentExecutionManager

- [ ] 1.1 Create `src/lib/agent-execution-manager.ts`
- [ ] 1.2 Implement `AgentExecutionManager` class with private maps (activeExecutions, messageBuffers, subscribers)
- [ ] 1.3 Implement `startAgent(id, params)` method to start background execution
- [ ] 1.4 Implement `subscribe(id, controller)` method to add stream subscriber
- [ ] 1.5 Implement `unsubscribe(id, controller)` method to remove stream subscriber
- [ ] 1.6 Implement `broadcastMessage(id, message)` private method for pub/sub
- [ ] 1.7 Implement `getBufferedMessages(id)` method for late subscribers
- [ ] 1.8 Implement `hasAgent(id)` method to check if agent is running
- [ ] 1.9 Implement `stopAgent(id)` method to gracefully stop execution
- [ ] 1.10 Create singleton instance with hot-reload preservation

## 2. Background Agent Execution

- [ ] 2.1 Implement `runAgent(id, params)` private async method
- [ ] 2.2 Create query generator with proper tool permissions
- [ ] 2.3 Stream messages in background using for-await loop
- [ ] 2.4 Broadcast each message to subscribers via `broadcastMessage()`
- [ ] 2.5 Add messages to buffer (ring buffer, max 100 messages)
- [ ] 2.6 Send messages to sessionManager for persistence
- [ ] 2.7 Handle agent completion (result message type)
- [ ] 2.8 Handle agent errors (error message type)
- [ ] 2.9 Clean up execution on completion/error
- [ ] 2.10 Implement cleanup delay (keep buffers for 5 minutes after completion)

## 3. Message Broadcasting

- [ ] 3.1 Implement message buffer as ring buffer (FIFO, max 100 items)
- [ ] 3.2 Add error handling for failed subscriber sends
- [ ] 3.3 Remove disconnected subscribers automatically
- [ ] 3.4 Add message encoding (TextEncoder for SSE format)
- [ ] 3.5 Implement proper SSE formatting (`data: ${JSON.stringify(msg)}\n\n`)

## 4. Refactor Spawn Endpoint

- [ ] 4.1 Update `/api/agents/spawn/route.ts`
- [ ] 4.2 Import `executionManager` singleton
- [ ] 4.3 After `sessionManager.createSession()`, call `executionManager.startAgent()`
- [ ] 4.4 Pass prompt, directory, and toolPermissions to `startAgent()`
- [ ] 4.5 Remove old `spawnAgent()` call that doesn't start execution
- [ ] 4.6 Return response immediately (don't await agent completion)
- [ ] 4.7 Add error handling if execution manager fails to start

## 5. Refactor Stream Endpoint

- [ ] 5.1 Update `/api/agents/[id]/stream/route.ts`
- [ ] 5.2 Import `executionManager` singleton
- [ ] 5.3 Remove `getAgentQueryInstance()` call
- [ ] 5.4 Remove `streamAgentMessages()` call
- [ ] 5.5 Check if agent exists with `executionManager.hasAgent(id)`
- [ ] 5.6 In `ReadableStream.start()`, subscribe with `executionManager.subscribe(id, controller)`
- [ ] 5.7 Send buffered messages first using `getBufferedMessages(id)`
- [ ] 5.8 Live messages arrive automatically via broadcast
- [ ] 5.9 In `ReadableStream.cancel()`, unsubscribe with `executionManager.unsubscribe(id, controller)`
- [ ] 5.10 Handle case where agent execution doesn't exist (return buffered only or 404)

## 6. Update Stop Endpoint

- [ ] 6.1 Update `/api/agents/[id]/stop/route.ts`
- [ ] 6.2 Import `executionManager` singleton
- [ ] 6.3 Call `executionManager.stopAgent(id)` to gracefully stop generator
- [ ] 6.4 Keep existing `sessionManager.stopAgent(id)` call for metadata update
- [ ] 6.5 Add error handling if agent not found

## 7. Cleanup Old Code

- [ ] 7.1 Mark `spawnAgent()` in `src/lib/agent-sdk/client.ts` as deprecated
- [ ] 7.2 Mark `getAgentQueryInstance()` in `src/lib/agent-sdk/client.ts` as deprecated
- [ ] 7.3 Add deprecation comments explaining new execution manager pattern
- [ ] 7.4 Keep functions for backward compatibility but unused

## 8. Error Handling

- [ ] 8.1 Handle execution start failures (broadcast error message)
- [ ] 8.2 Handle subscriber send failures (remove dead subscribers)
- [ ] 8.3 Handle agent not found in stream endpoint (404 or buffered messages)
- [ ] 8.4 Handle maximum concurrent agents limit (reject with error)
- [ ] 8.5 Add try/catch around broadcast operations

## 9. Resource Management

- [ ] 9.1 Implement MAX_CONCURRENT_AGENTS limit (default: 20)
- [ ] 9.2 Implement MAX_BUFFER_SIZE per agent (default: 100 messages)
- [ ] 9.3 Implement cleanup delay constant (default: 5 minutes)
- [ ] 9.4 Add cleanup on agent completion (delayed buffer deletion)
- [ ] 9.5 Add cleanup on agent stop (immediate deletion)

## 10. Testing - Unit Tests

- [ ] 10.1 Test `startAgent()` creates execution and starts background task
- [ ] 10.2 Test `subscribe()` adds controller to subscribers map
- [ ] 10.3 Test `unsubscribe()` removes controller from subscribers map
- [ ] 10.4 Test `broadcastMessage()` sends to all active subscribers
- [ ] 10.5 Test message buffer ring buffer behavior (max 100, FIFO)
- [ ] 10.6 Test `getBufferedMessages()` returns messages in order
- [ ] 10.7 Test `stopAgent()` gracefully closes generator
- [ ] 10.8 Test cleanup on agent completion
- [ ] 10.9 Test failed subscriber removal
- [ ] 10.10 Test concurrent agent limit enforcement

## 11. Testing - Integration Tests

- [ ] 11.1 Test spawn endpoint starts execution immediately
- [ ] 11.2 Test stream endpoint subscribes to existing execution
- [ ] 11.3 Test multiple stream connections receive same messages
- [ ] 11.4 Test late subscriber receives buffered messages + live stream
- [ ] 11.5 Test agent continues running when all subscribers disconnect
- [ ] 11.6 Test stop endpoint terminates execution
- [ ] 11.7 Test completed agent cleanup after delay
- [ ] 11.8 Test error handling in execution
- [ ] 11.9 Test concurrent agent limit in spawn endpoint
- [ ] 11.10 Test memory usage with 20 concurrent agents

## 12. Testing - Manual E2E Tests

- [ ] 12.1 Spawn agent, verify it starts immediately (check logs/console)
- [ ] 12.2 Open modal, verify messages appear without re-execution
- [ ] 12.3 Close modal, verify agent continues running in background
- [ ] 12.4 Reopen modal, verify same output appears (no duplicate execution)
- [ ] 12.5 Open modal in two browser tabs, verify both see same output
- [ ] 12.6 Spawn agent, wait 30 seconds, open modal, verify message history appears
- [ ] 12.7 Click stop button, verify agent terminates gracefully
- [ ] 12.8 Try to open modal for stopped agent, verify appropriate behavior
- [ ] 12.9 Spawn 5 concurrent agents, verify all run independently
- [ ] 12.10 Monitor memory usage during 10+ agent executions

## 13. Documentation

- [ ] 13.1 Add JSDoc comments to AgentExecutionManager class
- [ ] 13.2 Add JSDoc comments to all public methods
- [ ] 13.3 Document message buffer ring buffer behavior
- [ ] 13.4 Document cleanup delay and resource limits
- [ ] 13.5 Update README with new execution architecture explanation
- [ ] 13.6 Add architecture diagram showing execution flow
- [ ] 13.7 Document migration from old pattern to new pattern

## 14. Performance Validation

- [ ] 14.1 Measure memory usage with 1, 5, 10, 20 concurrent agents
- [ ] 14.2 Verify memory is released after agent completion + cleanup delay
- [ ] 14.3 Measure broadcast latency (should be <10ms per message)
- [ ] 14.4 Verify no memory leaks after 100 agent spawn/complete cycles
- [ ] 14.5 Verify CPU usage during 20 concurrent agent executions

## 15. Update Phase 2 Tasks

- [ ] 15.1 Mark SDK wrapper tasks 3.2 (Store query generator instances) as complete
- [ ] 15.2 Mark SDK wrapper task 3.6 (Cleanup for stopped agents) as complete
- [ ] 15.3 Update task 3.3 (Pause via generator suspension) status to reflect current approach
- [ ] 15.4 Update task 3.4 (Resume via generator continuation) status to reflect current approach
- [ ] 15.5 Note that true pause/resume deferred until full generator state management
