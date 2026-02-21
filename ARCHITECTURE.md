# Architecture Documentation

## Overview

The Gemini AI MCP Server implements an **intelligent agentic loop** inspired by the OpenAI Agents SDK. The architecture supports turn-based execution, automatic tool selection, parallel tool execution, and robust error handling.

**Last Updated**: 2026-02-21

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

The codebase is organized by architectural layers for better maintainability. See [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) for the complete directory structure and detailed organization rationale.

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
- Gemini API communication via `@google/genai` SDK
- ThinkingConfig support for reasoning mode (Gemini 2.5 and 3 series)
- Image generation via native image models
- Response text and image extraction

**Key Methods**:
```typescript
async query(
  prompt: string,
  options: QueryOptions,
  multimodalParts?: MultimodalPart[]
): Promise<string>

async generateImage(
  prompt: string,
  options: ImageGenerationOptions
): Promise<{ images: GeneratedImage[]; text?: string }>
```

**QueryOptions**:
```typescript
interface QueryOptions {
  enableThinking?: boolean;
  thinkingLevel?: ThinkingLevel;  // Gemini 3 models: MINIMAL | LOW | MEDIUM | HIGH
  mediaResolution?: string;       // Gemini 3 models: 'low' | 'medium' | 'high'
  model?: string;                 // Per-request model override
}
```

**ImageGenerationOptions**:
```typescript
interface ImageGenerationOptions {
  model?: string;        // Default: 'gemini-2.5-flash-image'
  aspectRatio?: string;  // e.g., '1:1', '16:9', '9:16'
  imageSize?: string;    // '1K' | '2K' | '4K'
}
```

**Gemini 3 Model Detection**:
- Models matching `/gemini[-_]?3/` pattern use `thinkingLevel` (not `thinkingBudget`)
- `ThinkingLevel.HIGH` is the default for Gemini 3 models
- Gemini 2.5 and earlier models use `thinkingBudget: -1` (auto)

**Features**:
- Dynamic generation config per query
- Model-aware thinking config (Gemini 2.5 vs Gemini 3 API differences)
- Image generation with base64 inline data extraction
- Response parsing with error handling
- Vertex AI mode via `@google/genai` SDK

### 8. ImageGenerationHandler (Image Requests)

**Location**: `src/handlers/ImageGenerationHandler.ts`

**Responsibilities**:
- Validate and route image generation requests
- Coordinate with GeminiAIService to generate images
- Save generated images to local filesystem via imageSaver
- Return image data and file paths as MCP content blocks

**Key Method**:
```typescript
async handle(
  input: ImageGenerationInput
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }>
```

**Response Format**:
Returns an array of MCP content blocks:
1. `text` block: JSON with `{ images: [{ filePath, mimeType }], text }`
2. `image` block(s): base64-encoded image data with MIME type

**Configuration**: Uses `config.imageOutputDir` (defaults to `getDefaultImageDir()` from imageSaver)

### 9. Logger (File-based Logging)

**Location**: `src/utils/Logger.ts`

**Responsibilities**:
- Log execution traces to files
- Separate reasoning log for analysis
- Session-based log organization
- Automatic log directory creation

**Log Files**:
- `logs/general.log`: All logs (info, error, tool calls)
- `logs/reasoning.log`: Thinking traces only

### 10. imageSaver (Image File Utilities)

**Location**: `src/utils/imageSaver.ts`

**Responsibilities**:
- Determine platform-appropriate default image output directory
- Save base64-encoded image data to disk
- Generate timestamped, indexed filenames for images

**Exported Functions**:
```typescript
// Returns ~/Pictures/gemini-generated on macOS, Windows, Linux
// Falls back to ~/gemini-generated on other platforms
function getDefaultImageDir(): string

// Decodes base64 data and writes to outputDir/filename
// Creates output directory if it does not exist
function saveImage(base64Data: string, outputDir: string, filename: string): string

// Returns e.g. "img-20260221143000-001.png" or "img-20260221143000-001.jpg"
function generateImageFilename(index: number, mimeType: string): string
```

**Filename Format**: `img-{YYYYMMDDHHmmss}-{NNN}.{ext}` where ext is `jpg` for `image/jpeg`, `png` otherwise.

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

### Image Generation Flow

