# Banshee Testing Prompts & Verification Patterns

## Agent-Specific Testing Prompts

### Agent 1: Enhanced Verifier Prompts

#### Security Verification Prompt
```
Analyze the provided Banshee codebase for security vulnerabilities with focus on:
1. Tauri IPC command validation and sanitization
2. AI API key exposure and storage security
3. Agent memory system isolation and access control
4. MCP protocol authentication and authorization
5. File system access patterns and restrictions
6. Cross-origin and injection attack vectors

Priority: P0-P2 issues require immediate attention
Context: Tauri desktop app with AI integration
Stack: Rust + React + TypeScript + MCP Protocol
```

#### Code Quality Verification Prompt  
```
Perform comprehensive code quality analysis for Banshee platform:
1. TypeScript strict compliance (no any types, proper nullish coalescing ??)
2. React 18 patterns and hooks best practices
3. Zustand state management patterns
4. Component architecture and separation of concerns
5. Performance anti-patterns and memory leaks
6. Error handling consistency and robustness

Standards: Follow CLAUDE.md OCD-level code standards
Tools: Biome formatting, strict TypeScript, modern React patterns
```

#### Architecture Verification Prompt
```
Evaluate Banshee's architecture alignment:
1. MCP protocol implementation correctness
2. Multi-agent orchestration patterns
3. AI provider integration architecture
4. Frontend/backend communication patterns
5. Database and memory system design
6. Build system and dependency management

Framework: Tauri with React frontend and Rust backend
Integration: Anthropic AI + OpenAI + MCP servers
```

### Agent 2: Intelligent Planner Prompts

#### Strategic Planning Prompt
```
Create implementation plan for identified issues in Banshee:
1. Prioritize fixes by P0-P5 severity levels
2. Consider architectural impact and dependencies  
3. Sequence changes to minimize system disruption
4. Plan validation steps for each fix
5. Identify potential regression risks
6. Estimate implementation complexity

Context: Production desktop AI application
Constraints: Maintain system stability, minimize downtime
```

#### Architectural Planning Prompt
```
Design architectural improvements for Banshee platform:
1. Analyze current system bottlenecks and pain points
2. Propose scalable solutions maintaining Tauri/React/MCP stack
3. Plan migration strategies for breaking changes
4. Design validation and testing approaches
5. Consider long-term maintainability and extensibility
6. Align with MCP protocol evolution

Goal: Enhance system robustness while preserving functionality
```

### Agent 3: Code Implementer Prompts

#### Implementation Prompt
```
Implement verified fixes for Banshee codebase:
1. Apply changes following strict TypeScript guidelines
2. Maintain consistency with existing code patterns
3. Ensure Tauri security best practices
4. Preserve AI integration functionality
5. Update related documentation and types
6. Include comprehensive error handling

Standards: CLAUDE.md compliance, no any types, nullish coalescing (??)
Validation: Must pass kluster.ai final verification
```

#### Validation Prompt
```
Perform final validation of implemented changes:
1. Verify TypeScript compilation with strict mode
2. Test Tauri command functionality
3. Validate AI provider integrations
4. Check MCP protocol compliance
5. Confirm security measures are intact
6. Ensure no regressions in existing functionality

Tools: Bun for testing, Biome for linting, manual integration tests
```

## Cross-Agent Coordination Prompts

### Handoff Prompt (Verifier → Planner)
```
Transfer verification results to planning phase:
Issues Found: [P0: X, P1: Y, P2: Z, P3: A, P4: B]
Critical Path: [List P0-P1 issues requiring immediate attention]
Architecture Impact: [System-wide changes needed]
Context: Banshee AI desktop app with Tauri + React + MCP
```

### Handoff Prompt (Planner → Implementer)  
```
Execute implementation plan:
Priority Queue: [Ordered list of fixes by priority and dependency]
Implementation Strategy: [Specific approach for each fix]
Validation Requirements: [Testing and verification steps]
Success Criteria: [How to measure successful implementation]
```

## Continuous Verification Patterns

### Real-time Monitoring Prompt
```
Monitor Banshee codebase for ongoing quality:
1. Track new code against established patterns
2. Identify architectural drift and anti-patterns
3. Monitor dependency security and updates
4. Validate AI integration performance
5. Check MCP protocol compliance
6. Assess technical debt accumulation

Frequency: After each significant change
Scope: Full platform including Rust backend and React frontend
```

### Regression Testing Prompt
```
Validate system stability after changes:
1. Core functionality: AI chat, agent orchestration, memory management
2. Security: API key handling, command validation, file access
3. Performance: Response times, memory usage, startup speed
4. Integration: MCP servers, AI providers, database operations
5. UI/UX: Component rendering, state management, user flows
6. Build: Compilation, bundling, distribution

Target: Zero regressions, improved metrics where possible
```