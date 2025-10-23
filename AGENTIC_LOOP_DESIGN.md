# Enhanced Agentic Loop Design

## Overview

This document outlines the enhanced agentic loop architecture for the Vertex MCP Server, inspired by the OpenAI Agents SDK patterns.

**Last Updated**: 2025-01-23
**Status**: Design Review Complete ✅

## Design Decisions (Finalized)

1. ✅ **Tool Format**: MCP standard format (industry standard)
2. ✅ **MCP Support**: Both stdio and HTTP
3. ✅ **Reasoning**: Gemini thinkingConfig + file-based logging
4. ✅ **State**: No serialization (chat server, logs sufficient)
5. ✅ **Parallelism**: Parallel tool execution for performance
6. ✅ **Tool Discovery**: Static with definitions in prompts
7. ✅ **Error Handling**: Retry → Fallback to Gemini knowledge
8. ✅ **Compatibility**: Always enabled, full replacement of old agents
9. ✅ **WebFetch**: HTTPS only, private IP blocking, smart extraction (nice-to-have)
10. ✅ **Logging**: File-based (stdout/stderr) for reasoning traces

## Current vs Enhanced Architecture

### Current Implementation

```
User Input
  ↓
Prompt Analyzer (keyword-based)
  ↓
Branch Decision (if-else)
  ├─ Reasoning Agent (fixed 3 steps)
  ├─ Delegation Agent (framework only)
  └─ Direct Vertex AI query
  ↓
Response + Session ID
```

**Limitations:**
- No turn-based loop (single execution path)
- No tool execution framework
- No state management or resumability
- No structured response processing
- Basic conversation tracking
- No error recovery or maxTurns protection

### Enhanced Architecture

```
User Input
  ↓
┌──────────────────────── Agentic Loop ────────────────────────┐
│                                                               │
│  Turn 1..N (max 10 turns)                                    │
│  ┌─────────────────────────────────────────┐                 │
│  │                                         │                 │
│  │  1. Build Prompt (Context + History)    │                 │
│  │     ├─ ConversationTracker (dedup)      │                 │
│  │     └─ RunState (current turn)          │                 │
│  │                                         │                 │
│  │  2. Vertex AI Generation                │                 │
│  │     └─ Reasoning extraction             │                 │
│  │                                         │                 │
│  │  3. Response Processing                 │                 │
│  │     ├─ Reasoning Item?                  │                 │
│  │     ├─ Tool Calls? ──────┐              │                 │
│  │     └─ Final Output?     │              │                 │
│  │                          │              │                 │
│  │  4. Tool Execution ◄─────┘              │                 │
│  │     ├─ MCP Tools (parallel)             │                 │
│  │     └─ WebFetch Tool                    │                 │
│  │                          │              │                 │
│  │  5. Append Results ◄─────┘              │                 │
│  │     └─ Update RunState                  │                 │
│  │                                         │                 │
│  │  6. Next Step Decision                  │                 │
│  │     ├─ Final Output? → Exit             │                 │
│  │     ├─ Tool Results? → Loop again       │                 │
│  │     └─ MaxTurns? → Error                │                 │
│  │                                         │                 │
│  └─────────────────────────────────────────┘                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
  ↓
Structured Result
  ├─ Final Output
  ├─ Reasoning Trace
  ├─ Tool Call History
  ├─ Token Usage
  └─ Session ID
```

## Core Components

### 0. Logger (File-based Logging)

```typescript
class Logger {
  private logDir: string
  private sessionId: string

  // Log levels
  info(message: string, data?: any): void
  error(message: string, error?: Error): void
  reasoning(step: ReasoningItem): void  // Special for thinking traces
  toolCall(tool: string, args: any): void
  toolResult(tool: string, result: any): void

  // Write to files
  private writeLog(level: string, message: string): void
  private writeReasoning(reasoning: string): void  // Separate reasoning log
}
```

### 1. RunState (State Management - No Serialization)

```typescript
class RunState {
  // Turn tracking
  currentTurn: number
  maxTurns: number

  // Message history (in-memory only)
  messages: Message[]
  generatedItems: RunItem[]

  // Context
  sessionId?: string
  context: Record<string, any>

  // Tracking
  toolCallHistory: ToolCallRecord[]
  reasoningSteps: ReasoningItem[]

  // Logging
  logger: Logger

  // Methods
  addMessage(message: Message): void
  addToolResult(result: ToolResult): void
  addReasoning(reasoning: ReasoningItem): void
  canContinue(): boolean

  // No serialization methods - chat server doesn't need persistence
}
```

