# Gemini MCP Server - Metadata Response Enhancement Plan

**Date**: 2025-10-27
**Goal**: Enhance query tool responses with structured JSON metadata similar to Perplexity MCP server
**Pattern**: Add metadata extraction without changing core architecture

## Current State

### Current Response Format (Text-based)
```
[Session: abc123]

[Stats: 3 turns, 2 tool calls, 1 reasoning steps]

Final answer text here...
```

**Issues:**
- Hard to parse for AI agents
- Metadata mixed with content
- No structured access to tool usage details
- Missing: tool execution results, reasoning traces, error information

## Target State

### New Response Format (Structured JSON)

```json
{
  "content": "Final answer text here...",
  "metadata": {
    "execution": {
      "turnsUsed": 3,
      "toolCallsCount": 2,
      "reasoningStepsCount": 1,
      "maxTurnsReached": false
    },
    "tools": [
      {
        "name": "webfetch",
        "status": "success",
        "executionTime": 1234,
        "result": "Fetched content from..."
      },
      {
        "name": "mcp__filesystem__read_file",
        "status": "success",
        "executionTime": 56,
        "result": "File content..."
      }
    ],
    "reasoning": [
      {
        "turn": 1,
        "thought": "I need to fetch web content...",
        "decision": "use webfetch tool"
      }
    ],
    "mcpServers": [
      {
        "name": "filesystem",
        "toolsUsed": ["read_file"],
        "callsCount": 1
      }
    ]
  },
  "session": {
    "sessionId": "abc123",
    "messageCount": 6
  },
  "usage": {
    "inputTokens": 1234,
    "outputTokens": 567
  }
}
```

**Benefits:**
- AI agents can analyze tool usage patterns
- Debugging tool execution issues easier
- Track MCP server utilization
- Understand reasoning process
- Monitor performance metrics

## Implementation Plan

### Task 1: Add Metadata Types

**Files:**
- Modify: `src/types/index.ts`

Add new interfaces:
```typescript
export interface ToolExecution {
  name: string;
  status: 'success' | 'error';
  executionTime: number;
  result?: string;
  error?: string;
}

export interface ReasoningStep {
  turn: number;
  thought: string;
  decision: string;
}

export interface MCPServerUsage {
  name: string;
  toolsUsed: string[];
  callsCount: number;
}

export interface ExecutionMetadata {
  turnsUsed: number;
  toolCallsCount: number;
  reasoningStepsCount: number;
  maxTurnsReached: boolean;
}

export interface FormattedQueryResponse {
  content: string;
  metadata: {
    execution: ExecutionMetadata;
    tools: ToolExecution[];
    reasoning: ReasoningStep[];
    mcpServers: MCPServerUsage[];
  };
  session?: {
    sessionId: string;
    messageCount: number;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

**Commit:** `git commit -m "feat: add metadata response types"`

---

### Task 2: Collect Tool Execution Data

**Files:**
- Modify: `src/agentic/AgenticLoop.ts`

Update RunState to track tool executions:
```typescript
// In RunState.ts, add:
export interface ToolExecutionRecord {
  name: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'error';
  result?: string;
  error?: string;
}

export class RunState {
  // ... existing fields ...
  public toolExecutions: ToolExecutionRecord[] = [];

  recordToolExecution(record: ToolExecutionRecord) {
    this.toolExecutions.push(record);
  }
}

// In AgenticLoop.ts, update executeTools():
private async executeTools(toolCalls: ToolCall[], context: RunContext, state: RunState) {
  for (const tool of toolCalls) {
    const startTime = Date.now();
    try {
      const result = await this.toolRegistry.executeTool(tool.name, tool.input);
      const endTime = Date.now();

      state.recordToolExecution({
        name: tool.name,
        startTime,
        endTime,
        status: 'success',
        result: result.content.substring(0, 200) // Truncate for metadata
      });

      // ... existing code ...
    } catch (error) {
      const endTime = Date.now();

      state.recordToolExecution({
        name: tool.name,
        startTime,
        endTime,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });

      // ... existing error handling ...
    }
  }
}
```

**Commit:** `git commit -m "feat: track tool execution data in AgenticLoop"`

---

### Task 3: Collect Reasoning Traces

**Files:**
- Modify: `src/agentic/ResponseProcessor.ts`

Track reasoning from Gemini responses:
```typescript
// In RunState.ts, add:
export interface ReasoningRecord {
  turn: number;
  thought: string;
  decision: string;
}

export class RunState {
  // ... existing fields ...
  public reasoningTraces: ReasoningRecord[] = [];

  recordReasoning(record: ReasoningRecord) {
    this.reasoningTraces.push(record);
  }
}

