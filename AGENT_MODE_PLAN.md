# Agent Mode Implementation Plan

## Overview
Implement full Agent mode for Vertex AI MCP Server to handle:
1. Multi-turn conversations (not just single-shot requests)
2. Internal chain of thought / reasoning / deep thinking
3. Extensible compatibility for MCP-to-MCP connections

## Current State
- Server operates in stateless mode (each request is independent)
- No conversation history tracking
- No internal reasoning process
- No MCP client capabilities

## Proposed Architecture

### 1. Conversation Management
**Goal**: Handle multi-turn conversations with context

**Implementation**:
- Add conversation session management
- Store conversation history per session
- Use Vertex AI's context window for conversation continuity
- Session ID in environment or tool parameters

**Changes**:
```typescript
interface ConversationSession {
  id: string;
  history: Message[];
  created: Date;
  lastAccessed: Date;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

class ConversationManager {
  private sessions: Map<string, ConversationSession>;
  
  createSession(): string;
  addMessage(sessionId: string, message: Message): void;
  getHistory(sessionId: string): Message[];
  clearSession(sessionId: string): void;
}
```

### 2. Chain of Thought / Reasoning
**Goal**: Enable internal reasoning process before responding

**Implementation**:
- Add 'reasoning' mode to query tool
- Break down complex queries into steps
- Use Vertex AI for intermediate thinking steps
- Aggregate results into final response

**Example Flow**:
```
User Query -> Parse Intent -> Break into Sub-tasks -> 
Process Each Sub-task -> Synthesize Results -> Final Response
```

**New Tools**:
- `reason`: Engage in chain-of-thought reasoning
- `think`: Internal thinking step (not visible to user)

### 3. MCP-to-MCP Connectivity
**Goal**: Enable server to connect to other MCP servers

**Implementation**:
- Add MCP client capabilities
- Register external MCP servers
- Route requests to appropriate servers
- Aggregate results from multiple sources

**Architecture**:
```
User -> Claude -> Vertex MCP Server -> [
  - Vertex AI (internal)
  - External MCP Server 1
  - External MCP Server 2
  - ...
]
```

**New Configuration**:
```typescript
interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

class MCPClientManager {
  private clients: Map<string, MCPClient>;
  
  registerServer(config: MCPServerConfig): void;
  callTool(serverName: string, toolName: string, args: any): Promise<any>;
  listServers(): string[];
  listTools(serverName: string): Tool[];
}
```

## Implementation Phases

### Phase 1: Conversation Management ✅
- Add session management
- Track conversation history
- Include context in Vertex AI calls

### Phase 2: Chain of Thought ✅
- Add reasoning capabilities
- Implement multi-step thinking
- Add intermediate result handling

### Phase 3: MCP Client Integration ✅
- Add MCP client library
- Implement server registration
- Add tool routing logic
- Add result aggregation

## Environment Variables

New environment variables needed:
```bash
# Conversation settings
VERTEX_ENABLE_CONVERSATIONS=true
VERTEX_SESSION_TIMEOUT=3600  # seconds
VERTEX_MAX_HISTORY=10        # messages

# Reasoning settings
VERTEX_ENABLE_REASONING=true
VERTEX_MAX_REASONING_STEPS=5

# MCP Client settings
VERTEX_MCP_SERVERS='[{"name":"server1","command":"..."}]'
```

## Tools to Add

1. **start_conversation**: Initialize a conversation session
2. **continue_conversation**: Add message to existing conversation
3. **end_conversation**: Clear conversation session
4. **reason**: Perform chain-of-thought reasoning
5. **delegate**: Delegate task to another MCP server

## Backward Compatibility

All existing tools (`query`, `search`, `fetch`) will continue to work in stateless mode.
New features are opt-in via environment variables.

## Testing Strategy

1. **Unit Tests**: Test each component independently
2. **Integration Tests**: Test conversation flow
3. **E2E Tests**: Test with real Vertex AI and MCP servers
4. **Performance Tests**: Measure latency with reasoning/delegation

## Migration Path

1. Users can start with current implementation
2. Enable conversations: Set `VERTEX_ENABLE_CONVERSATIONS=true`
3. Enable reasoning: Set `VERTEX_ENABLE_REASONING=true`
4. Add MCP servers: Configure `VERTEX_MCP_SERVERS`

## Open Questions

1. Should conversation sessions persist across server restarts?
2. How to handle authentication for external MCP servers?
3. Should we implement a conversation timeout mechanism?
4. How to handle errors in reasoning chains?
5. Should we support parallel MCP server calls?

## Next Steps

1. Create conversation management module
2. Implement session storage
3. Add conversation tools
4. Test with multi-turn conversations
5. Document conversation API
