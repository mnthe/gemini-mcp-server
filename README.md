# vertex-mcp-server

An MCP (Model Context Protocol) server that enables AI assistants like Claude to query Google Cloud Vertex AI models (Gemini) for cross-validation and alternative perspectives.

## Purpose

This server allows AI systems to:
- Send queries to Vertex AI's Gemini models (gemini-1.5-pro, gemini-1.5-flash, etc.)
- Cross-validate responses by comparing outputs from different AI models
- Get alternative perspectives on questions or problems
- Leverage Google's Gemini models alongside other AI assistants

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

Set your Google Cloud project ID and location:

```bash
export VERTEX_PROJECT_ID="your-gcp-project-id"
export VERTEX_LOCATION="us-central1"  # Optional, defaults to us-central1
```

### 3. Enable Vertex AI API

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
        "VERTEX_PROJECT_ID": "your-gcp-project-id",
        "VERTEX_LOCATION": "us-central1"
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
        "VERTEX_PROJECT_ID": "your-gcp-project-id",
        "VERTEX_LOCATION": "us-central1"
      }
    }
  }
}
```

## Available Tools

### query_vertex_ai

Query Google Cloud Vertex AI with a prompt using Gemini models.

**Parameters:**
- `prompt` (string, required): The prompt to send to Vertex AI
- `model` (string, optional): The Gemini model to use
  - Default: `gemini-1.5-flash-002`
  - Options: `gemini-1.5-pro-002`, `gemini-1.5-flash-002`, `gemini-1.0-pro`, etc.
- `maxTokens` (number, optional): Maximum tokens in response (default: 8192)
- `temperature` (number, optional): Response randomness 0.0-2.0 (default: 1.0)
- `topP` (number, optional): Nucleus sampling parameter (default: 0.95)
- `topK` (number, optional): Top-k sampling parameter (default: 40)

**Example Usage in Claude:**

```
Can you use the query_vertex_ai tool to ask Gemini: "What are the key differences between Python and JavaScript?"
```

## Example Use Cases

1. **Cross-Validation**: Ask Claude to compare its response with Gemini's response
   ```
   Please answer this question, then use query_vertex_ai to get Gemini's perspective and compare the answers.
   ```

2. **Alternative Viewpoints**: Get multiple AI perspectives on a problem
   ```
   Use query_vertex_ai to get Gemini's opinion on [topic], then provide your own analysis.
   ```

3. **Specialized Tasks**: Leverage Gemini's strengths for specific tasks
   ```
   Use query_vertex_ai to process this image description with Gemini's vision capabilities.
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
