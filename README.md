# vertex-mcp-server

An MCP (Model Context Protocol) server that enables AI assistants like Claude to query Google Cloud Vertex AI models for cross-validation and alternative perspectives.

## Purpose

This server allows AI systems to:
- Send queries to Vertex AI models (Gemini, PaLM, Codey, etc.)
- Cross-validate responses by comparing outputs from different AI models
- Get alternative perspectives on questions or problems
- Leverage Google's Vertex AI models alongside other AI assistants
- Search and fetch information similar to ChatGPT's browsing capability

## Prerequisites

- Node.js 18 or higher
- Google Cloud Platform account with Vertex AI API enabled
- Google Cloud credentials configured (Application Default Credentials or service account)

## Installation

### From Source

```bash
git clone https://github.com/mnthe/vertex-mcp-server.git
cd vertex-mcp-server
npm install
npm run build
```

### Using npm (once published)

```bash
npm install -g vertex-mcp-server
```

## Configuration

### 1. Set up Google Cloud Authentication

You need to authenticate with Google Cloud. Choose one of these methods:

**Option A: Application Default Credentials (Recommended for local development)**
```bash
gcloud auth application-default login
```

**Option B: Service Account Key**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### 2. Set Environment Variables

Set your Google Cloud project ID and location (using standard Vertex AI SDK environment variables):

```bash
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"  # Optional, defaults to us-central1
```

Or use custom environment variables (backward compatibility):

```bash
export VERTEX_PROJECT_ID="your-gcp-project-id"
export VERTEX_LOCATION="us-central1"
```

### 3. Configure Model and Agent Settings

The server operates as an agent with configurable model parameters:

```bash
export VERTEX_MODEL="gemini-1.5-flash-002"  # Model to use
export VERTEX_TEMPERATURE="1.0"             # Temperature (0.0-2.0)
export VERTEX_MAX_TOKENS="8192"             # Max output tokens
export VERTEX_TOP_P="0.95"                  # Top-p sampling
export VERTEX_TOP_K="40"                    # Top-k sampling
```

These settings apply to all queries made through the MCP server.

### 4. (Optional) Enable Agent Mode Features

**Multi-turn Conversations:**
```bash
export VERTEX_ENABLE_CONVERSATIONS="true"   # Enable conversation tracking
export VERTEX_SESSION_TIMEOUT="3600"        # Session timeout (seconds)
export VERTEX_MAX_HISTORY="10"              # Max messages in history
```

When enabled, the query tool supports session IDs for multi-turn conversations with context preservation.

### 5. Enable Vertex AI API

Ensure the Vertex AI API is enabled in your Google Cloud project:

```bash
gcloud services enable aiplatform.googleapis.com --project=your-gcp-project-id
```

## Usage

### Running the Server

#### For Development
```bash
npm run dev
```

#### After Building
```bash
node build/index.js
```

