# Directory Structure

Organized by concern/responsibility for better maintainability.

```
src/
├── core/              # Core agentic loop components
│   ├── agentic/       # AgenticLoop, RunState, ResponseProcessor
│   └── tool/          # Tool interface and base classes
│
├── infrastructure/    # External services and clients
│   ├── gemini/         # GeminiAI service
│   ├── mcp/            # MCP client connections (stdio, HTTP)
│   └── tools/          # Tool implementations (WebFetch, Registry)
│
├── domain/            # Business logic
│   ├── handlers/      # MCP tool handlers (query, search, fetch)
│   └── managers/      # Conversation management
│
├── common/            # Shared utilities
│   ├── config/        # Configuration loading
│   ├── errors/        # Custom error types
│   ├── schemas/       # Zod validation schemas
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Logger and utilities
│
├── server/            # MCP server entry point
│   └── GeminiAIMCPServer.ts
│
└── index.ts           # Application entry point
```

## Rationale

### core/
Contains the **heart of the agentic system** - the loop, state management, and tool interface. These are the most critical components that define how the agent operates.

### infrastructure/
**External dependencies and implementations** - services that interact with external systems (Gemini AI, MCP servers) and tool implementations. Changes here are usually about integration rather than business logic.

### domain/
**Business logic layer** - handlers process user requests, managers maintain application state. This is where business rules live.

### common/
**Shared primitives** used across all layers - configuration, errors, schemas, types, and utilities. Pure, reusable code.

### server/
**Application bootstrap** - server initialization and wiring. Single responsibility: start the MCP server.
