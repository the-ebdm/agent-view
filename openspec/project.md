# Project Context

## Purpose

Agent View is a Next.js application that provides a centralized web-based UI for managing multiple Claude Code agents simultaneously. It leverages the Claude Agent SDK to enable developers to:

- Spawn and orchestrate multiple AI agents working on different tasks/directories
- Monitor agent progress, tool usage, and outputs in real-time
- Control agent behavior through fine-grained tool permissions
- Access the management interface remotely (e.g., from a smartphone) while agents work

The primary goal is to enable mobile-first, multi-agent development workflows where developers can oversee long-running AI tasks from anywhere.

## Tech Stack

### Core Technologies

- **Next.js 15** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first styling
- **Turbopack** - Fast bundler (Next.js dev/build)

### SDK & APIs

- **@anthropic-ai/claude-agent-sdk** - Claude Agent SDK for AI agent orchestration
- **Anthropic API** - Claude model access via API key authentication

### Development Tools

- **ESLint 9** - Code linting with Next.js config
- **PostCSS** - CSS processing for Tailwind
- **Bun/Node.js 18+** - Runtime environment

### Infrastructure

- **Tailscale** - Secure network access for remote UI access
- **Kubernetes (microk8s)** - Deployment target (personal cluster: heimdall/odin)

## Project Conventions

### Code Style

#### TypeScript

- **Strict mode enabled** - All TypeScript strict checks enforced
- **ES2017 target** - Modern JavaScript features
- **Path aliases** - Use `@/*` for `./src/*` imports
- **Naming conventions**:
  - PascalCase for components, types, interfaces
  - camelCase for functions, variables, hooks
  - kebab-case for file names (e.g., `agent-card.tsx`)
  - SCREAMING_SNAKE_CASE for constants

#### React & Next.js

- **App Router** - Use Next.js 15 App Router (`app/` directory)
- **Server Components first** - Default to Server Components, use Client Components only when needed (interactivity, hooks, browser APIs)
- **File conventions**:
  - `page.tsx` - Route pages
  - `layout.tsx` - Shared layouts
  - `loading.tsx` - Loading states
  - `error.tsx` - Error boundaries
  - `route.ts` - API routes

#### CSS/Styling

- **Tailwind CSS 4** - Utility-first approach, no custom CSS unless necessary
- **Mobile-first** - Design for mobile screens first, then scale up
- **Responsive design** - Use Tailwind responsive modifiers (`sm:`, `md:`, `lg:`)

### Architecture Patterns

