# Banshee Platform Verification Protocol

## Platform Overview
Banshee is a sophisticated AI-powered desktop application built with Tauri, featuring comprehensive MCP (Model Context Protocol) integration and advanced agent orchestration capabilities.

## Architecture Stack
- **Core**: Tauri (Rust backend + React frontend)
- **Package Manager**: Bun
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **AI Integration**: Anthropic AI SDK + OpenAI + MCP Protocol
- **State Management**: Zustand
- **Build Tools**: Vite + Biome (linting/formatting)

## Critical Verification Areas

### P0 - Security Critical
1. **Tauri Security**: Command validation, IPC security, file system access
2. **AI Integration Security**: API key handling, prompt injection prevention
3. **Memory System Security**: Agent memory isolation, data sanitization
4. **MCP Protocol Security**: Server authentication, command validation

### P1 - Business Logic Critical  
1. **Agent Orchestration**: Multi-agent workflows, state management
2. **Memory Management**: Storage, retrieval, knowledge graphs
3. **AI Provider Integration**: Anthropic, OpenAI service reliability
4. **MCP Server Communication**: Protocol compliance, error handling

### P2 - Code Quality Critical
1. **TypeScript Compliance**: Strict typing, no any types, nullish coalescing
2. **React Patterns**: Proper hooks usage, component architecture
3. **Rust Integration**: Safe FFI, proper error propagation
4. **Performance**: Memory leaks, inefficient operations

### P3 - Architecture Standards
1. **Component Structure**: Proper separation of concerns
2. **State Management**: Zustand best practices
3. **File Organization**: Logical grouping, imports
4. **Testing**: Framework compatibility, coverage

### P4 - Style & Maintainability
1. **Code Style**: Biome compliance, consistent formatting
2. **Documentation**: JSDoc, README updates
3. **Naming Conventions**: Clear, descriptive names
4. **Dependencies**: Version compatibility, security updates

## Verification Contexts

### Frontend Context
- React 18 with strict TypeScript
- Tailwind CSS for styling
- Zustand for state management
- Vite build system with Biome

### Backend Context  
- Tauri Rust backend
- IPC command validation
- File system operations
- Database integration

### AI Context
- Anthropic Claude integration
- OpenAI provider support
- MCP protocol implementation
- Agent memory systems

### Security Context
- API key protection
- Command injection prevention
- File system access control
- Cross-origin security

## Testing Requirements
1. **Unit Tests**: Component and function level
2. **Integration Tests**: AI provider connections
3. **Security Tests**: Input validation, access control
4. **Performance Tests**: Memory usage, response times

## Compliance Standards
- OWASP Top 10 security practices
- React best practices and hooks guidelines
- Tauri security recommendations
- TypeScript strict mode compliance