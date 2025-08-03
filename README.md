# 🌙 Banshee - AI Agent Desktop Application

> A sophisticated AI-powered desktop application built with Tauri, featuring comprehensive MCP (Model Context Protocol) integration and advanced agent orchestration capabilities.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Rust](https://img.shields.io/badge/Rust-Latest-orange?logo=rust)

## ✨ Features

- **🤖 AI Agent System**: Multi-agent orchestration with Claude & OpenAI integration
- **🔌 MCP Protocol**: Full Model Context Protocol support for tool integration
- **⚡ Modern Stack**: Tauri + React + TypeScript + Bun
- **🎨 Elegant UI**: Tailwind CSS with ethereal dark/light themes
- **🧪 Quality Assured**: Comprehensive testing with Vitest + Playwright
- **🔄 Real-time**: Streaming AI responses with progress indicators
- **💾 Persistent**: SQLite database for conversations and settings
- **🛡️ Secure**: Built-in security features and input validation

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- [Rust](https://rustup.rs/) 1.70+
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Banshee

# Install dependencies
bun install

# Start development server
bun dev
```

### First Run

1. The app will open in a new window
2. Navigate through the portals: Dashboard, Chat, Agents, MCP, Settings
3. Configure your AI providers in the Settings portal
4. Start chatting with AI agents in the Chat portal

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- TanStack Query for data fetching
- React Router for navigation

**Backend (Tauri)**
- Rust with async/await
- SQLite database integration
- MCP server implementation
- AI provider integrations
- Security layer

**Development Tools**
- Bun for package management and runtime
- Vite for bundling and HMR
- Biome for linting and formatting
- Vitest for unit testing
- Playwright for E2E testing

### Project Structure

```
banshee/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── ai/            # AI-specific components
│   │   ├── chat/          # Chat interface
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Reusable UI primitives
│   ├── hooks/             # React hooks
│   ├── lib/               # Core libraries
│   │   ├── ai/            # AI runtime and tools
│   │   ├── mcp/           # MCP client implementation
│   │   └── stores/        # State management
│   ├── portals/           # Feature portals
│   ├── store/             # Global state
│   └── test/              # Test utilities
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── ai/            # AI backend logic
│   │   ├── mcp/           # MCP server implementation
│   │   ├── database/      # Database layer
│   │   └── commands/      # Tauri commands
│   └── tauri.conf.json    # Tauri configuration
├── e2e/                   # E2E tests
└── docs/                  # Documentation
```

## 🛠️ Development

### Available Scripts

```bash
# Development
bun dev              # Start development server
bun build            # Build for production

# Code Quality
bun check            # Run Biome checks
bun fix              # Fix Biome issues
bun format           # Format code
bun typecheck        # TypeScript check
bun verify           # Run type check + linting

# Testing
bun test             # Run unit tests
bun test:ui          # Run tests with UI
bun test:coverage    # Generate coverage report
bun test:e2e         # Run E2E tests
bun test:e2e:ui      # Run E2E tests with UI

# Maintenance
bun clean            # Clean build artifacts
bun deps:check       # Check outdated dependencies
bun deps:update      # Update dependencies
```

### Development Workflow

1. **Pre-commit hooks**: Automatic formatting and linting
2. **Type checking**: Continuous TypeScript validation
3. **Testing**: Unit tests with Vitest, E2E with Playwright
4. **Code quality**: Biome for formatting and linting

## 🧪 Testing

### Unit Tests

Run with Vitest in a jsdom environment:

```bash
bun test              # Watch mode
bun test:run          # Single run
bun test:coverage     # With coverage
```

### E2E Tests

Playwright tests for the complete application:

```bash
bun test:e2e          # Headless
bun test:e2e:headed   # With browser UI
bun test:e2e:ui       # Interactive mode
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# AI Provider Keys
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Development
RUST_LOG=debug
TAURI_DEBUG=true
```

### VS Code Setup

Recommended extensions:
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)

## 🤖 AI Integration

### Supported Providers

- **Anthropic Claude**: Primary AI provider
- **OpenAI GPT**: Secondary provider
- **Custom Models**: Via MCP protocol

### MCP Integration

Banshee implements the Model Context Protocol for:
- Tool orchestration
- Context management
- Multi-agent workflows
- Custom integrations

## 🔒 Security

- Input validation and sanitization
- Secure API key storage
- Rate limiting
- Error boundary protection
- Dependency vulnerability scanning

## 🚢 Deployment

### Building for Production

```bash
# Build the application
bun build

# Artifacts will be in src-tauri/target/release/
```

### Distribution

Built applications are available for:
- macOS (Intel & Apple Silicon)
- Windows (x64)
- Linux (x64)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `bun test && bun test:e2e`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commits
- Update documentation
- Ensure all checks pass

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) for the amazing desktop framework
- [Vercel AI SDK](https://sdk.vercel.ai/) for AI integrations
- [Model Context Protocol](https://modelcontextprotocol.io/) for standardized AI tooling

---

**Built with ❤️ using Tauri, React, and the power of AI**
