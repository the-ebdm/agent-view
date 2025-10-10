# Add Phase 1 Foundation: Single Agent Management

## Why

Agent View currently has no functional agent management capabilities - it's a blank Next.js template. Phase 1 establishes the foundational infrastructure needed for all future features: Claude Agent SDK integration, agent spawning/monitoring, real-time streaming, and mobile-responsive UI.

This is the minimum viable foundation that enables a developer to spawn a single Claude agent from their browser, watch it work in real-time, and access the interface from their phone via Tailscale.

## What Changes

- **Claude Agent SDK Integration** - Install and wrap the @anthropic-ai/claude-agent-sdk with TypeScript types
- **Agent Spawning API** - Next.js API route to spawn agents with prompt + directory selection
- **Real-time Streaming** - Server-Sent Events (SSE) endpoint for streaming agent output
- **Agent History** - View previous agent runs with their outputs (in-memory, not persistent)
- **Dashboard UI** - Mobile-first interface for spawning agents and viewing streaming output
- **Structured Output Display** - Show both structured message types and formatted markdown content
- **Basic Error Handling** - Display errors for network issues, invalid API keys, and streaming failures

## Impact

### Affected Specs
- **NEW**: `agent-management` - Core agent lifecycle (spawn, monitor, history)
- **NEW**: `streaming-output` - Real-time SSE streaming and message processing
- **NEW**: `ui-dashboard` - Dashboard interface and mobile responsiveness

### Affected Code
- `package.json` - Add @anthropic-ai/claude-agent-sdk dependency
- `src/app/page.tsx` - Replace placeholder with agent dashboard
- `src/app/layout.tsx` - Update metadata for Agent View branding
- **NEW**: `src/app/api/agents/` - Agent management API routes
- **NEW**: `src/lib/agent-sdk/` - SDK wrapper layer
- **NEW**: `src/components/features/` - Agent UI components
- **NEW**: `src/components/ui/` - Base UI primitives (button, input, card)
- **NEW**: `src/hooks/` - Custom hooks for agent interaction
- **NEW**: `src/types/` - Shared TypeScript types

### Breaking Changes
None - this is the initial implementation.

### Dependencies
- Requires `ANTHROPIC_API_KEY` environment variable
- Requires @anthropic-ai/claude-agent-sdk npm package