#### Component Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── agents/            # Agent management routes
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── ui/               # Base UI primitives
│   └── features/         # Feature-specific components
├── lib/                   # Utility functions, SDK wrappers
├── types/                 # Shared TypeScript types
└── hooks/                 # Custom React hooks
```

#### Agent SDK Integration

- **SDK wrapper layer** - Abstract Claude Agent SDK calls in `lib/agent-sdk/`
- **Agent lifecycle management** - Track agent state (spawning, running, completed, error)
- **Streaming support** - Handle real-time agent output streaming
- **Permission management** - Configure per-agent tool access controls

#### State Management

- **React state** - Component-level state with `useState`
- **Server state** - Next.js Server Components for initial data
- **Real-time updates** - Server-Sent Events (SSE) or WebSockets for agent streaming
- **Persistent state** - Consider IndexedDB or localStorage for session persistence

### Testing Strategy

#### Current Status

- **Early development** - Testing infrastructure not yet established
- **Manual testing** - Primary validation method during prototyping

#### Planned Approach

- **Unit tests** - Vitest for utility functions and hooks
- **Component tests** - React Testing Library for UI components
- **Integration tests** - Test agent SDK integration and API routes
- **E2E tests** - Playwright for critical user flows (future)

#### Testing Priorities

1. Agent lifecycle management (spawn, monitor, terminate)
2. Real-time streaming functionality
3. Permission enforcement
4. Mobile responsive behavior

### Git Workflow

#### Branching Strategy

- **main** - Stable, deployable code
- **feature/[name]** - New features (e.g., `feature/agent-spawning`)
- **fix/[name]** - Bug fixes
- **refactor/[name]** - Code refactoring

#### Commit Conventions

- Use conventional commits format:
  - `feat: Add agent spawning UI`
  - `fix: Resolve streaming connection timeout`
  - `docs: Update README with setup instructions`
  - `refactor: Extract agent SDK wrapper`
  - `chore: Update dependencies`

#### OpenSpec Integration

- **Spec-driven development** - Major features require OpenSpec proposals
- **Change proposals** - Create in `openspec/changes/[change-id]/`
- **Validation** - Run `openspec validate --strict` before implementation
- **Archive on deploy** - Move completed changes to `openspec/changes/archive/`

## Domain Context

### Multi-Agent Orchestration

- **Agent instances** - Independent Claude Code agents with separate contexts
- **Directory scoping** - Each agent operates within a specific filesystem directory
- **Task isolation** - Agents work on independent tasks without interference
- **Concurrent execution** - Multiple agents can run simultaneously

### Claude Agent SDK

- **Tool system** - Agents have access to tools (Read, Write, Bash, Grep, etc.)
- **Automatic context** - SDK manages conversation history and prompt optimization
- **Streaming output** - Real-time agent responses via streaming API
- **Permission model** - Fine-grained control over which tools each agent can use

### Remote Access Use Case

- **Local development server** - Runs on developer's machine (localhost:3000)
- **Network access** - Accessible via Tailscale from mobile devices
- **Long-running tasks** - Monitor agents working on tasks that take minutes/hours
- **Mobile monitoring** - Check agent progress from phone while away from desk

## Important Constraints

### Security

- **Local network only** - Never expose to public internet
- **Tailscale required** - Use Tailscale for secure remote access
- **API key protection** - ANTHROPIC_API_KEY must be environment variable, never committed
- **Tool permissions** - Agents should have minimal necessary tool access
- **Filesystem isolation** - Enforce directory boundaries per agent

### Performance

- **Streaming efficiency** - Handle real-time streaming without blocking UI
- **Mobile performance** - Optimize for slower mobile network connections
- **Concurrent agents** - Support multiple simultaneous agent sessions
- **API rate limits** - Respect Anthropic API rate limits and usage quotas

### Technical

- **Node.js 18+** - Minimum runtime version
- **TypeScript strict mode** - All code must type-check
- **React 19** - Use latest React features (Server Components, Suspense)
- **Next.js 15** - App Router required, no Pages Router

### Development

- **OpenSpec required** - Major features need spec proposals and validation
- **Mobile-first design** - Test on mobile devices regularly
- **Early stage** - Expect frequent architecture changes during prototyping

## External Dependencies

### Required Services

- **Anthropic API** - Claude model access (requires API key)
  - Authentication: `ANTHROPIC_API_KEY` environment variable
  - Models: claude-sonnet-4-5-20250929 and future models
  - Rate limits: Depends on account tier

### Development Tools

- **OpenSpec CLI** - Spec-driven development tooling
  - Installation: `npm install -g openspec` or similar
  - Usage: `openspec validate`, `openspec list`, etc.

### Network Infrastructure

- **Tailscale** - Secure network mesh for remote access
  - Required for mobile access to local dev server
  - Alternative: VPN or SSH tunneling (not recommended)

### Deployment Target

- **Kubernetes (microk8s)** - Personal cluster deployment
  - Cluster: heimdall/odin nodes
  - Namespace: TBD
  - Ingress: Tailscale Operator or similar

### Optional Integrations (Future)

- **Linear** - Project management integration for agent task tracking
- **GitHub** - Code repository integration for automated workflows
- **Prometheus/Grafana** - Monitoring and observability

## OpenSpec Workflow

### When to Create Proposals

- **New capabilities** - Multi-agent spawning, real-time streaming UI, OpenSpec viewer
- **Breaking changes** - API changes, data model changes
- **Architecture changes** - State management patterns, SDK integration patterns
- **Security changes** - Permission model updates, authentication changes

### When to Skip Proposals

- **Bug fixes** - Restoring intended behavior per existing specs
- **Typos/formatting** - Documentation fixes, code style improvements
- **Dependency updates** - Non-breaking version bumps
- **Configuration changes** - Environment variables, build settings

### Proposal Process

1. Create change directory: `openspec/changes/[change-id]/`
2. Write `proposal.md`, `tasks.md`, and optional `design.md`
3. Create spec deltas: `specs/[capability]/spec.md`
4. Validate: `openspec validate [change-id] --strict`
5. Get approval before implementation
6. Implement tasks sequentially
7. Archive after deployment: `openspec archive [change-id]`

## Project Roadmap

### Phase 1: Foundation (Completed ✓)

- [x] Basic Next.js + Claude Agent SDK integration
- [x] Single agent spawning and monitoring
- [x] Real-time output streaming
- [x] Mobile-responsive UI
- **Status**: All 12 sections (104 tasks) completed
- **Highlights**: Full SDK integration, responsive UI with enhanced visuals, SSE streaming, error handling, mobile testing

### Phase 2: Multi-Agent (In Progress - 30% Complete)

- [x] Multiple agent instances (basic support added)
- [x] Per-agent directory assignment
- [~] Agent lifecycle management (start, pause, stop) - Backend partially complete
- [x] Tool permission configuration (backend complete)
- **Status**: 31 of 97 tasks completed
- **Next Priority**: Complete SDK wrapper lifecycle controls (3.2-3.7), UI components (9.1-9.5), and state management (8.1-8.5)

### Phase 3: OpenSpec Integration

- [ ] OpenSpec viewer in UI
- [ ] Spec validation guardrails
- [ ] Change proposal workflow support
- [ ] In-app spec navigation

### Phase 4: Advanced Features (Future)

- [ ] Agent collaboration (agents working together)
- [ ] Task queuing and scheduling
- [ ] Session persistence across restarts
- [ ] Linear/GitHub integrations