```
1. MCP Client → GeminiAIMCPServer (gemini_generate_image tool call)
   ↓
2. ImageGenerationSchema.parse(input) → validated ImageGenerationInput
   ↓
3. ImageGenerationHandler.handle(input)
   ├─ GeminiAIService.generateImage(prompt, { model, aspectRatio, imageSize })
   │  ├─ Calls Vertex AI with responseModalities: ['TEXT', 'IMAGE']
   │  └─ extractImages() → { images: GeneratedImage[], text? }
   │
   ├─ For each image:
   │  ├─ generateImageFilename(index, mimeType) → "img-{timestamp}-{NNN}.png"
   │  └─ saveImage(base64Data, imageOutputDir, filename) → saved file path
   │
   └─ Build MCP content blocks:
      ├─ text block: JSON { images: [{ filePath, mimeType }], text }
      └─ image block(s): { type: 'image', data: base64, mimeType }
   ↓
4. Return content array to MCP client
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

## Schemas

All tool inputs are validated via Zod schemas defined in `src/schemas/index.ts`.

### QuerySchema

Validates the `gemini_query` tool input:

```typescript
z.object({
  prompt: z.string(),
  sessionId: z.string().optional(),
  model: z.string().optional(),  // e.g., 'gemini-3-flash-preview', 'gemini-3-pro-preview'
  parts: z.array(MultimodalPartSchema).optional(),
})
```

### ImageGenerationSchema

Validates the `gemini_generate_image` tool input:

```typescript
z.object({
  prompt: z.string(),
  model: z.enum(['gemini-2.5-flash-image', 'gemini-3-pro-image-preview']).optional(),
  aspectRatio: z.enum(['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']).optional(),
  imageSize: z.enum(['1K', '2K', '4K']).optional(),  // 4K is Gemini 3 Pro Image only
})
```

### SearchSchema / FetchSchema

Validate `gemini_search` and `gemini_fetch` tool inputs (simple string wrappers).

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

### 7. System Prompt Override
- **Customizable Personas**: Configure AI assistant behavior via environment variable
- **Safe Design**: Only system prompt is overridable; tool instructions remain protected
- **Backward Compatible**: Optional feature - defaults to standard prompt
- **Benefit**: Domain-specific configurations (financial analyst, code reviewer, etc.)

## System Prompt Override Architecture

### Prompt Assembly Flow

```
Configuration (GEMINI_SYSTEM_PROMPT env var)
  ↓
GeminiAIMCPServer constructor
  ↓ (passes config.systemPrompt)
ToolRegistry constructor
  ↓
getToolDefinitionsText() - Assembles complete prompt:
  ├─ getSystemPromptSection()
  │  ├─ Custom: Uses GEMINI_SYSTEM_PROMPT value
  │  └─ Default: "You are a helpful AI assistant..."
  │
  ├─ getToolDefinitionsSection()
  │  └─ Auto-generated list of available tools
  │     (WebFetch + MCP tools)
  │
  └─ getToolInstructionsSection()
     └─ Standard tool call format (protected)
        TOOL_CALL: <name>
        ARGUMENTS: <json>
  ↓
Complete prompt used in AgenticLoop
```

### Design Boundaries

**Overridable**:
- System prompt (persona, role, behavior guidelines)

**Protected (Not Overridable)**:
- Tool definitions (auto-generated from registered tools)
- Tool call format (`TOOL_CALL: / ARGUMENTS:`)
- Tool execution logic
- Security validations (HTTPS-only, IP blocking)

### Multi-Persona Setup

Different MCP client instances can configure different personas:

```
Claude Desktop Config
├─ gemini-code: SYSTEM_PROMPT="Code reviewer..."
├─ gemini-finance: SYSTEM_PROMPT="Financial analyst..."
└─ gemini-research: SYSTEM_PROMPT="Research assistant..."

Each runs as separate process with independent:
- System prompt
- Tool registry
- Conversation state
- Log files
```

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
- `errors/` folder (SecurityError, ModelBehaviorError)
- `utils/` folder (Logger, imageSaver)
- `handlers/` folder (QueryHandler, SearchHandler, FetchHandler, ImageGenerationHandler)
- Gemini 3 model support (`gemini-3-flash-preview` default, `thinkingLevel` API)
- Image generation tool (`gemini_generate_image`) with filesystem persistence

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
