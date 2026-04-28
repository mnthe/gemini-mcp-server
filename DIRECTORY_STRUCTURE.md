# Directory Structure

Organized by architectural concern for better maintainability.

```
src/
├── agentic/           # Core agentic loop components
│   ├── AgenticLoop.ts
│   ├── RunState.ts
│   ├── ResponseProcessor.ts
│   └── Tool.ts
│
├── mcp/               # MCP client connections
│   ├── EnhancedMCPClient.ts
│   ├── StdioMCPConnection.ts
│   └── HttpMCPConnection.ts
│
├── tools/             # Tool implementations
│   ├── WebFetchTool.ts
│   └── ToolRegistry.ts
│
├── services/          # External service integrations
│   ├── GeminiAIService.ts
│   └── GeminiAIService.test.ts
│
├── handlers/          # MCP tool request handlers
│   ├── QueryHandler.ts
│   ├── SearchHandler.ts
│   ├── FetchHandler.ts
│   ├── ImageGenerationHandler.ts
│   ├── SpeechGenerationHandler.ts
│   ├── MusicGenerationHandler.ts
│   └── VideoGenerationHandler.ts
│
├── managers/          # Business logic managers
│   └── ConversationManager.ts
│
├── errors/            # Custom error types
│   ├── index.ts
│   ├── SecurityError.ts
│   └── ModelBehaviorError.ts
│
├── types/             # TypeScript type definitions
│   ├── config.ts
│   ├── conversation.ts
│   ├── search.ts
│   ├── multimodal.ts
│   ├── mcp.ts
│   └── index.ts
│
├── schemas/           # Zod validation schemas
│   └── index.ts
│
├── config/            # Configuration loading
│   └── index.ts
│
├── utils/             # Shared utilities
│   ├── Logger.ts
│   ├── urlSecurity.ts
│   ├── fileSecurity.ts
│   ├── generatedFileSaver.ts
│   ├── imageSaver.ts
│   ├── videoSaver.ts
│   └── audioSaver.ts
│
├── server/            # MCP server bootstrap
│   ├── GeminiAIMCPServer.ts
│   └── GeminiAIMCPServer.test.ts
│
└── index.ts           # Application entry point
```

## Rationale

### agentic/
Contains the **heart of the agentic system** - the loop, state management, and tool interface. These are the most critical components that define how the agent operates.

### mcp/
**MCP protocol implementations** - stdio and HTTP connections to external MCP servers. Provides dynamic tool discovery and execution.

### tools/
**Tool implementations** - WebFetch and ToolRegistry for managing and executing tools in parallel with retry logic.

### services/
**External service integrations** - Gemini AI API service for model interactions. Includes integration tests co-located with the service.

### handlers/
**MCP request handlers** - process tool call requests from MCP clients (query, search, fetch, image generation, speech generation, music generation, video generation).

### managers/
**Business logic managers** - ConversationManager maintains multi-turn conversation state.

### errors/, types/, schemas/, config/
**Shared primitives** - custom errors, TypeScript types, validation schemas, and configuration loading. Pure, reusable code.

### utils/
**Utility functions** - Logger for observability, URL/file security validators for SSRF protection, and generated media savers for image, video, speech, and music outputs.

### server/
**Application bootstrap** - server initialization and wiring. Single responsibility: start the MCP server. Includes integration tests co-located with the server.
