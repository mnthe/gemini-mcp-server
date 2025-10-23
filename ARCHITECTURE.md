# Architecture Documentation

## Overview

The Vertex AI MCP Server follows a clean, modular architecture with clear separation of concerns. This document describes the architecture, design patterns, and module organization.

## Directory Structure

```
src/
├── index.ts                    # Entry point - bootstraps and starts server
├── types/                      # TypeScript type definitions
│   ├── index.ts               # Central export point for all types
│   ├── config.ts              # Configuration types
│   ├── conversation.ts        # Conversation management types
│   ├── search.ts              # Search and fetch types (OpenAI MCP spec)
│   └── mcp.ts                 # MCP server and agent types
├── config/                     # Configuration management
│   └── index.ts               # Environment variable loading and validation
├── managers/                   # Business logic managers
│   ├── ConversationManager.ts # Multi-turn conversation session management
│   └── MCPClientManager.ts    # External MCP server connection management
├── services/                   # External service integrations
│   └── VertexAIService.ts     # Google Cloud Vertex AI API integration
├── agents/                     # AI agent logic
│   ├── PromptAnalyzer.ts      # Analyzes prompts to determine strategy
│   ├── ReasoningAgent.ts      # Chain-of-thought reasoning implementation
│   └── DelegationAgent.ts     # MCP-to-MCP delegation logic
├── handlers/                   # Tool request handlers
│   ├── QueryHandler.ts        # Main intelligent agent query handler
│   ├── SearchHandler.ts       # Search tool handler (OpenAI spec)
│   └── FetchHandler.ts        # Fetch tool handler (OpenAI spec)
├── schemas/                    # Input validation schemas
│   └── index.ts               # Zod schemas for tool inputs
└── server/                     # MCP server orchestration
    └── VertexAIMCPServer.ts   # Main server class, protocol handling
```

## Architecture Layers

### 1. Entry Point Layer (`index.ts`)

**Responsibility**: Application bootstrapping

- Loads configuration from environment variables
- Creates and initializes the MCP server
- Handles fatal errors and process exit

**Key Code**:
```typescript
import { loadConfig } from './config/index.js';
import { VertexAIMCPServer } from './server/VertexAIMCPServer.js';

const config = loadConfig();
const server = new VertexAIMCPServer(config);
server.run();
```

### 2. Type Layer (`types/`)

**Responsibility**: Type definitions and interfaces

- **config.ts**: Configuration types for Vertex AI settings
- **conversation.ts**: Types for conversation management (sessions, messages)
- **search.ts**: OpenAI MCP spec types for search/fetch operations
- **mcp.ts**: MCP server configuration, reasoning, and delegation types
- **index.ts**: Central export point for all types

**Design Pattern**: Interface Segregation Principle
- Types are organized by domain
- Each file contains related types
- Central export for easy importing

### 3. Configuration Layer (`config/`)

**Responsibility**: Configuration loading and validation

- Loads environment variables using standard Vertex AI SDK naming
- Validates required configuration
- Provides sensible defaults
- Exits gracefully if critical configuration is missing

**Key Features**:
- Standard Vertex AI env vars: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`
- Agent configuration: Model, temperature, sampling parameters
- Feature flags: Conversations, reasoning, delegation
- Type-safe configuration object

### 4. Schema Layer (`schemas/`)

**Responsibility**: Input validation using Zod

- Validates tool inputs against defined schemas
- Provides type inference for validated inputs
- Clear error messages for invalid inputs

**Schemas**:
- `QuerySchema`: Prompt and optional sessionId
- `SearchSchema`: Search query string
- `FetchSchema`: Document ID

### 5. Service Layer (`services/`)

**Responsibility**: External API integration

**VertexAIService**:
- Encapsulates Google Cloud Vertex AI communication
- Handles API request/response formatting
- Extracts and parses prediction results
- Configuration-driven (model, parameters)

**Design Pattern**: Service Object
- Single responsibility: Vertex AI communication
- Clean interface: `query(prompt): Promise<string>`
- Handles response parsing complexity internally

### 6. Manager Layer (`managers/`)

**Responsibility**: Business logic and state management

**ConversationManager**:
- Creates and manages conversation sessions
- Maintains message history with configurable limits
- Automatic session expiration
- Session cleanup

**MCPClientManager**:
- Loads external MCP server configurations
- Manages connections to other MCP servers
- Provides delegation interface
- Framework for multi-server orchestration

**Design Pattern**: Manager Pattern
- Encapsulates complex state management
- Provides high-level operations
- Hides implementation details

### 7. Agent Layer (`agents/`)

**Responsibility**: AI agent intelligence and decision-making

**PromptAnalyzer**:
- Analyzes prompts to detect complexity
- Identifies reasoning needs (keywords: analyze, compare, evaluate)
- Identifies delegation needs (keywords: web search, latest info)
- Returns strategy recommendation

**ReasoningAgent**:
- Implements chain-of-thought reasoning
- Breaks problems into logical steps
- Processes each step with Vertex AI
- Synthesizes final comprehensive answer

**DelegationAgent**:
- Handles delegation to external MCP servers
- Synthesizes external results with Vertex AI
- Provides fallback to standard query

**Design Pattern**: Strategy Pattern
- Different strategies for different prompt types
- Analyzers determine strategy, agents execute
- Easy to extend with new strategies

### 8. Handler Layer (`handlers/`)

**Responsibility**: Tool request processing

**QueryHandler**:
- Main intelligent agent entrypoint
- Orchestrates conversation context
- Uses PromptAnalyzer to determine strategy
- Delegates to appropriate agent (reasoning/delegation/standard)
- Manages conversation history

**SearchHandler**:
- Implements OpenAI MCP search specification
- Generates structured search results
- Caches documents for fetch
- Returns JSON with results array

**FetchHandler**:
- Implements OpenAI MCP fetch specification
- Retrieves cached documents by ID
- Returns full document with metadata

**Design Pattern**: Handler/Command Pattern
- Each handler responsible for one tool
- Clean separation of tool logic
- Consistent error handling

### 9. Server Layer (`server/`)

**Responsibility**: MCP protocol orchestration

**VertexAIMCPServer**:
- Implements Model Context Protocol
- Initializes all components (managers, services, agents, handlers)
- Registers MCP protocol handlers
- Routes tool requests to appropriate handlers
- Manages component lifecycle

**Design Pattern**: Facade Pattern
- Hides complexity of component initialization
- Provides simple interface for MCP communication
- Orchestrates all layers

## Data Flow

### Query Tool Request Flow

```
1. MCP Client Request
   ↓
