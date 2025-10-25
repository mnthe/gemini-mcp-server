# System Prompt Customization Guide

## Overview

The Gemini AI MCP Server supports system prompt override, allowing you to customize the AI assistant's behavior and persona when connected from other AI tools via the MCP protocol. This feature enables domain-specific configurations while maintaining the server's core functionality.

## Key Features

- **Flexible Persona**: Define specialized roles (financial analyst, code reviewer, research assistant, etc.)
- **Environment-Based**: Configure via `GEMINI_SYSTEM_PROMPT` environment variable
- **100% Backward Compatible**: Optional feature - server works normally without customization
- **Safe Design**: Only system prompt is overridable; tool instructions remain protected

## Configuration

### Basic Setup

Set the `GEMINI_SYSTEM_PROMPT` environment variable:

```bash
export GEMINI_SYSTEM_PROMPT="You are a specialized financial analyst AI assistant. When analyzing data:
- Always verify information using available tools
- Cite sources for all numerical data
- Consider market context and risk factors

You have access to the following tools:"
```

**Important**: End your custom prompt with "You have access to the following tools:" to ensure proper tool integration.

### MCP Configuration

#### Single Server Setup

Add the environment variable to your MCP configuration:

```json
{
  "mcpServers": {
    "gemini-research": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GOOGLE_CLOUD_LOCATION": "us-central1",
        "GEMINI_SYSTEM_PROMPT": "You are a research assistant specializing in academic literature. You have access to the following tools:"
      }
    }
  }
}
```

#### Multi-Server Setup (Different Personas)

Configure multiple Gemini servers with different personas:

```json
{
  "mcpServers": {
    "gemini-code": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GEMINI_SYSTEM_PROMPT": "You are a code review specialist. Focus on:\n- Code quality and best practices\n- Security vulnerabilities\n- Performance optimizations\n\nYou have access to the following tools:"
      }
    },
    "gemini-finance": {
      "command": "npx",
      "args": ["-y", "github:mnthe/gemini-mcp-server"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your-project-id",
        "GEMINI_SYSTEM_PROMPT": "You are a financial data analyst. Provide:\n- Data-driven insights\n- Market analysis\n- Risk assessments\n\nYou have access to the following tools:"
      }
    }
  }
}
```

## How It Works

### Prompt Flow

When a system prompt is provided:

1. **Custom System Prompt** → Your specified prompt
2. **Tool Definitions** → Automatically generated tool list (unchanged)
3. **Tool Instructions** → Standard tool usage format (unchanged)

Default behavior (no custom prompt):

1. **Default System Prompt** → "You are a helpful AI assistant with access to the following tools:"
2. **Tool Definitions** → Same tool list
3. **Tool Instructions** → Same tool instructions

### What's Customizable

✅ **System Prompt**: The AI assistant's persona, role, and behavior guidelines

❌ **Tool Instructions**: The format for tool calls (protected for reliability)
❌ **Tool Definitions**: The tool list and parameters (auto-generated)
❌ **Response Format**: The tool call parsing logic (internal)

## Best Practices

### 1. Be Specific About Role and Context

**Good:**
```
You are a senior security researcher specializing in web application vulnerabilities.
When analyzing code or systems:
- Prioritize security over functionality
- Identify OWASP Top 10 vulnerabilities
- Provide remediation recommendations

You have access to the following tools:
```

**Avoid:**
```
You are helpful. You have access to the following tools:
```

### 2. Include Behavioral Guidelines

Define how the assistant should approach tasks:

```
You are a medical research assistant. When reviewing papers:
- Verify methodology rigor
- Check sample sizes and statistical significance
- Note potential conflicts of interest
- Cross-reference with established medical guidelines

You have access to the following tools:
```

### 3. Maintain Tool Integration

Always end with the tool preamble to ensure proper integration:

```
You have access to the following tools:
```

### 4. Keep It Concise

Avoid overly long prompts. Focus on key behaviors and context.

**Good (concise):**
```
You are a Python code reviewer. Focus on PEP 8, type hints, and error handling.

You have access to the following tools:
```

**Avoid (too verbose):**
```
You are a Python code reviewer and you should look at everything including...
[500 more words]
```

## Security Considerations

### Safe Practices

1. **No Secrets in Prompts**: Never include API keys, passwords, or sensitive data in system prompts
2. **Validate Tool Calls**: The server validates all tool calls regardless of system prompt
3. **HTTPS Only**: Web fetching remains HTTPS-only (security feature unchanged)
4. **IP Blocking**: Private IP blocking remains active (security feature unchanged)

### Design Safety

The system prompt override is designed with safety boundaries:

- **Tool Format Protected**: Tool call parsing logic is not affected by custom prompts
- **Tool Execution Protected**: Tool execution and validation remain server-controlled
- **Security Filters Active**: All existing security measures (SSRF protection, URL validation) remain active

## Use Cases

### 1. Domain-Specific Expert

```bash
export GEMINI_SYSTEM_PROMPT="You are a cloud architecture expert specializing in Google Cloud Platform.
Focus on:
- Cost optimization strategies
- Security best practices
- Scalability patterns

You have access to the following tools:"
```

### 2. Language-Specific Assistant

```bash
export GEMINI_SYSTEM_PROMPT="You are a bilingual assistant (English/Spanish).
- Detect user's preferred language
- Respond in the same language
- Provide translations when requested

You have access to the following tools:"
```

### 3. Compliance-Focused Agent

```bash
export GEMINI_SYSTEM_PROMPT="You are a GDPR compliance advisor.
When reviewing data practices:
- Identify personal data handling
- Check consent mechanisms
- Verify data retention policies

You have access to the following tools:"
```

### 4. Research Assistant

```bash
export GEMINI_SYSTEM_PROMPT="You are an academic research assistant.
- Cite sources with proper attribution
- Use academic tone and terminology
- Distinguish facts from interpretations

You have access to the following tools:"
```

## Troubleshooting

### Issue: Custom prompt not applied

**Solution**: Verify environment variable is set correctly:
```bash
echo $GEMINI_SYSTEM_PROMPT
```

### Issue: Tool calls not working

**Solution**: Ensure your custom prompt ends with:
```
You have access to the following tools:
```

### Issue: Inconsistent behavior

**Solution**: Check for conflicting instructions in your prompt. Keep guidelines clear and non-contradictory.

### Issue: Tools not recognized

**Solution**: The tool list is auto-generated. Verify tools are properly registered in the server logs.

## Examples Directory

See `examples/custom-prompts.md` for ready-to-use prompt templates for common scenarios.

## Technical Details

### Implementation

- **Config Type**: `GeminiAIConfig.systemPrompt?: string`
- **Environment Variable**: `GEMINI_SYSTEM_PROMPT`
- **Component**: `ToolRegistry` handles prompt assembly
- **Backward Compatibility**: Defaults to standard prompt when not configured

### Code Flow

1. Config loader reads `GEMINI_SYSTEM_PROMPT` environment variable
2. Server passes system prompt to `ToolRegistry` constructor
3. `ToolRegistry.getSystemPromptSection()` returns custom or default prompt
4. Prompt sections are assembled: system + tools + instructions
5. Combined prompt is used in agentic loop for Gemini queries

## Related Documentation

- [README.md](README.md) - Main project documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture overview
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [examples/custom-prompts.md](examples/custom-prompts.md) - Prompt templates
