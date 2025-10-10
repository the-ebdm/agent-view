# Implementation Tasks

## 1. Dependencies and Environment Setup
- [ ] 1.1 Install @anthropic-ai/claude-agent-sdk dependency
- [ ] 1.2 Install zod for input validation
- [ ] 1.3 Create .env.example with ANTHROPIC_API_KEY placeholder
- [ ] 1.4 Verify ANTHROPIC_API_KEY is loaded in Next.js environment

## 2. Type Definitions
- [ ] 2.1 Create src/types/agent.ts with core agent types (AgentStatus, AgentMessage, AgentSession)
- [ ] 2.2 Create src/lib/agent-sdk/types.ts with SDK-specific types

## 3. Agent SDK Wrapper
- [ ] 3.1 Create src/lib/agent-sdk/client.ts with spawnAgent() function
- [ ] 3.2 Create src/lib/agent-sdk/stream-handler.ts for processing streaming responses
- [ ] 3.3 Add error handling wrapper for SDK calls

## 4. Agent Session Management
- [ ] 4.1 Create src/lib/agent-session-manager.ts with in-memory session storage (Map)
- [ ] 4.2 Implement session creation, retrieval, and cleanup methods
- [ ] 4.3 Add agent run history storage (last 10 runs)

## 5. API Routes
- [ ] 5.1 Create src/app/api/agents/spawn/route.ts (POST) - spawn new agent
- [ ] 5.2 Create src/app/api/agents/[id]/stream/route.ts (GET) - SSE streaming endpoint
- [ ] 5.3 Create src/app/api/agents/[id]/status/route.ts (GET) - agent status check
- [ ] 5.4 Create src/app/api/agents/history/route.ts (GET) - retrieve agent history
- [ ] 5.5 Add input validation with zod schemas

## 6. Base UI Components
- [ ] 6.1 Create src/components/ui/button.tsx with variants (primary, secondary, ghost)
- [ ] 6.2 Create src/components/ui/input.tsx for text inputs
- [ ] 6.3 Create src/components/ui/textarea.tsx for multiline prompts
- [ ] 6.4 Create src/components/ui/card.tsx for content containers
- [ ] 6.5 Create src/components/ui/badge.tsx for status indicators

## 7. Feature Components
- [ ] 7.1 Create src/components/features/agent-spawn-form.tsx (Client Component)
  - Text area for prompt input
  - Directory selector input
  - Spawn button with loading state
- [ ] 7.2 Create src/components/features/agent-output-stream.tsx (Client Component)
  - Display structured messages (assistant, tool_use, result)
  - Render markdown formatted content
  - Auto-scroll to latest message
- [ ] 7.3 Create src/components/features/agent-status-badge.tsx
  - Visual status indicator (idle, running, completed, error)
- [ ] 7.4 Create src/components/features/agent-history-list.tsx
  - List of previous agent runs
  - Click to view historical output
  - Show timestamp and status

## 8. Custom Hooks
- [ ] 8.1 Create src/hooks/use-agent-stream.ts
  - Establish SSE connection
  - Parse incoming messages
  - Handle connection errors and cleanup
- [ ] 8.2 Create src/hooks/use-agent-history.ts
  - Fetch and cache agent history
  - Handle history list updates

## 9. Dashboard Page
- [ ] 9.1 Update src/app/page.tsx with agent dashboard layout
  - Two-column layout: form + output (desktop)
  - Stacked layout (mobile)
  - Agent history sidebar/drawer
- [ ] 9.2 Integrate agent spawn form
- [ ] 9.3 Integrate streaming output display
- [ ] 9.4 Add agent status indicator
- [ ] 9.5 Connect history list with click-to-view functionality
- [ ] 9.6 Update src/app/layout.tsx metadata (title: "Agent View", description)

## 10. Error Handling
- [ ] 10.1 Add error boundary component for React errors
- [ ] 10.2 Display API errors in UI (toast/alert pattern)
- [ ] 10.3 Handle missing ANTHROPIC_API_KEY gracefully (show setup instructions)
- [ ] 10.4 Handle SSE connection failures (show reconnect button)

## 11. Mobile Responsiveness
- [ ] 11.1 Test spawn form on mobile (320px - 768px)
- [ ] 11.2 Test streaming output display on mobile
- [ ] 11.3 Test history list on mobile (consider drawer/modal)
- [ ] 11.4 Verify touch interactions work correctly
- [ ] 11.5 Test on actual mobile device via Tailscale

## 12. Testing and Validation
- [ ] 12.1 Manual test: Spawn agent with simple prompt ("List files in current directory")
- [ ] 12.2 Manual test: Verify streaming output displays in real-time
- [ ] 12.3 Manual test: Check agent history persists between spawns
- [ ] 12.4 Manual test: Verify directory selection works
- [ ] 12.5 Manual test: Test error handling (invalid API key, network error)
- [ ] 12.6 Manual test: Verify mobile responsiveness on phone