2. VertexAIMCPServer (server/)
   ↓ [CallToolRequestSchema]
3. QueryHandler (handlers/)
   ↓ [Validate with QuerySchema]
4. ConversationManager (managers/)
   ↓ [Get/create session, load history]
5. PromptAnalyzer (agents/)
   ↓ [Analyze prompt for strategy]
6. Decision Point:
   
   If needs reasoning:
   → ReasoningAgent (agents/)
     → VertexAIService (services/)
     → Multi-step reasoning
   
   If needs delegation:
   → DelegationAgent (agents/)
     → MCPClientManager (managers/)
     → External MCP server
     → VertexAIService (services/) for synthesis
   
   Otherwise:
   → VertexAIService (services/)
     → Standard query
   
7. Update conversation history
   ↓
8. Format and return response
   ↓
9. MCP Client receives result
```

### Search/Fetch Flow

```
Search:
1. SearchHandler receives query
2. VertexAIService generates search results
3. Parse and structure results (OpenAI spec)
4. Cache documents in searchCache
5. Return structured JSON

Fetch:
1. FetchHandler receives document ID
2. Retrieve from searchCache
3. Return full document (OpenAI spec)
```

## Design Principles

### 1. Separation of Concerns
- Each module has a single, well-defined responsibility
- Clear boundaries between layers
- No cross-layer dependencies (except through interfaces)

### 2. Dependency Injection
- Components receive dependencies via constructor
- Easy to test and mock
- Clear dependency graph

### 3. Interface-Based Design
- Types define contracts
- Implementations can be swapped
- Loose coupling between components

### 4. Single Responsibility Principle
- Each class has one reason to change
- Focused, cohesive modules
- Easy to understand and maintain

### 5. Open/Closed Principle
- Open for extension (new strategies, handlers)
- Closed for modification (core logic stable)
- Extension points defined

## Extension Points

### Adding a New Tool

1. Define types in `types/`
2. Create schema in `schemas/`
3. Implement handler in `handlers/`
4. Register in `server/VertexAIMCPServer.ts`

### Adding a New Agent Strategy

1. Create new agent in `agents/`
2. Add detection logic to `PromptAnalyzer`
3. Call from `QueryHandler`

### Adding External Service

1. Create service in `services/`
2. Inject into handlers that need it
3. Use in agent or handler logic

## Testing Strategy

### Unit Testing
- Test each component in isolation
- Mock dependencies
- Focus on business logic

### Integration Testing
- Test component interactions
- Test MCP protocol handling
- Test end-to-end flows

### Test Structure
```
tests/
├── unit/
│   ├── agents/
│   ├── handlers/
│   ├── managers/
│   └── services/
└── integration/
    ├── query-flow.test.ts
    ├── search-fetch.test.ts
    └── conversation.test.ts
```

## Benefits of This Architecture

### Maintainability
- Easy to locate code by responsibility
- Changes isolated to specific modules
- Clear module boundaries

### Testability
- Small, focused units
- Easy to mock dependencies
- Clear test boundaries

### Scalability
- Easy to add new features
- Extension points well-defined
- No monolithic components

### Readability
- Self-documenting structure
- Clear naming conventions
- Consistent patterns

### Flexibility
- Components can be replaced
- Easy to refactor
- No tight coupling

## Security Considerations

### Input Validation
- All inputs validated with Zod schemas
- Type-safe after validation
- Clear error messages

### Credential Management
- No hardcoded credentials
- Environment variables only
- No secrets in logs

### Session Management
- Cryptographically secure session IDs (crypto.randomBytes)
- Automatic session expiration
- Memory-bounded history

## Performance Considerations

### Caching
- Search results cached for fetch operations
- Conversation history with configurable limits
- Automatic cleanup of expired sessions

### Resource Management
- Periodic cleanup of expired sessions
- Bounded conversation history
- Efficient Map-based storage

## Migration from Monolithic

The original `index.ts` was 831 lines. The refactored architecture:
- Entry point: 29 lines
- Total lines distributed across focused modules
- Each module < 250 lines
- Clear responsibilities
- Easy to navigate and understand

## Future Enhancements

### Potential Improvements
1. **Persistent Storage**: Replace in-memory caches with database
2. **Metrics/Logging**: Add structured logging and metrics
3. **Advanced Reasoning**: Implement more sophisticated reasoning strategies
4. **MCP Client**: Full subprocess-based MCP client implementation
5. **Plugin System**: Dynamic agent and handler registration
6. **Testing**: Comprehensive test suite
7. **Documentation**: Auto-generated API docs from types

## Conclusion

This architecture follows software engineering best practices:
- Clean separation of concerns
- Single responsibility principle
- Dependency injection
- Interface-based design
- Testable components
- Extensible design

The result is a maintainable, scalable, and professional codebase suitable for production use.
