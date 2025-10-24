# Architecture Documentation

## Overview

The Gemini AI MCP Server implements an **intelligent agentic loop** inspired by the OpenAI Agents SDK. The architecture supports turn-based execution, automatic tool selection, parallel tool execution, and robust error handling.

**Last Updated**: 2025-01-23 (Post-Agentic Loop Implementation)

## Core Architecture

### Agentic Loop Pattern

```
User Input
  ↓
┌─────────────────── Turn-Based Loop (1..10) ──────────────────┐
│                                                               │
│  RunState Management                                          │
│  ├─ Current turn tracking                                     │
│  ├─ Message history accumulation                              │
│  ├─ Tool call records                                         │
│  └─ Reasoning traces                                          │
│                                                               │
│  ┌─────────────────────────────────────┐                     │
│  │  Turn Execution                     │                     │
│  │  ─────────────────                  │                     │
│  │                                     │                     │
│  │  1. Build Prompt                    │                     │
│  │     └─ Tool definitions + History   │                     │
│  │                                     │                     │
│  │  2. Gemini Generation               │                     │
│  │     └─ ThinkingConfig (if needed)   │                     │
│  │                                     │                     │
│  │  3. Response Processing             │                     │
│  │     ├─ Extract reasoning            │                     │
│  │     ├─ Parse tool calls (MCP)       │                     │
│  │     └─ Detect final output          │                     │
│  │                                     │                     │
│  │  4. Tool Execution                  │                     │
│  │     ├─ Parallel execution           │                     │
│  │     ├─ Retry (exponential backoff)  │                     │
│  │     └─ Fallback to Gemini           │                     │
│  │                                     │                     │
│  │  5. Decision                        │                     │
│  │     ├─ Tool results? → Loop again   │                     │
│  │     ├─ Final output? → Exit         │                     │
│  │     └─ MaxTurns? → Best effort      │                     │
│  │                                     │                     │
│  └─────────────────────────────────────┘                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
  ↓
Structured Result
├─ Final output
├─ Session ID
├─ Statistics (turns, tool calls, reasoning steps)
└─ Complete message history
```

## Directory Structure

```
src/
├── agentic/           # Core agentic loop components
│   ├── AgenticLoop.ts       # Main turn-based orchestrator
│   ├── RunState.ts          # Execution state management
│   ├── ResponseProcessor.ts # Parse Gemini responses (MCP format)
│   └── Tool.ts              # Tool interface (MCP standard)
│
├── mcp/               # MCP client implementation
│   ├── EnhancedMCPClient.ts   # Unified stdio + HTTP client
│   ├── StdioMCPConnection.ts  # Subprocess-based MCP
│   └── HttpMCPConnection.ts   # HTTP-based MCP
│
├── tools/             # Tool implementations
│   ├── WebFetchTool.ts     # Secure HTTPS web fetching
│   └── ToolRegistry.ts     # Tool management + parallel execution
│
├── services/          # External service integrations
│   └── GeminiAIService.ts  # Gemini API (thinkingConfig support)
│
├── handlers/          # MCP tool handlers
│   ├── QueryHandler.ts     # Main query handler (uses AgenticLoop)
│   ├── SearchHandler.ts    # Search tool (OpenAI spec)
│   └── FetchHandler.ts     # Fetch tool (OpenAI spec)
│
├── managers/          # Business logic managers
│   └── ConversationManager.ts  # Multi-turn session management
│
├── errors/            # Custom error types
│   ├── SecurityError.ts         # Security violations
│   ├── ToolExecutionError.ts    # Tool failures
│   └── ModelBehaviorError.ts    # Invalid model responses
│
├── types/             # TypeScript type definitions
│   ├── config.ts           # Configuration types
│   ├── conversation.ts     # Conversation types
│   ├── search.ts           # Search/fetch types
│   └── mcp.ts              # MCP server types
│
├── schemas/           # Input validation (Zod)
│   └── index.ts
│
├── config/            # Configuration loading
│   └── index.ts
│
├── utils/             # Shared utilities
│   └── Logger.ts           # File-based logging system
│
├── server/            # MCP server bootstrap
│   └── GeminiAIMCPServer.ts
│
└── index.ts           # Application entry point
```

