<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

# Agent View - Project Context

**Agent View** is a Next.js application that provides a web-based UI for managing multiple Claude Code agents using the Claude Agent SDK. It enables developers to spawn, monitor, and control AI agents working across different projects from any device on their network.

## System Overview

### Core Capabilities

- **Multi-Agent Orchestration**: Spawn and manage up to 20 concurrent agents with independent contexts
- **Directory-Based Isolation**: Each agent operates in its assigned workspace with configurable tool permissions
- **Real-Time Monitoring**: Stream agent progress, tool usage, and outputs via Server-Sent Events (SSE)
- **Remote Access**: Mobile-friendly UI for monitoring agents from smartphones and tablets
- **Project Discovery**: Automatic project and git worktree detection for organizational context
- **Permission Management**: Fine-grained control over which SDK tools each agent can access
- **OpenSpec Integration**: Spec-driven development workflow support

### Architecture Style

Agent View follows a **layered client-server architecture** with:

- **Frontend**: React-based SPA using Next.js App Router
- **Backend**: Next.js API routes with in-memory state management
- **Persistence**: Optional SQLite database for session history and configuration
- **External Integration**: Claude Agent SDK for AI agent orchestration

## Key Architecture Patterns

1. **Singleton Pattern**: Session and Execution managers use singletons with hot-reload preservation
2. **Publisher-Subscriber**: Message broadcasting for real-time agent output streaming
3. **Repository Pattern**: Database access abstraction with graceful degradation
4. **Context Provider Pattern**: React Context for state management across components
5. **Async Generator Pattern**: Claude SDK query execution with streaming results

## Technology Stack

### Core Framework

- **Next.js 15** (App Router) - React meta-framework with server-side rendering
- **React 19** - UI library with concurrent features
- **TypeScript 5** - Type-safe JavaScript

### Backend & Data

- **Better SQLite3** - Embedded SQL database for persistence
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) - AI agent orchestration
- **Gray Matter** - YAML frontmatter parsing
- **Zod** - Runtime type validation and schema parsing

### Styling & UI

- **Tailwind CSS 4** - Utility-first CSS framework
- **React Markdown** - Markdown rendering
- **React Syntax Highlighter** - Code syntax highlighting

## Directory Structure Overview

```
agent-view/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── agents/         # Agent management endpoints
│   │   │   ├── configs/        # Agent configuration presets
│   │   │   ├── projects/       # Project management
│   │   │   ├── worktrees/      # Git worktree management
│   │   │   └── openspec/       # OpenSpec integration
│   │   ├── page.tsx            # Main dashboard
│   │   └── layout.tsx          # Root layout with providers
│   ├── components/             # React components
│   │   ├── features/           # Feature-specific components
│   │   ├── openspec/           # OpenSpec viewer components
│   │   └── ui/                 # Reusable UI primitives
│   ├── contexts/               # React Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core business logic
│   │   ├── agent-execution-manager.ts
│   │   ├── agent-session-manager.ts
│   │   ├── agent-sdk/          # Claude SDK integration
│   │   ├── database/           # SQLite persistence layer
│   │   ├── git/                # Git utilities
│   │   ├── openspec/           # OpenSpec integration
│   │   └── services/           # Domain services
│   └── types/                  # TypeScript type definitions
├── openspec/                   # OpenSpec project files
├── docs/                       # Documentation
│   └── ARCHITECTURE.md         # Detailed architecture documentation
└── package.json
```

### Key Directories Explained

- **`src/app/api/`**: Next.js API routes that handle HTTP requests and return JSON/SSE responses
- **`src/lib/`**: Pure TypeScript business logic, independent of framework (Next.js/React)
- **`src/components/`**: React components organized by feature and reusability
- **`src/contexts/`**: React Context providers for global state (agents, auth, etc.)
- **`src/hooks/`**: Custom React hooks for reusable component logic

## Important Design Decisions

### Publisher-Subscriber Pattern for Agent Output

- Agents run in background, independent of active stream connections
- Multiple clients can subscribe to same agent simultaneously
- Late subscribers receive buffered message history (last 1000 messages)
- Enables reconnection without missing output

### Optional Database Persistence

- SQLite database is optional (controlled by `ENABLE_DATABASE` env var)
- System operates entirely in-memory by default
- Graceful degradation: operations continue if database fails
- Database enables persistence for production/long-term use

### Concurrent Agent Limit (20 Max)

- Hard limit of 20 concurrent agents
- Balances API rate limits, memory usage, and realistic workflows
- Future: Make configurable via settings table

### Tool Permission Presets

- **Read-only**: Read, Grep, Glob, WebFetch, WebSearch
- **Standard**: Read-only + Edit, TodoWrite
- **Full-access**: All tools (including Write, Bash, Task)
- Custom mode provides flexibility for advanced users

### Auto-Discovery of Projects and Worktrees

- Automatically detect projects and worktrees from agent directory
- Provides organizational context automatically
- Supports git worktree workflows (multiple branches)

## Database Schema (Version 2)

Core tables:

- **projects**: Software projects (git repositories)
- **worktrees**: Git worktrees within a project
- **agents**: Agent session records with lifecycle state
- **messages**: Agent output messages (limited to last 1000 per agent)
- **agent_configs**: Saved agent configuration presets
- **settings**: Application-wide settings

## Security Considerations

⚠️ **IMPORTANT**: Agent View is designed for **local/private network use only**.

**Do NOT expose directly to the public internet** because:

1. No built-in authentication (relies on network-level access control)
2. Agents have file system access (Read, Write, Bash tools)
3. Claude API key is stored in environment (no per-user auth)
4. No rate limiting or abuse prevention

This mitigates lots of security risks. We don't need to worry about SQL injection, XSS, or other security risks because we're not exposing the application to the public internet. The threat model is explicitly user operating the application on their local network or secure virtual networks.

## Development Notes

### Entry Points

- `src/app/layout.tsx` - Root layout with providers
- `src/app/page.tsx` - Main dashboard page
- `src/instrumentation.ts` - Database initialization on startup

### State Management

- `src/lib/agent-session-manager.ts` - Agent session lifecycle
- `src/lib/agent-execution-manager.ts` - Background execution orchestration
- `src/contexts/active-agents-context.tsx` - React context for UI state

### API Layer

- `src/app/api/agents/spawn/route.ts` - Agent creation endpoint
- `src/app/api/agents/[id]/stream/route.ts` - SSE streaming endpoint
- `src/app/api/agents/[id]/stop/route.ts` - Agent termination endpoint

### Claude SDK Integration

- `src/lib/agent-sdk/client.ts` - SDK query wrapper
- `src/lib/agent-sdk/stream-handler.ts` - Message stream parser

## Additional Resources

For detailed architecture documentation, see:

- `docs/ARCHITECTURE.md` - Complete system architecture, data flow diagrams, API contracts, and deployment guide
