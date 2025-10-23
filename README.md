# vertex-mcp-server

An intelligent MCP (Model Context Protocol) server that enables AI assistants to query Google Cloud Vertex AI with **agentic capabilities** - automatic tool selection, multi-turn reasoning, and MCP-to-MCP delegation.

## Purpose

This server provides:
- **Agentic Loop**: Turn-based execution with automatic tool selection and reasoning
- **Query Vertex AI**: Access Gemini and other Vertex AI models for cross-validation
- **Tool Execution**: Built-in WebFetch + integration with external MCP servers
- **Multi-turn Conversations**: Maintain context across queries with session management
- **Reasoning Traces**: File-based logging of AI thinking processes

## Key Features

### 🤖 Intelligent Agentic Loop
Inspired by OpenAI Agents SDK, the server operates as an autonomous agent:
- **Turn-based execution** (up to 10 turns per query)
- **Automatic tool selection** based on LLM decisions
- **Parallel tool execution** with retry logic
- **Smart fallback** to Gemini knowledge when tools fail

### 🛠️ Built-in Tools
- **WebFetch**: Secure HTTPS-only web content fetching with private IP blocking
- **MCP Integration**: Dynamic discovery and execution of external MCP server tools

### 🔐 Security First
- HTTPS-only URL fetching
- Private IP address blocking (10.x, 172.16.x, 192.168.x, 127.x)
- DNS validation to prevent SSRF attacks

### 📝 Observability
- File-based logging (`logs/general.log`, `logs/reasoning.log`)
- Configurable log directory or disable logging for npx/containerized environments
- Detailed execution traces for debugging
- Turn and tool usage statistics

## Prerequisites

- Node.js 18 or higher
- Google Cloud Platform account with Vertex AI API enabled
- Google Cloud credentials configured

## Quick Start

### Installation

#### Option 1: npx (Recommended)
```bash
npx -y github:mnthe/vertex-mcp-server
```

#### Option 2: From Source
```bash
git clone https://github.com/mnthe/vertex-mcp-server.git
cd vertex-mcp-server
npm install
npm run build
```

### Authentication

**Application Default Credentials (Recommended):**
```bash
gcloud auth application-default login
```

**Or use Service Account:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### Configuration

**Required Environment Variables:**
```bash
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

**Optional Model Settings:**
```bash
export VERTEX_MODEL="gemini-1.5-flash-002"
export VERTEX_TEMPERATURE="1.0"
export VERTEX_MAX_TOKENS="8192"
export VERTEX_TOP_P="0.95"
export VERTEX_TOP_K="40"
```

**Optional Agentic Features:**
```bash
# Multi-turn conversations
export VERTEX_ENABLE_CONVERSATIONS="true"
export VERTEX_SESSION_TIMEOUT="3600"
export VERTEX_MAX_HISTORY="10"

# Logging configuration
export VERTEX_DISABLE_LOGGING="false"      # Set to 'true' to disable file-based logging
export VERTEX_LOG_DIR="/path/to/logs"      # Custom log directory (default: ./logs)

# External MCP servers (for tool delegation)
export VERTEX_MCP_SERVERS='[
  {
    "name": "filesystem",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "./data"]
  },
  {
    "name": "web-search",
    "transport": "http",
    "url": "http://localhost:3000/mcp"
  }
]'
```

### MCP Client Integration

Add to your MCP client configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "vertex-ai": {
      "command": "npx",
      "args": ["-y", "github:mnthe/vertex-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "VERTEX_MODEL": "gemini-1.5-flash-002",
        "VERTEX_ENABLE_CONVERSATIONS": "true"
      }
    }
  }
}
```

**Claude Code** (`.claude.json` in project root):
```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/vertex-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "VERTEX_MODEL": "gemini-1.5-flash-002"
      }
    }
  }
}
```

**Other MCP Clients** (Generic stdio):
```bash
# Command to run
npx -y github:mnthe/vertex-mcp-server

# Or direct execution
node /path/to/vertex-mcp-server/build/index.js
```

## Available Tools

### query

Main agentic entrypoint that handles multi-turn execution with automatic tool selection.

**Parameters:**
- `prompt` (string, required): The prompt to send
- `sessionId` (string, optional): Conversation session ID

**How It Works:**
1. Analyzes the prompt and conversation history
2. Decides whether to use tools or respond directly
3. Executes tools in parallel if needed (WebFetch, MCP tools)
4. Retries failed tools with exponential backoff
5. Falls back to Gemini knowledge if tools fail
6. Continues for up to 10 turns until final answer

**Example:**
```
# Simple query
query: "What is the capital of France?"

# Complex query with tool usage
query: "Fetch the latest news from https://example.com/news and summarize"
→ Automatically uses WebFetch tool
→ Synthesizes content into answer

# Multi-turn conversation
query: "What is machine learning?" (sessionId auto-created)
query: "Give me an example" (uses sessionId from previous response)
```

**Response Includes:**
- Final answer
- Session ID (if conversations enabled)
- Statistics: turns used, tool calls, reasoning steps

### search

Search for information using Vertex AI (OpenAI MCP spec).

**Parameters:**
- `query` (string, required): Search query

**Returns:**
- `results`: Array of `{id, title, url}`

### fetch

Fetch full content of a search result (OpenAI MCP spec).