## Component Details

### 1. AgenticLoop (Core Orchestrator)

**Location**: `src/agentic/AgenticLoop.ts`

**Responsibilities**:
- Turn-based execution loop (1..maxTurns)
- Prompt construction with tool definitions
- Response processing and decision making
- Tool execution coordination
- Error handling and fallback logic

**Key Methods**:
```typescript
async run(
  prompt: string,
  conversationHistory: Message[],
  options: RunOptions
): Promise<RunResult>
```

**Features**:
- Automatic thinking mode detection (keywords: analyze, compare, etc.)
- Parallel tool execution with retry
- Graceful degradation (best-effort response on MaxTurns)
- Complete execution tracing

### 2. RunState (State Management)

**Location**: `src/agentic/RunState.ts`

**Responsibilities**:
- Turn counter and limits
- Message history accumulation
- Tool call tracking
- Reasoning step recording
- Integrated logging

**Design**: In-memory only (no serialization needed for chat MCP)

### 3. ResponseProcessor (Response Parsing)

**Location**: `src/agentic/ResponseProcessor.ts`

**Responsibilities**:
- Parse Gemini responses into structured items
- Extract reasoning markers `[Thinking: ...]`
- Parse tool calls (MCP format: `TOOL_CALL: / ARGUMENTS:`)
- Validate response structure

**Tool Call Format**:
```
TOOL_CALL: web_fetch
ARGUMENTS: {"url": "https://example.com", "extract": true}
```

### 4. ToolRegistry (Tool Management)

**Location**: `src/tools/ToolRegistry.ts`

**Responsibilities**:
- Register WebFetch and MCP tools
- Parallel tool execution (`Promise.all`)
- Per-tool retry logic (exponential backoff)
- Tool definition formatting for LLM prompts