### 2. Response Processor

```typescript
class ResponseProcessor {
  // Parse Gemini response into structured items
  process(response: string): ProcessedResponse {
    return {
      reasoningItems: ReasoningItem[]
      toolCalls: ToolCall[]
      finalOutput: string | null
      messageItems: MessageItem[]
    }
  }

  // Detect tool calls in response
  extractToolCalls(response: string): ToolCall[]

  // Extract reasoning/thinking
  extractReasoning(response: string): ReasoningItem[]

  // Determine if this is final output
  isFinalOutput(response: ProcessedResponse): boolean
}
```

### 3. Tool Framework (MCP Standard + Security)

```typescript
interface Tool {
  name: string
  description: string
  parameters: JSONSchema  // MCP standard parameter schema
  execute(args: any, context: RunContext): Promise<ToolResult>
}

interface ToolResult {
  status: 'success' | 'error'
  content: string
  metadata?: Record<string, any>
}

class ToolRegistry {
  private tools: Map<string, Tool>
  private logger: Logger

  // Register built-in tools
  registerWebFetch(): void
  registerMCPTools(mcpClient: EnhancedMCPClient): void

  // Execute tools in parallel with retry logic
  async executeTools(
    calls: ToolCall[],
    context: RunContext,
    maxRetries: number = 2
  ): Promise<ToolResult[]>

  // Get tool definitions for Gemini prompt
  getToolDefinitionsText(): string  // Format for inclusion in prompt
}

// Built-in tools
class WebFetchTool implements Tool {
  name = 'web_fetch'
  description = 'Fetch content from a URL and optionally extract main content'
  parameters = {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'HTTPS URL to fetch' },
      extract: { type: 'boolean', description: 'Extract main content (default: true)' }
    },
    required: ['url']
  }

  async execute({ url, extract = true }): Promise<ToolResult> {
    // Security checks
    if (!url.startsWith('https://')) {
      throw new SecurityError('Only HTTPS URLs allowed')
    }

    const hostname = new URL(url).hostname
    if (this.isPrivateIP(hostname)) {
      throw new SecurityError('Private IP addresses not allowed')
    }

    // Fetch and process
    const response = await fetch(url)
    let content = await response.text()

    if (extract) {
      content = this.extractMainContent(content)
    }

    return { status: 'success', content }
  }

  private isPrivateIP(hostname: string): boolean {
    // Check if IP is in private CIDR ranges
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
  }

  private extractMainContent(html: string): string {
    // Smart extraction: remove scripts, styles, extract text
  }
}

class MCPTool implements Tool {
  constructor(
    public name: string,
    private serverName: string,
    private toolName: string,
    private mcpClient: EnhancedMCPClient,
    public description: string,
    public parameters: JSONSchema
  )

  async execute(args: any): Promise<ToolResult> {
    return await this.mcpClient.callTool(
      this.serverName,
      this.toolName,
      args
    )
  }
}
```

### 4. Enhanced MCP Client (Stdio + HTTP)

```typescript
class EnhancedMCPClient {
  private stdioServers: Map<string, StdioMCPConnection>
  private httpServers: Map<string, HttpMCPConnection>
  private logger: Logger

  // Initialize from config
  async initialize(config: MCPServerConfig[]): Promise<void>

  // Discover tools from all servers (static at startup)
  async discoverTools(): Promise<Tool[]>

  // Call tool on appropriate server
  async callTool(
    serverName: string,
    toolName: string,
    args: any
  ): Promise<ToolResult>

  // Cleanup
  async shutdown(): Promise<void>
}

class StdioMCPConnection {
  // Spawn process: npx @modelcontextprotocol/server-xyz
  // Communicate via stdin/stdout
  // Parse MCP protocol messages
}

class HttpMCPConnection {
  // HTTP client for MCP over HTTP
  // POST /tools/list, POST /tools/call
}
```

### 5. Agentic Loop (Main Orchestrator with Retry Logic)