### Configuring with Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vertex-ai": {
      "command": "node",
      "args": ["/absolute/path/to/vertex-mcp-server/build/index.js"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "VERTEX_MODEL": "gemini-1.5-flash-002",
        "VERTEX_TEMPERATURE": "1.0",
        "VERTEX_MAX_TOKENS": "8192",
        "VERTEX_TOP_P": "0.95",
        "VERTEX_TOP_K": "40"
      }
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "vertex-ai": {
      "command": "vertex-mcp-server",
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-gcp-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "VERTEX_MODEL": "gemini-1.5-flash-002"
      }
    }
  }
}
```

## Available Tools

### query

Query Google Cloud Vertex AI with a prompt. The model and parameters are configured via environment variables. Supports multi-turn conversations when Agent Mode is enabled.

**Parameters:**
- `prompt` (string, required): The prompt to send to Vertex AI
- `sessionId` (string, optional): Conversation session ID for multi-turn conversations (when `VERTEX_ENABLE_CONVERSATIONS=true`)

**Configuration (via environment variables):**
- `VERTEX_MODEL`: The model to use (default: `gemini-1.5-flash-002`)
  - Supports: Gemini models, PaLM 2, Codey, and other Vertex AI models
- `VERTEX_TEMPERATURE`: Response randomness 0.0-2.0 (default: 1.0)
- `VERTEX_MAX_TOKENS`: Maximum tokens in response (default: 8192)
- `VERTEX_TOP_P`: Nucleus sampling parameter (default: 0.95)
- `VERTEX_TOP_K`: Top-k sampling parameter (default: 40)

**Agent Mode (Conversations):**
- `VERTEX_ENABLE_CONVERSATIONS`: Enable multi-turn conversations (default: false)
- `VERTEX_SESSION_TIMEOUT`: Session timeout in seconds (default: 3600)
- `VERTEX_MAX_HISTORY`: Maximum messages in history (default: 10)

**Example Usage in Claude:**

```
Can you use the query tool to ask: "What are the key differences between Python and JavaScript?"
```

### search

Search for information using Vertex AI. Returns a list of relevant search results following the OpenAI MCP specification.

**Parameters:**
- `query` (string, required): The search query

**Returns:**
A JSON object with a `results` array, where each result contains:
- `id`: Unique identifier for the document
- `title`: Human-readable title
- `url`: Canonical URL for citation

**Example Usage in Claude:**

```
Use the search tool to find information about "latest developments in quantum computing"
```

### fetch

Fetch the full contents of a search result document by its ID. Follows the OpenAI MCP specification for fetch tools.

**Parameters:**
- `id` (string, required): The unique identifier for the document (from search results)

**Returns:**
A JSON object containing:
- `id`: Unique identifier
- `title`: Document title
- `text`: Full text content
- `url`: Document URL
- `metadata`: Optional metadata about the document

**Example Usage in Claude:**

```
First use search to find documents, then use fetch with the document ID to get full contents
```

## Agent Mode

The server supports advanced Agent mode features for enhanced capabilities:

### Multi-turn Conversations

When `VERTEX_ENABLE_CONVERSATIONS=true`, the server maintains conversation context across multiple queries:

**Benefits:**
- Context preservation across turns
- Natural multi-turn dialogues
- Automatic session management
- Configurable history limits

**Usage Example:**
```
1. First query: "What is machine learning?" (auto-creates session)
2. Follow-up: "Can you explain supervised learning in detail?" (uses same sessionId from response)
3. Continue: "Give me an example of a supervised learning algorithm" (maintains full context)
```

The server automatically includes session IDs in responses when conversation mode is enabled. Sessions expire after the configured timeout period (`VERTEX_SESSION_TIMEOUT`).

### Future Agent Mode Features

The following features are planned for implementation:

1. **Chain of Thought Reasoning**: Multi-step internal reasoning before responding
2. **MCP-to-MCP Connectivity**: Connect to other MCP servers for task delegation
3. **Agentic Workflows**: Complex multi-step task execution

See `AGENT_MODE_PLAN.md` for detailed implementation plans.

## Example Use Cases

1. **Cross-Validation**: Ask Claude to compare its response with Vertex AI's response
   ```
   Please answer this question, then use the query tool to get Vertex AI's perspective and compare the answers.
   ```

2. **Alternative Viewpoints**: Get multiple AI perspectives on a problem
   ```
   Use the query tool to get another AI's opinion on [topic], then provide your own analysis.
   ```

3. **Information Retrieval**: Use the search and fetch tools for finding information
   ```
   Use the search tool to find recent research papers on machine learning optimization, then use fetch to get the full content of the most relevant result.
   ```

## Development

### Project Structure
```
vertex-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

### Building
```bash
npm run build
```

### Watching for Changes
```bash
npm run watch
```

### Running in Development Mode
```bash
npm run dev
```

## Troubleshooting

### Authentication Issues

If you see authentication errors:
1. Verify your Google Cloud credentials are set up correctly
2. Check that `VERTEX_PROJECT_ID` is set correctly
3. Ensure the Vertex AI API is enabled in your project
4. Verify you have the necessary IAM permissions (Vertex AI User role)

### Model Not Found

If you get "model not found" errors:
1. Check the model name is correct (e.g., `gemini-1.5-flash-002`)
2. Verify the model is available in your region
3. Some models may require allowlisting - check Google Cloud console

### Connection Issues

If the MCP server isn't connecting:
1. Check the path to the build/index.js file is correct
2. Verify Node.js is in your PATH
3. Check the Claude Desktop logs for error messages

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
