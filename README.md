# gemini-mcp-server

An intelligent MCP (Model Context Protocol) server that enables AI assistants to query Google AI (Gemini models) via **Vertex AI or Google AI Studio** with **agentic capabilities** - automatic tool selection, multi-turn reasoning, MCP-to-MCP delegation, and **multimodal input support**.

## Purpose

This server provides:
- **Agentic Loop**: Turn-based execution with automatic tool selection and reasoning
- **Query Gemini**: Access Gemini models via Vertex AI or Google AI Studio for cross-validation
- **Multimodal Support**: Send images, audio, video, and code files alongside text prompts
- **Tool Execution**: Built-in WebFetch + integration with external MCP servers
- **Multi-turn Conversations**: Maintain context across queries with session management
- **Reasoning Traces**: File-based logging of AI thinking processes

## Key Features

### 🎨 Multimodal Input Support
Send images, audio, video, and code files to Gemini:
- **Images**: JPEG, PNG, WebP, HEIC
- **Videos**: MP4, MOV, AVI, WebM, and more
- **Audio**: MP3, WAV, AAC, FLAC, and more
- **Documents/Code**: PDF, text files, code files (Python, JavaScript, etc.)
- Support for both base64-encoded inline data and Cloud Storage URIs
- See [MULTIMODAL.md](MULTIMODAL.md) for detailed documentation

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
- Google Cloud Platform account (for Vertex AI) OR Google AI Studio account
- Google Cloud credentials configured (for Vertex AI mode)

## Quick Start

### Installation

#### Option 1: npx (Recommended)
```bash
npx -y github:mnthe/gemini-mcp-server
```

#### Option 2: From Source
```bash
git clone https://github.com/mnthe/gemini-mcp-server.git
cd gemini-mcp-server
npm install
npm run build
```

### Authentication

The gen-ai SDK supports multiple authentication methods. For Vertex AI mode:

**Application Default Credentials (Recommended):**
```bash
gcloud auth application-default login
```

**Or use Service Account:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

For Google AI Studio mode, see the [gen-ai SDK documentation](https://googleapis.github.io/js-genai/release_docs/index.html).

### Configuration

**Required Environment Variables:**
```bash
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

**Optional Model Settings:**
```bash
export GEMINI_MODEL="gemini-2.5-pro"
export GEMINI_TEMPERATURE="1.0"
export GEMINI_MAX_TOKENS="8192"
export GEMINI_TOP_P="0.95"
export GEMINI_TOP_K="40"
```

**Optional Agentic Features:**
```bash
# Multi-turn conversations
export GEMINI_ENABLE_CONVERSATIONS="true"
export GEMINI_SESSION_TIMEOUT="3600"
export GEMINI_MAX_HISTORY="10"

# Logging configuration
export GEMINI_DISABLE_LOGGING="false"      # Set to 'true' to disable file-based logging
export GEMINI_LOG_DIR="/path/to/logs"      # Custom log directory (default: ./logs)
export GEMINI_LOG_TO_STDERR="true"         # Set to 'true' to pipe logs to stderr for debugging

# External MCP servers (for tool delegation)
export GEMINI_MCP_SERVERS='[
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
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_MODEL": "gemini-2.5-pro",
        "GEMINI_ENABLE_CONVERSATIONS": "true"
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
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_MODEL": "gemini-2.5-pro"
      }
    }
  }
}
```

**Other MCP Clients** (Generic stdio):
```bash
# Command to run
npx -y github:mnthe/gemini-mcp-server

# Or direct execution
node /path/to/gemini-mcp-server/build/index.js
```

## Available Tools

### query

Main agentic entrypoint that handles multi-turn execution with automatic tool selection and **multimodal input support**.

**Parameters:**
- `prompt` (string, required): The text prompt to send
- `sessionId` (string, optional): Conversation session ID
- `parts` (array, optional): Multimodal content parts (images, audio, video, documents)

**How It Works:**
1. Analyzes the prompt and conversation history (including multimodal content)
2. Decides whether to use tools or respond directly
3. Executes tools in parallel if needed (WebFetch, MCP tools)
4. Retries failed tools with exponential backoff
5. Falls back to Gemini knowledge if tools fail
6. Continues for up to 10 turns until final answer

**Examples:**
```
# Simple text query
query: "What is the capital of France?"

# Complex query with tool usage
query: "Fetch the latest news from https://example.com/news and summarize"
→ Automatically uses WebFetch tool
→ Synthesizes content into answer

# Image analysis (multimodal)
query: "What's in this image?"
parts: [{ inlineData: { mimeType: "image/jpeg", data: "<base64>" } }]

# Multi-turn conversation
query: "What is machine learning?" (sessionId auto-created)
query: "Give me an example" (uses sessionId from previous response)
```

**Multimodal Support:**
See [MULTIMODAL.md](MULTIMODAL.md) for detailed documentation on:
- Supported file types (images, audio, video, documents)
- Base64 inline data vs Cloud Storage URIs
- Usage examples
- Best practices and limitations

**Response Includes:**
- Final answer
- Session ID (if conversations enabled)
- Statistics: turns used, tool calls, reasoning steps

### search

Search for information using Gemini (OpenAI MCP spec).

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
│   └── GeminiAIService.ts   # Gemini API (with thinkingConfig)
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
    └── GeminiAIMCPServer.ts
```

See [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Advanced Usage

### External MCP Servers

Connect to external MCP servers for extended capabilities:

**Stdio (subprocess):**
```bash
export GEMINI_MCP_SERVERS='[
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
export GEMINI_MCP_SERVERS='[
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
export GEMINI_DISABLE_LOGGING="true"
```

To use a custom log directory:
```bash
export GEMINI_LOG_DIR="/path/to/custom/logs"
```

To pipe logs to stderr for debugging (useful for seeing logs in MCP client output):
```bash
export GEMINI_LOG_TO_STDERR="true"
```

**Note:** When `GEMINI_LOG_TO_STDERR` is enabled, logs are written to stderr instead of files. This is useful for debugging MCP server issues as the logs will appear in the MCP client's log output (e.g., Claude Desktop logs).

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

### MCP Server Connection Issues

If the MCP server appears to be "dead" or disconnects unexpectedly:

**Enable stderr logging to see what's happening:**
```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GEMINI_LOG_TO_STDERR": "true"
      }
    }
  }
}
```

This will pipe all server logs to stderr, making them visible in your MCP client's logs (e.g., Claude Desktop logs at `~/Library/Logs/Claude/mcp*.log` on macOS). This helps diagnose startup issues, authentication errors, or crashes.

### Log Directory Errors
If you encounter errors like `ENOENT: no such file or directory, mkdir './logs'`:

**Quick Fix:** Disable logging when running via npx:
```bash
export GEMINI_DISABLE_LOGGING="true"
```

**Alternative:** Set a custom log directory with write permissions:
```bash
export GEMINI_LOG_DIR="/tmp/gemini-logs"
```

When using Claude Desktop or other MCP clients, add the environment variable:
```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GEMINI_DISABLE_LOGGING": "true"
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
- Verify MCP server configurations in `GEMINI_MCP_SERVERS`
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
