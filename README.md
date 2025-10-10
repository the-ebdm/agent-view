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
- Anthropic API Key ([get one here](https://console.anthropic.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-view.git
cd agent-view

# Install dependencies
npm install
# or
bun install

# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here

# Run development server
npm run dev
# or
bun dev
```

Access the UI at [http://localhost:3000](http://localhost:3000)

### Configuration

You can configure agent behavior through environment variables:

```bash
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

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

### Phase 1: Foundation (Current)
- [ ] Basic multi-agent spawning and management
- [ ] Real-time streaming UI
- [ ] Mobile-responsive interface
- [ ] Agent-to-directory assignment

### Phase 2: Multi-Agent
- [ ] Tool permission configuration
- [ ] Session persistence
- [ ] Agent lifecycle management (pause, resume, stop)

### Phase 3: OpenSpec Integration
- [ ] OpenSpec viewer in UI
- [ ] Spec validation guardrails for agents
- [ ] Change proposal workflow support
- [ ] In-app spec navigation

### Phase 4: Advanced Features
- [ ] Agent collaboration features
- [ ] Task queuing and scheduling
- [ ] Linear/GitHub integrations

## Security Considerations

- Agents have full access to the Claude Agent SDK toolset within their assigned directories
- The UI is designed for local network access only
- **Never expose this application directly to the public internet**
  - I will use Tailscale to secure the network and only allow access to the application from my phone and my laptop.
- Each agent requires an API key with appropriate Anthropic usage limits
- Consider using tool permission restrictions for sensitive operations

## Contributing

Contributions are welcome! This project is in early development, so there are many opportunities to help shape its direction.

## License

UNLICENSED Closed Source for now.

## Resources

- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Claude Agent SDK TypeScript Guide](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Anthropic API Documentation](https://docs.anthropic.com)
