# Implementation Tasks

## 1. Dependencies and Environment Setup
- [x] 1.1 Install @anthropic-ai/claude-agent-sdk dependency
- [x] 1.2 Install zod for input validation
- [x] 1.3 Create .env.example with ANTHROPIC_API_KEY placeholder (removed - not needed for local Claude Code)
- [x] 1.4 Verify ANTHROPIC_API_KEY is loaded in Next.js environment (not needed - using local Claude Code)

## 2. Type Definitions
- [x] 2.1 Create src/types/agent.ts with core agent types (AgentStatus, AgentMessage, AgentSession)
- [x] 2.2 Create src/lib/agent-sdk/types.ts with SDK-specific types

## 3. Agent SDK Wrapper
- [x] 3.1 Create src/lib/agent-sdk/client.ts with spawnAgent() function
- [x] 3.2 Create src/lib/agent-sdk/stream-handler.ts for processing streaming responses
- [x] 3.3 Add error handling wrapper for SDK calls

## 4. Agent Session Management
- [x] 4.1 Create src/lib/agent-session-manager.ts with in-memory session storage (Map)
- [x] 4.2 Implement session creation, retrieval, and cleanup methods
- [x] 4.3 Add agent run history storage (last 10 runs)

## 5. API Routes
- [x] 5.1 Create src/app/api/agents/spawn/route.ts (POST) - spawn new agent
- [x] 5.2 Create src/app/api/agents/[id]/stream/route.ts (GET) - SSE streaming endpoint
- [x] 5.3 Create src/app/api/agents/[id]/status/route.ts (GET) - agent status check
- [x] 5.4 Create src/app/api/agents/history/route.ts (GET) - retrieve agent history
- [x] 5.5 Add input validation with zod schemas

## 6. Base UI Components
- [x] 6.1 Create src/components/ui/button.tsx with variants (primary, secondary, ghost)
- [x] 6.2 Create src/components/ui/input.tsx for text inputs
- [x] 6.3 Create src/components/ui/textarea.tsx for multiline prompts
- [x] 6.4 Create src/components/ui/card.tsx for content containers
- [x] 6.5 Create src/components/ui/badge.tsx for status indicators

## 7. Feature Components
- [x] 7.1 Create src/components/features/agent-spawn-form.tsx (Client Component)
  - Text area for prompt input
  - Directory selector input
  - Spawn button with loading state
- [x] 7.2 Create src/components/features/agent-output-stream.tsx (Client Component)
  - Display structured messages (assistant, tool_use, result)
  - Render markdown formatted content
  - Auto-scroll to latest message
- [x] 7.3 Create src/components/features/agent-status-badge.tsx
  - Visual status indicator (idle, running, completed, error)
- [x] 7.4 Create src/components/features/agent-history-list.tsx
  - List of previous agent runs
  - Click to view historical output
  - Show timestamp and status

## 8. Custom Hooks
- [x] 8.1 Create src/hooks/use-agent-stream.ts
  - Establish SSE connection
  - Parse incoming messages
  - Handle connection errors and cleanup
- [x] 8.2 Create src/hooks/use-agent-history.ts
  - Fetch and cache agent history
  - Handle history list updates

## 9. Dashboard Page
- [x] 9.1 Update src/app/page.tsx with agent dashboard layout
  - Two-column layout: form + output (desktop)
  - Stacked layout (mobile)
  - Agent history sidebar/drawer
- [x] 9.2 Integrate agent spawn form
- [x] 9.3 Integrate streaming output display
- [x] 9.4 Add agent status indicator
- [x] 9.5 Connect history list with click-to-view functionality
- [x] 9.6 Update src/app/layout.tsx metadata (title: "Agent View", description)

## 10. Error Handling
- [x] 10.1 Add error boundary component for React errors
- [x] 10.2 Display API errors in UI (toast/alert pattern)
- [x] 10.3 Handle missing ANTHROPIC_API_KEY gracefully (not needed - using local Claude Code)
- [x] 10.4 Handle SSE connection failures (show reconnect button)

## 11. Mobile Responsiveness
- [x] 11.1 Test spawn form on mobile (320px - 768px)
- [x] 11.2 Test streaming output display on mobile
- [x] 11.3 Test history list on mobile (consider drawer/modal)
- [x] 11.4 Verify touch interactions work correctly
- [x] 11.5 Test on actual mobile device via Tailscale

## 12. Testing and Validation
- [x] 12.1 Manual test: Spawn agent with simple prompt ("List files in current directory")
- [x] 12.2 Manual test: Verify streaming output displays in real-time
- [x] 12.3 Manual test: Check agent history persists between spawns
- [x] 12.4 Manual test: Verify directory selection works
- [x] 12.5 Manual test: Test error handling (invalid API key, network error)
- [x] 12.6 Manual test: Verify mobile responsiveness on phone

## Additional UI Enhancements Completed
- [x] Enhanced visual hierarchy across all components
- [x] Added icons and better typography
- [x] Improved empty states with icons and helpful messaging
- [x] Added left border accents for better visual scanning
- [x] Enhanced color contrast and dark mode support
- [x] Added hover effects and transitions
- [x] Improved error message styling
- [x] Added gradient backgrounds and backdrop blur effects
- [x] Enhanced header with sticky positioning
