# Banshee - AI Agent Desktop Application

## Project Overview
Banshee is a sophisticated AI-powered desktop application built with Tauri, featuring comprehensive MCP (Model Context Protocol) integration and advanced agent orchestration capabilities.

## Development Stack
- **Architecture**: Tauri (Rust backend + React frontend)
- **Package Manager**: Bun
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **AI Integration**: Anthropic AI SDK + OpenAI + MCP Protocol
- **State Management**: Zustand
- **Build Tools**: Vite + Biome (linting/formatting)

## Development Commands
```bash
# Development
bun dev              # Start development server
bun build            # Build for production
bun verify           # Run type check + linting
bun prepare          # Format + verify (pre-commit)

# Code Quality
bun check            # Run Biome checks
bun fix              # Fix Biome issues
bun format           # Format code
bun typecheck        # TypeScript check

# Maintenance
bun clean            # Clean build artifacts
bun deps:check       # Check outdated dependencies
bun deps:update      # Update dependencies
```

## Project Structure
```
src/
├── components/      # React components
│   ├── ai/         # AI-specific components
│   ├── chat/       # Chat interface
│   ├── layout/     # Layout components
│   └── ui/         # UI primitives
├── hooks/          # React hooks
├── lib/            # Core libraries
│   ├── ai/         # AI runtime and tools
│   ├── mcp/        # MCP client implementation
│   └── stores/     # State management
├── portals/        # Feature portals
└── store/          # Global state

src-tauri/
├── src/
│   ├── ai/         # AI backend logic
│   ├── mcp/        # MCP server implementation
│   └── database/   # Database layer
```

## AI Integration
- **Anthropic Claude**: Primary AI provider
- **OpenAI**: Secondary AI provider
- **MCP Protocol**: Model Context Protocol for tool integration
- **Agent Orchestration**: Multi-agent workflows

## Development Workflow
1. **Pre-commit hooks**: Automatic formatting and linting
2. **Type checking**: Continuous TypeScript validation
3. **Code quality**: Biome for formatting and linting
4. **Testing**: Framework ready for test implementation

## MCP Servers
Banshee integrates with multiple MCP servers for enhanced functionality:
- Sequential thinking for deep analysis
- Context management for documentation
- Tool orchestration for complex workflows

## Enhanced Features (v3.0)
- Mode composition system
- Continuous verification loops
- Intelligent project detection
- Advanced MCP integration
- Multi-agent orchestration

## Getting Started
```bash
# Install dependencies
bun install

# Start development
bun dev

# Verify setup
bun verify
```

## IDE Configuration
VS Code is pre-configured with:
- Biome formatting on save
- Rust analyzer with clippy
- TypeScript preferences
- File exclusions for performance