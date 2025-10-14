# Add SDK Session Management

## Why

The application currently spawns Claude agents via the SDK but does not capture or utilize the SDK's session management capabilities. This prevents:

1. **Replying to agents** - Cannot send follow-up messages to continue conversations
2. **Session forking** - Cannot branch conversations from any point in history
3. **True pause/resume** - Current pause only updates state flags without actually controlling SDK execution
4. **Session persistence** - Agents cannot be resumed after server restarts with full conversation context

The Claude Agent SDK provides native session management through:
- Session IDs returned in init messages
- `resume: sessionId` option for continuing conversations
- `forkSession: true` option for branching conversations

Implementing proper session management unlocks conversational workflows where developers can:
- Ask follow-up questions to completed agents
- Branch explorations from any point ("try that differently")
- Truly pause work and resume hours later with full context
- Recover in-progress sessions after server restarts

## What Changes

### Core Infrastructure
- **Session ID capture**: Extract `session_id` from SDK init messages during agent startup
- **Database schema**: Add `session_id` column to `agents` table with index
- **Stream handler**: Process system/init messages to extract session metadata
- **Type system**: Add `sessionId?: string` to AgentSession and AgentHistoryItem types

### New Capabilities
- **Reply API**: `POST /api/agents/{id}/reply` - Send new message to existing session
- **Fork API**: `POST /api/agents/{id}/fork` - Branch conversation from any point
- **Resume refactor**: Reimplement pause/resume using SDK session resumption

### UI Enhancements
- **Reply interface**: Inline input on agent output view for continuing conversations
- **Fork button**: Context menu option to branch from any agent
- **Session indicator**: Visual badge showing session availability
- **Conversation continuity**: Clear indication when replying vs starting fresh

## Impact

### Affected Specs
- `agent-persistence` - Session ID storage and retrieval
- `agent-lifecycle-control` - True pause/resume implementation
- `streaming-output` - Session metadata extraction from SDK messages

### Affected Code
- `src/lib/agent-sdk/stream-handler.ts` - Process init messages
- `src/lib/agent-execution-manager.ts` - Capture and store session IDs
- `src/lib/agent-session-manager.ts` - Session ID management
- `src/lib/agent-sdk/client.ts` - Resume and fork functions
- `src/lib/database/schema.ts` - Database schema updates
- `src/types/agent.ts` - Type definitions
- `src/app/api/agents/[id]/reply/route.ts` - New endpoint
- `src/app/api/agents/[id]/fork/route.ts` - New endpoint
- `src/components/features/agent-reply.tsx` - New component
- `src/components/features/agent-card.tsx` - Reply/fork UI

### Migration Path
- Existing agents without session IDs continue working normally
- New agents automatically capture session IDs
- UI gracefully handles agents with/without session capabilities

### Breaking Changes
None - all changes are additive and backward compatible.