**Parameters:**
- `id` (string, required): Document ID from search results

**Returns:**
- `id`, `title`, `text`, `url`, `metadata`

## Architecture

### Agentic Loop

```
User Query
  ↓
┌─── Turn 1..10 Loop ───┐
│                        │
│  1. Build Prompt       │
│     + Tool Definitions │
│     + History          │
│                        │
│  2. Gemini Generation  │
│     (with thinking)    │
│                        │
│  3. Parse Response     │
│     - Reasoning?       │
│     - Tool Calls?      │
│     - Final Output?    │
│                        │
│  4. Execute Tools      │
│     (parallel + retry) │
│                        │
│  5. Check MaxTurns     │
│     Continue or Exit?  │
│                        │
└────────────────────────┘
  ↓
Final Result + Stats
```

### Project Structure

```
src/
├── agentic/           # Core agentic loop
│   ├── AgenticLoop.ts       # Main orchestrator
│   ├── RunState.ts          # Turn-based state management
│   ├── ResponseProcessor.ts # Parse Gemini responses
│   └── Tool.ts              # Tool interface (MCP standard)
│
├── mcp/               # MCP client implementation
│   ├── EnhancedMCPClient.ts # Unified stdio + HTTP client
│   ├── StdioMCPConnection.ts
│   └── HttpMCPConnection.ts
│
├── tools/             # Tool implementations
│   ├── WebFetchTool.ts      # Secure web fetching
│   └── ToolRegistry.ts      # Tool management + parallel execution
│
├── services/          # External services
│   └── VertexAIService.ts   # Gemini API (with thinkingConfig)
│
├── handlers/          # MCP tool handlers
│   ├── QueryHandler.ts
│   ├── SearchHandler.ts
│   └── FetchHandler.ts
│
├── managers/          # Business logic
│   └── ConversationManager.ts
│
├── common/            # Shared utilities
│   ├── errors/        # Custom errors
│   ├── types/         # TypeScript types
│   ├── schemas/       # Zod validation
│   ├── config/        # Configuration
│   └── utils/         # Logger
│
└── server/            # MCP server bootstrap
    └── VertexAIMCPServer.ts
```

See [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Advanced Usage

### External MCP Servers

Connect to external MCP servers for extended capabilities:

**Stdio (subprocess):**
```bash
export VERTEX_MCP_SERVERS='[
  {
    "name": "filesystem",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "./workspace"]
  }
]'
```

**HTTP:**
```bash
export VERTEX_MCP_SERVERS='[
  {
    "name": "api-server",
    "transport": "http",
    "url": "https://api.example.com/mcp",
    "headers": {"Authorization": "Bearer token"}
  }
]'
```

Tools from external servers are automatically discovered and made available to the agent.

### Reasoning Traces

Check logs for detailed execution traces (if logging is enabled):
```bash
tail -f logs/general.log     # All logs
tail -f logs/reasoning.log   # Gemini thinking process only
```

To disable logging when running via npx or in containerized environments:
```bash
export VERTEX_DISABLE_LOGGING="true"
```

To use a custom log directory:
```bash
export VERTEX_LOG_DIR="/path/to/custom/logs"
```

### Custom Tool Development

Tools follow MCP standard:

```typescript
import { BaseTool, ToolResult, RunContext } from './agentic/Tool.js';

export class MyTool extends BaseTool {
  name = 'my_tool';
  description = 'Description for LLM';
  parameters = {
    type: 'object',
    properties: {
      arg: { type: 'string', description: 'Argument' }
    },
    required: ['arg']
  };

  async execute(args: any, context: RunContext): Promise<ToolResult> {
    // Your implementation
    return {
      status: 'success',
      content: 'Result'
    };
  }
}
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Development Mode
```bash
npm run dev
```

## Troubleshooting

### Log Directory Errors
If you encounter errors like `ENOENT: no such file or directory, mkdir './logs'`:

**Quick Fix:** Disable logging when running via npx:
```bash
export VERTEX_DISABLE_LOGGING="true"
```

**Alternative:** Set a custom log directory with write permissions:
```bash
export VERTEX_LOG_DIR="/tmp/vertex-logs"
```

When using Claude Desktop or other MCP clients, add the environment variable:
```json
{
  "mcpServers": {
    "vertex-ai": {
      "command": "npx",
      "args": ["-y", "github:mnthe/vertex-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "VERTEX_DISABLE_LOGGING": "true"
      }
    }
  }
}
```

### Authentication Errors
1. Verify credentials: `gcloud auth application-default login`
2. Check project ID: `echo $GOOGLE_CLOUD_PROJECT`
3. Enable Vertex AI API: `gcloud services enable aiplatform.googleapis.com`

### Tool Execution Failures
- Check logs in `logs/general.log` (if logging is enabled)
- Verify MCP server configurations in `VERTEX_MCP_SERVERS`
- Ensure external servers are running (for HTTP transport)

### MaxTurns Exceeded
- Agent returns best-effort response after 10 turns
- Check if tools are repeatedly failing
- Review reasoning logs to understand loop behavior (if logging is enabled)

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [AGENTIC_LOOP_DESIGN.md](AGENTIC_LOOP_DESIGN.md) - Agentic loop design
- [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) - Code organization
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [BUILD.md](BUILD.md) - Build and release process

## License

MIT

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
