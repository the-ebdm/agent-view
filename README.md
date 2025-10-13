# Agent View

A Next.js application that provides a user interface for managing multiple Claude Code agents using the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview).

Run it locally on your development machine and access it remotely from your smartphone to monitor and manage AI agents working across different projects and directories.

## Overview

Agent View leverages the Claude Agent SDK to provide a centralized dashboard for:

- **Spawning multiple agents** with independent contexts and tool permissions
- **Directory-based isolation** - each agent operates in its assigned workspace
- **Real-time monitoring** - stream agent progress, tool usage, and outputs
- **Remote access** - monitor and control agents from any device on your network

The SDK handles automatic context management, file operations, code execution, and web search capabilities out of the box.

## Features

- 🤖 Multi-agent orchestration with independent task assignments
- 📁 Per-agent directory scoping and workspace isolation
- 📱 Mobile-friendly UI for remote monitoring
- 🔧 Full access to Claude Agent SDK tools (Read, Write, Bash, Grep, etc.)
- 🔐 Fine-grained tool permission control per agent
- 📊 Real-time task progress and output streaming
- 💾 Session persistence and agent state management
- ✅ **Todo list visualization** - See agent task breakdowns and progress in real-time
- 📋 **OpenSpec integration** - Spec-driven development with built-in validation and structured views

## Use Cases

- Monitor long-running Claude Code tasks from your phone while away from your desk
- Parallelize development work across multiple directories/projects
- Coordinate multiple agents working on different aspects of a large codebase
- Remote development workflow management
- Mobile-first development orchestration

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js 18+ / Bun with TypeScript 5
- **Styling**: Tailwind CSS 4
- **SDK**: [@anthropic-ai/claude-agent-sdk](https://docs.claude.com/en/api/agent-sdk/typescript)
- **Authentication**: Anthropic API Key
- **Spec Management**: [OpenSpec](https://openspec.dev) for spec-driven development

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Claude Code (logged in with Pro or Max plan)

### Installation

```bash
# Clone the repository
git clone https://github.com/the-ebdm/agent-view.git
cd agent-view

# Install dependencies
npm install
# or
bun install

# Run development server
npm run dev
# or
bun dev
```

Access the UI at [http://localhost:3000](http://localhost:3000)

## Architecture

Agent View is built on the Claude Agent SDK, which provides:

- **Automatic context management** - The SDK handles conversation history and prompt optimization
- **Rich tool ecosystem** - File operations, code execution, web search, and more
- **Advanced permissions** - Control which tools each agent can access
- **Error handling** - Built-in retry logic and graceful degradation
- **Session management** - Persistent agent state across interactions

Each agent instance in Agent View:

1. Gets assigned to a specific directory/workspace
2. Receives a task or goal
3. Operates independently with its own context
4. Reports progress through the UI in real-time
5. Can be monitored and controlled remotely

### Todo List Visualization

Agent View displays structured task breakdowns when agents use the SDK's built-in `TodoWrite` tool for multi-step workflows:

- **Real-time progress tracking** - See completed, in-progress, and pending tasks
- **Visual indicators** - ✅ completed, 🔧 in progress, ⭕ pending
- **Progress bar** - Shows completion percentage at a glance
- **Mobile optimized** - Collapsible section with touch-friendly controls
- **Current activity highlighting** - In-progress tasks show activeForm text ("Running tests" vs "Run tests")

The todo list appears automatically in the agent interaction modal when an agent breaks down complex tasks. It's collapsible and remembers your preference, providing quick insight into what the agent is working on without cluttering the interface.

## OpenSpec Integration

Agent View uses [OpenSpec](https://openspec.dev) for spec-driven development, ensuring agents stay on track with project requirements.

### Features

- **Structured spec viewing** - Browse capabilities, requirements, and scenarios in the UI
- **Change proposal workflow** - View and manage pending changes before implementation
- **Validation guardrails** - Automatic validation ensures specs are complete and correct
- **Agent guidance** - Agents reference specs to maintain consistency with project architecture

### Usage

```bash
# List active change proposals
openspec list

# List all specifications
openspec list --specs

# View a specific spec or change
openspec show [item]

# Validate a change proposal
openspec validate [change-id] --strict

# Archive completed changes
openspec archive [change-id]
```

See `openspec/project.md` for detailed conventions and `openspec/AGENTS.md` for AI assistant instructions.

## Development Status

⚠️ **Early Development** - This project is actively being built. Current priorities:

## Project Roadmap

### Phase 1: Foundation (Completed ✓)

- [x] Basic Next.js + Claude Agent SDK integration
- [x] Single agent spawning and monitoring
- [x] Real-time output streaming
- [x] Mobile-responsive UI

### Phase 1.5: Agent Execution Flow (Completed ✓)

- [x] Background agent execution architecture
- [x] Publisher-subscriber message broadcasting
- [x] Agent execution persistence (agents run independently of stream connections)
- [x] Message buffering for late subscribers
- [x] Resource management (concurrent agent limits, cleanup)

### Phase 2: Multi-Agent (Completed ✓)

- [x] Multiple agent instances (full support)
- [x] Per-agent directory assignment
- [x] Agent lifecycle management (start, stop) - Backend complete
- [x] Agent lifecycle management (pause, resume) - Backend partially complete, deferred for generator state management
- [x] Tool permission configuration (backend + UI complete)
- [x] Agent naming system (auto-generation + uniqueness)
- [x] State management (React Context + polling)
- [x] Multi-agent dashboard UI (card grid, modal interactions)

### Phase 3: OpenSpec Integration

- [x] OpenSpec viewer in UI
- [x] Spec validation guardrails
- [ ] Change proposal workflow support
- [ ] In-app spec navigation

### Phase 4: Advanced Features (Future)

- [ ] Agent collaboration (agents working together)
- [ ] Task queuing and scheduling
- [ ] Session persistence across restarts
- [ ] Linear/GitHub integrations

## Security Considerations

- Agents have full access to the Claude Agent SDK toolset within their assigned directories
- The UI is designed for local network access only
- **Never expose this application directly to the public internet**
  - I will personally use Tailscale to secure the network and only allow access to the application from my phone and my laptop. I'd recommend doing something similar if you want to use the application outside your network.
- Each agent requires an API key with appropriate Anthropic usage limits
- Consider using tool permission restrictions for sensitive operations

## Contributing

Contributions are welcome! This project is in early development, so there are many opportunities to help shape its direction.

## License

WTFPL ("Do What The Fuck You Want To Public License") - I wrote this in an evening with Claude Code.

## Resources

- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Claude Agent SDK TypeScript Guide](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Anthropic API Documentation](https://docs.anthropic.com)

<a href="http://www.wtfpl.net/"><img
       src="http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-4.png"
       width="80" height="15" alt="WTFPL" /></a>