```typescript
class AgenticLoop {
  private vertexAI: VertexAIService
  private toolRegistry: ToolRegistry
  private responseProcessor: ResponseProcessor
  private logger: Logger

  async run(
    prompt: string,
    options: RunOptions
  ): Promise<RunResult> {
    const state = new RunState(options)
    state.logger.info(`Starting agentic loop for session ${state.sessionId}`)

    while (state.canContinue()) {
      state.currentTurn++
      state.logger.info(`Turn ${state.currentTurn}/${state.maxTurns}`)

      // 1. Build prompt with tool definitions
      const fullPrompt = this.buildPromptWithTools(state)

      // 2. Call Vertex AI (with thinkingConfig if reasoning detected)
      const useThinking = this.shouldUseThinking(state)
      const response = await this.vertexAI.query(fullPrompt, {
        enableThinking: useThinking
      })

      // 3. Process response
      const processed = this.responseProcessor.process(response)

      // 4. Handle reasoning (log to file)
      if (processed.reasoningItems.length > 0) {
        for (const reasoning of processed.reasoningItems) {
          state.logger.reasoning(reasoning)
          state.addReasoning(reasoning)
        }
      }

      // 5. Handle tool calls with retry logic
      if (processed.toolCalls.length > 0) {
        state.logger.info(`Detected ${processed.toolCalls.length} tool calls`)

        const results = await this.executeToolsWithRetry(
          processed.toolCalls,
          state,
          maxRetries: 2
        )

        // Check if all tools failed
        const allFailed = results.every(r => r.status === 'error')

        if (allFailed) {
          state.logger.error('All tools failed, falling back to Gemini knowledge')

          // Retry with instruction to use internal knowledge
          const fallbackPrompt = this.buildFallbackPrompt(state, results)
          const fallbackResponse = await this.vertexAI.query(fallbackPrompt)

          return this.buildResult(state, fallbackResponse)
        }

        // Add successful results to state
        for (const result of results) {
          state.addToolResult(result)
        }

        // Continue loop for next turn
        continue
      }

      // 6. Final output
      if (processed.finalOutput) {
        state.logger.info('Final output generated')
        return this.buildResult(state, processed.finalOutput)
      }

      // 7. Check max turns - return best effort instead of error
      if (state.currentTurn >= state.maxTurns) {
        state.logger.error(`Max turns (${state.maxTurns}) exceeded`)

        // Return best available response
        const bestEffort = this.buildBestEffortResponse(state)
        return this.buildResult(state, bestEffort)
      }
    }
  }

  private async executeToolsWithRetry(
    toolCalls: ToolCall[],
    state: RunState,
    maxRetries: number
  ): Promise<ToolResult[]> {
    // Parallel execution with per-tool retry logic
    return await Promise.all(
      toolCalls.map(async (call) => {
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            state.logger.toolCall(call.tool, call.args)
            const result = await this.toolRegistry.executeTool(call, state.context)
            state.logger.toolResult(call.tool, result)
            return result
          } catch (error) {
            lastError = error as Error
            state.logger.error(
              `Tool ${call.tool} attempt ${attempt} failed: ${error.message}`
            )

            if (attempt < maxRetries) {
              await this.sleep(1000 * attempt)  // Exponential backoff
            }
          }
        }

        // All retries failed
        return {
          status: 'error',
          content: `Tool execution failed: ${lastError?.message}`
        }
      })
    )
  }

  private buildBestEffortResponse(state: RunState): string {
    // Summarize what was accomplished
    const summary = `I attempted to answer your question but reached the maximum number of steps (${state.maxTurns}).

Here's what I found:
${state.toolCallHistory.map(t => `- Used ${t.tool}: ${t.result.content.substring(0, 100)}...`).join('\n')}

Based on this partial information and my knowledge, here's my best answer: [...]`

    return summary
  }

  private buildPromptWithTools(state: RunState): string {
    const toolDefs = this.toolRegistry.getToolDefinitionsText()
    const history = state.messages.map(m => `${m.role}: ${m.content}`).join('\n')

    return `${toolDefs}

CONVERSATION HISTORY:
${history}

Respond with either:
1. TOOL_CALL: <name> + ARGUMENTS: <json> if you need more information
2. Your final answer if you have enough information`
  }
}
```

### 6. Error Types

```typescript
class SecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityError'
  }
}

class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    public originalError: Error,
    public attempt: number
  ) {
    super(`Tool ${toolName} failed on attempt ${attempt}: ${originalError.message}`)
    this.name = 'ToolExecutionError'
  }
}

class ModelBehaviorError extends Error {
  constructor(
    public response: string,
    message: string
  ) {
    super(message)
    this.name = 'ModelBehaviorError'
  }
}