**Features**:
- Up to 2 retries per tool
- Failure isolation (one tool failure doesn't block others)
- Detailed execution logging

### 5. WebFetchTool (Secure Web Fetching)

**Location**: `src/tools/WebFetchTool.ts`

**Security Features**:
- HTTPS-only enforcement
- Private IP blocking (CIDR ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8)
- DNS resolution validation
- 30-second timeout
- 50KB content limit

**Content Extraction**:
- Remove `<script>` and `<style>` tags
- Decode HTML entities
- Extract main paragraphs (>40 characters)
- Clean whitespace normalization

### 6. EnhancedMCPClient (MCP Integration)

**Location**: `src/mcp/EnhancedMCPClient.ts`

**Responsibilities**:
- Manage stdio and HTTP MCP server connections
- Dynamic tool discovery at startup
- Route tool calls to appropriate servers
- Connection lifecycle management

**Supported Transports**:
- **Stdio**: Subprocess communication (stdin/stdout JSON-RPC)
- **HTTP**: RESTful API (`POST /tools/list`, `POST /tools/call`)

### 7. GeminiAIService (Gemini API)

**Location**: `src/services/GeminiAIService.ts`

**Responsibilities**:
- Gemini API communication via gen-ai SDK
- ThinkingConfig support for reasoning mode
- Response text extraction

**Features**:
- Dynamic generation config per query
- Thinking mode activation
- Response parsing with error handling
- Supports both Vertex AI and Google AI Studio modes

### 8. Logger (File-based Logging)

**Location**: `src/utils/Logger.ts`

**Responsibilities**:
- Log execution traces to files
- Separate reasoning log for analysis
- Session-based log organization
- Automatic log directory creation

**Log Files**:
- `logs/general.log`: All logs (info, error, tool calls)
- `logs/reasoning.log`: Thinking traces only

## Data Flow

### Query Execution Flow

```
1. MCP Client → GeminiAIMCPServer
   ↓
2. QueryHandler.handle()
   ↓
3. Load conversation history (ConversationManager)
   ↓
4. AgenticLoop.run()
   ├─ Turn 1:
   │  ├─ Build prompt with tool definitions
   │  ├─ Gemini generation (thinkingConfig)
   │  ├─ Parse response (ResponseProcessor)
   │  ├─ Tool calls detected?
   │  │  ├─ ToolRegistry.executeTools() [parallel]
   │  │  ├─ Add results to state
   │  │  └─ Continue to Turn 2
   │  └─ Final output? → Exit
   │
   ├─ Turn 2..N: (same process)
   │
   └─ Return RunResult
   ↓
5. Update conversation history
   ↓
6. Format response with stats
   ↓
7. Return to MCP client
```

### Tool Execution Flow

```
AgenticLoop detects tool calls
  ↓
ToolRegistry.executeTools() [parallel]
  ├─ Tool 1: WebFetchTool
  │  ├─ Attempt 1: HTTPS check → DNS validation → Fetch
  │  ├─ Success? → Return result
  │  └─ Failure? → Retry (backoff 1s)
  │
  ├─ Tool 2: MCP Tool (filesystem)
  │  ├─ EnhancedMCPClient.callTool()
  │  ├─ Route to StdioMCPConnection
  │  └─ JSON-RPC over stdin/stdout
  │
  └─ Collect all results
     ↓
All failed? → Fallback prompt to Gemini
Any succeeded? → Continue loop with results
```

## Design Principles

### 1. Turn-Based Execution
- **OpenAI Pattern**: Multi-turn loop with state management
- **Protection**: MaxTurns prevents infinite loops
- **Benefit**: Handles complex multi-step tasks

### 2. Automatic Tool Selection
- **LLM-Driven**: Gemini decides when to use tools
- **Not Rule-Based**: No keyword matching (removed PromptAnalyzer)
- **Benefit**: More flexible and intelligent

### 3. Parallel Execution
- **OpenAI Pattern**: `Promise.all` for concurrent tools
- **Benefit**: Faster when multiple tools needed
- **Isolation**: One failure doesn't block others

### 4. Retry with Fallback
- **Retry**: Up to 2 attempts per tool (exponential backoff)
- **Fallback**: If all tools fail, use Gemini knowledge
- **Benefit**: Robust against transient failures

### 5. Structured Logging
- **File-based**: Persistent execution traces
- **Separation**: General vs reasoning logs
- **Benefit**: Debugging and analysis

### 6. MCP Standard Compliance
- **Tool Format**: MCP standard parameter schemas
- **Protocol**: JSON-RPC for stdio, REST for HTTP
- **Benefit**: Interoperability with MCP ecosystem

## Security

### WebFetch Security Layers

1. **Protocol**: HTTPS only
2. **DNS**: Resolve hostname and check IP
3. **IP Filtering**: Block private CIDR ranges
4. **Timeout**: 30 seconds max
5. **Size Limit**: 50KB content max

### Session Security

- Cryptographically secure IDs (`crypto.randomBytes`)
- Automatic expiration
- Memory-bounded history

### Input Validation

- Zod schema validation for all inputs
- Type-safe after validation
- No SQL injection, XSS, or code injection risks

## Performance

### Optimizations

1. **Parallel Tool Execution**: Multiple tools run concurrently
2. **Static Tool Discovery**: Tools discovered once at startup
3. **In-Memory State**: No serialization overhead
4. **Streaming**: Response streaming support (future)

### Resource Management

- Session cleanup (periodic, every 60s)
- Bounded conversation history (configurable)
- Log rotation (optional, `Logger.cleanOldLogs()`)

## Migration Notes

### From Previous Architecture

**Removed**:
- `agents/PromptAnalyzer.ts` → LLM now decides autonomously
- `agents/ReasoningAgent.ts` → Gemini thinkingConfig
- `agents/DelegationAgent.ts` → EnhancedMCPClient
- `managers/MCPClientManager.ts` → EnhancedMCPClient (full implementation)

**Added**:
- `agentic/` folder (AgenticLoop, RunState, ResponseProcessor, Tool)
- `mcp/` folder (EnhancedMCPClient, Stdio/HTTP connections)
- `tools/` folder (WebFetchTool, ToolRegistry)
- `errors/` folder (SecurityError, ToolExecutionError, ModelBehaviorError)
- `utils/` folder (Logger)

**Benefits**:
- Keyword-based → LLM-driven decisions
- Fixed reasoning steps → Dynamic multi-turn
- Framework code → Full MCP client implementation
- No tool support → Parallel execution with retry

## Extension Points

### Adding a New Tool

1. Implement `BaseTool` interface:
```typescript
import { BaseTool, ToolResult, RunContext } from '../agentic/Tool.js';

export class MyTool extends BaseTool {
  name = 'my_tool';
  description = 'Tool description for LLM';
  parameters = { /* JSON Schema */ };

  async execute(args: any, context: RunContext): Promise<ToolResult> {
    // Implementation
  }
}
```

2. Register in `ToolRegistry`:
```typescript
const myTool = new MyTool();
toolRegistry.tools.set(myTool.name, myTool);
```

### Adding External MCP Server

Update `GEMINI_MCP_SERVERS` environment variable:
```json
[
  {
    "name": "my-server",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@my-org/mcp-server"]
  }
]
```

Tools are automatically discovered and registered at startup.

### Custom Logging

Extend `Logger` class or add custom processors:
```typescript
class Logger {
  // Add custom log methods
  customEvent(event: string, data: any): void {
    this.writeLog('custom', event, data);
  }
}
```

## Testing Strategy

### Unit Testing

Test each component in isolation:

```typescript
// Example: Test ResponseProcessor
const processor = new ResponseProcessor();
const response = "TOOL_CALL: web_fetch\nARGUMENTS: {...}";
const parsed = processor.process(response);
expect(parsed.toolCalls.length).toBe(1);
```

### Integration Testing

Test agentic loop end-to-end:

```typescript
const loop = new AgenticLoop(geminiAI, toolRegistry);
const result = await loop.run("Fetch https://example.com", [], {});
expect(result.finalOutput).toContain("content");
```

### Mock Strategy

- Mock `GeminiAIService` for predictable responses
- Mock `EnhancedMCPClient` for tool testing
- Use in-memory `Logger` for test isolation

## Benefits of This Architecture

### Robustness
- MaxTurns protection against infinite loops
- Retry logic for transient failures
- Fallback to Gemini knowledge
- Best-effort responses instead of errors

### Observability
- Complete execution traces in logs
- Reasoning process recorded separately
- Tool call statistics
- Turn-by-turn debugging

### Extensibility
- Easy to add new tools (implement `BaseTool`)
- External MCP servers via config
- Custom logging extensions
- No code changes needed for new MCP tools

### Performance
- Parallel tool execution
- Static tool discovery (startup only)
- In-memory state (no serialization)

### Maintainability
- Clear separation of concerns
- Single responsibility per module
- Type-safe with TypeScript
- Comprehensive error types

### Standards Compliance
- MCP protocol for tool definitions
- OpenAI Agents SDK patterns
- JSON Schema for parameters

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Execution | Single-shot | Turn-based loop (1..10) |
| Tool Support | Framework only | Full stdio + HTTP MCP |
| Decision Making | Keyword-based | LLM autonomous |
| Reasoning | Fixed 3 steps | Dynamic (Gemini thinkingConfig) |
| Tool Execution | Sequential | Parallel with retry |
| Error Handling | Throw errors | Retry → Fallback |
| Logging | Console only | File-based (general + reasoning) |
| Code Lines | ~1500 | ~3800 (more features) |
| Architecture | Monolithic tendencies | Clean separation |

## Future Enhancements

### Potential Improvements

1. **Streaming**: Real-time response streaming
2. **Caching**: Response caching for identical queries
3. **Metrics**: Prometheus/OpenTelemetry integration
4. **Advanced Reasoning**: Multi-model reasoning (Gemini + GPT)
5. **Plugin System**: Dynamic tool registration
6. **Testing**: Comprehensive test suite
7. **Guardrails**: Input/output validation agents

## Conclusion

This architecture implements production-grade agentic capabilities:
- ✅ Robust turn-based execution
- ✅ Automatic tool orchestration
- ✅ Standards-compliant (MCP)
- ✅ Secure by design
- ✅ Observable and debuggable
- ✅ Extensible without modification

The system is ready for real-world deployment while maintaining clean code organization and following industry best practices.