// In ResponseProcessor.ts:
export class ResponseProcessor {
  process(response: GenerateContentResult, state: RunState): ProcessedResponse {
    // ... existing parsing ...

    // Extract reasoning if present
    if (response.thinking) {
      state.recordReasoning({
        turn: state.currentTurn,
        thought: response.thinking.substring(0, 500), // Truncate
        decision: toolCalls.length > 0
          ? `use tools: ${toolCalls.map(t => t.name).join(', ')}`
          : 'respond directly'
      });
    }

    // ... rest of code ...
  }
}
```

**Commit:** `git commit -m "feat: collect reasoning traces from Gemini responses"`

---

### Task 4: Track MCP Server Usage

**Files:**
- Modify: `src/agentic/AgenticLoop.ts` or `src/tools/ToolRegistry.ts`

Aggregate MCP server usage:
```typescript
// Helper function
function aggregateMCPServerUsage(toolExecutions: ToolExecutionRecord[]): MCPServerUsage[] {
  const mcpTools = toolExecutions.filter(t => t.name.startsWith('mcp__'));
  const serverMap = new Map<string, Set<string>>();

  for (const tool of mcpTools) {
    // Extract server name from "mcp__servername__toolname"
    const parts = tool.name.split('__');
    if (parts.length >= 3) {
      const serverName = parts[1];
      const toolName = parts.slice(2).join('__');

      if (!serverMap.has(serverName)) {
        serverMap.set(serverName, new Set());
      }
      serverMap.get(serverName)!.add(toolName);
    }
  }

  return Array.from(serverMap.entries()).map(([name, tools]) => ({
    name,
    toolsUsed: Array.from(tools),
    callsCount: mcpTools.filter(t => t.name.includes(`__${name}__`)).length
  }));
}
```

**Commit:** `git commit -m "feat: add MCP server usage aggregation"`

---

### Task 5: Create ResponseFormatter

**Files:**
- Create: `src/utils/ResponseFormatter.ts`

Format agentic loop results into structured metadata:
```typescript
import { FormattedQueryResponse, ToolExecution, ReasoningStep, MCPServerUsage, ExecutionMetadata } from '../types/index.js';

export class ResponseFormatter {
  format(
    result: any, // AgenticLoop result
    sessionId?: string,
    messageCount?: number
  ): FormattedQueryResponse {
    return {
      content: result.finalOutput,
      metadata: {
        execution: this.buildExecutionMetadata(result),
        tools: this.buildToolExecutions(result.state.toolExecutions),
        reasoning: this.buildReasoningSteps(result.state.reasoningTraces),
        mcpServers: this.aggregateMCPServers(result.state.toolExecutions)
      },
      ...(sessionId && {
        session: {
          sessionId,
          messageCount: messageCount || 0
        }
      }),
      ...(result.usage && {
        usage: {
          inputTokens: result.usage.inputTokens || 0,
          outputTokens: result.usage.outputTokens || 0
        }
      })
    };
  }

  private buildExecutionMetadata(result: any): ExecutionMetadata {
    return {
      turnsUsed: result.turnsUsed,
      toolCallsCount: result.toolCallsCount,
      reasoningStepsCount: result.reasoningStepsCount,
      maxTurnsReached: result.turnsUsed >= 10
    };
  }

  private buildToolExecutions(records: any[]): ToolExecution[] {
    return records.map(record => ({
      name: record.name,
      status: record.status,
      executionTime: record.endTime - record.startTime,
      ...(record.result && { result: record.result }),
      ...(record.error && { error: record.error })
    }));
  }

  private buildReasoningSteps(traces: any[]): ReasoningStep[] {
    return traces.map(trace => ({
      turn: trace.turn,
      thought: trace.thought,
      decision: trace.decision
    }));
  }

  private aggregateMCPServers(toolExecutions: any[]): MCPServerUsage[] {
    // Same as Task 4 implementation
  }
}
```

**Commit:** `git commit -m "feat: add ResponseFormatter for metadata extraction"`

---

### Task 6: Update QueryHandler

**Files:**
- Modify: `src/handlers/QueryHandler.ts`

Use ResponseFormatter to return structured JSON:
```typescript
import { ResponseFormatter } from '../utils/ResponseFormatter.js';

export class QueryHandler {
  private responseFormatter: ResponseFormatter;

  constructor(...) {
    // ... existing code ...
    this.responseFormatter = new ResponseFormatter();
  }

  async handle(input: QueryInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // ... existing execution code ...

      const result = await this.agenticLoop.run(...);

      // Update conversation history
      if (this.enableConversations && sessionId) {
        for (const msg of result.messages) {
          this.conversationManager.addMessage(sessionId, msg);
        }
      }

      // Format response with structured metadata
      const messageCount = this.conversationManager?.getHistory(sessionId || '').length || 0;
      const formatted = this.responseFormatter.format(
        result,
        sessionId,
        messageCount
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(formatted, null, 2)
          }
        ]
      };
    } catch (error) {
      // ... error handling ...
    }
  }
}
```

**Commit:** `git commit -m "feat: return structured JSON with metadata in QueryHandler"`

---

## Summary

**Changes Required:**
1. New types for tool execution, reasoning, MCP usage
2. Collect tool execution data in AgenticLoop
3. Collect reasoning traces in ResponseProcessor
4. Aggregate MCP server usage
5. Create ResponseFormatter utility
6. Update QueryHandler to return JSON

**Backward Compatibility:**
- ❌ Breaking change: Response format changes from text to JSON
- ⚠️ Clients must parse JSON response

**Alternative Approach:**
- Add `format` parameter to query tool: 'text' (default, current) or 'json' (new)
- Maintain backward compatibility

**Estimated Effort:** 4-6 tasks, 1-2 days

**Benefits:**
- AI agents can analyze execution patterns
- Better debugging of tool usage
- Track which MCP servers are being used
- Understand reasoning process