// Note: MaxTurnsExceededError removed - now returns best effort response
```

## Key Enhancements

### 1. Turn-Based Loop
- **OpenAI Pattern**: While loop with turn counter
- **Protection**: MaxTurns prevents infinite loops
- **State**: Each turn tracked with complete state

### 2. Structured Response Processing
- **OpenAI Pattern**: Parse responses into items (reasoning, tool calls, messages)
- **Benefit**: Clear separation of concerns
- **Extensible**: Easy to add new item types

### 3. Tool Execution Framework
- **OpenAI Pattern**: Dynamic tool discovery and parallel execution
- **For Chat MCP**: Focus on MCP tools + WebFetch
- **Benefit**: Extensible without code changes

### 4. Deduplication
- **OpenAI Pattern**: WeakSet-based tracking
- **Benefit**: Memory-efficient conversation tracking
- **Use Case**: Prevent sending same items multiple times

### 5. State Management
- **OpenAI Pattern**: RunState with serialization
- **Benefit**: Resumable conversations
- **Use Case**: Long-running or interrupted flows

### 6. Context Passing
- **OpenAI Pattern**: Shared context across tools
- **Benefit**: Tools can access session data, config, etc.
- **Use Case**: Tool personalization, access control

## Tool Call Format (MCP Standard)

Following MCP protocol standard for tool calls and results:

### Prompt Template with Tool Definitions

```
You are a helpful AI assistant with access to the following tools:

AVAILABLE TOOLS:
- web_fetch: Fetch content from a URL
  Parameters: { url: string, extract: boolean }
- mcp_filesystem_read: Read a file
  Parameters: { path: string }
- mcp_git_log: Get git commit history
  Parameters: { limit: number }

When you need to use a tool, respond with:
TOOL_CALL: <tool_name>
ARGUMENTS: <json_arguments>

Example:
TOOL_CALL: web_fetch
ARGUMENTS: {"url": "https://example.com", "extract": true}

When you have all information needed, provide your final answer without tool calls.

USER: {user_prompt}
```

### Gemini Response Patterns

**Pattern 1: Tool Call**
```
[Thinking: I need to fetch information from the web]

TOOL_CALL: web_fetch
ARGUMENTS: {"url": "https://ai.google.dev/news", "extract": true}
```

**Pattern 2: Final Answer**
```
Based on the information, here's the answer:
[Final response without TOOL_CALL marker]
```

### Tool Result Format (MCP Standard)

```
TOOL_RESULT: web_fetch
STATUS: success
CONTENT: [fetched content]
---
```

## Implementation Phases (Updated)

### Phase 1: Logging & Error Infrastructure
- [ ] Logger class (file-based, reasoning logs)
- [ ] Error types (SecurityError, ToolExecutionError, ModelBehaviorError)
- [ ] Log directory structure

### Phase 2: Core State & Processing
- [ ] RunState class (no serialization)
- [ ] ResponseProcessor (MCP format parsing)
- [ ] Tool framework interfaces

### Phase 3: MCP Client Implementation
- [ ] EnhancedMCPClient base
- [ ] StdioMCPConnection (subprocess communication)
- [ ] HttpMCPConnection (HTTP client)
- [ ] Tool discovery at startup

### Phase 4: Tool Implementation
- [ ] WebFetchTool (security guards: HTTPS, private IP check, extraction)
- [ ] MCPTool wrapper
- [ ] ToolRegistry with parallel execution

### Phase 5: Vertex AI Enhancement
- [ ] Update VertexAIService for thinkingConfig support
- [ ] Gemini thinking mode detection
- [ ] Prompt template with tool definitions

### Phase 6: Agentic Loop
- [ ] AgenticLoop orchestrator
- [ ] Turn-based execution
- [ ] Retry logic
- [ ] Fallback to Gemini knowledge
- [ ] Best-effort response on MaxTurns

### Phase 7: Integration & Cleanup
- [ ] Replace QueryHandler completely
- [ ] Remove old agents (ReasoningAgent, DelegationAgent, PromptAnalyzer)
- [ ] Update types and configs
- [ ] Testing with real MCP servers

## Benefits

1. **Robustness**: MaxTurns protection, structured error handling
2. **Extensibility**: Easy to add new tools without code changes
3. **Observability**: Complete trace of reasoning and tool calls
4. **Memory Efficiency**: WeakSet-based deduplication
5. **Resumability**: State serialization for long conversations
6. **Performance**: Parallel tool execution
7. **Standards-Based**: Follows proven patterns from OpenAI Agents SDK

## Compatibility

- **Backward Compatible**: Existing simple queries work unchanged
- **Opt-in Features**: Advanced features only used when needed
- **Graceful Degradation**: Falls back to simple mode if tools unavailable
