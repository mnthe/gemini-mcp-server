/**
 * ToolRegistry - Manages tool registration and execution
 * Supports parallel execution with retry logic
 */

import { Tool, ToolResult, RunContext, ToolDefinition } from '../agentic/Tool.js';
import { ToolCall } from '../agentic/ResponseProcessor.js';
import { ToolExecutionError } from '../errors/index.js';
import { Logger } from '../utils/Logger.js';
import { WebFetchTool } from './WebFetchTool.js';
import { EnhancedMCPClient } from '../mcp/EnhancedMCPClient.js';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register built-in WebFetch tool
   */
  registerWebFetch(): void {
    const webFetch = new WebFetchTool();
    this.tools.set(webFetch.name, webFetch);
    this.logger.info(`Registered built-in tool: ${webFetch.name}`);
  }

  /**
   * Register tools from MCP client
   */
  registerMCPTools(mcpClient: EnhancedMCPClient): void {
    const mcpTools = mcpClient.getTools();

    for (const tool of mcpTools) {
      this.tools.set(tool.name, tool);
      this.logger.info(`Registered MCP tool: ${tool.name}`);
    }

    this.logger.info(`Registered ${mcpTools.length} MCP tools`);
  }

  /**
   * Execute multiple tools in parallel with retry logic
   */
  async executeTools(
    calls: ToolCall[],
    context: RunContext,
    maxRetries: number = 2
  ): Promise<ToolResult[]> {
    this.logger.info(`Executing ${calls.length} tools in parallel`);

    // Execute all tools in parallel
    const results = await Promise.all(
      calls.map((call) => this.executeToolWithRetry(call, context, maxRetries))
    );

    const successCount = results.filter((r) => r.status === 'success').length;
    this.logger.info(`Tool execution complete: ${successCount}/${results.length} successful`);

    return results;
  }

  /**
   * Execute single tool with retry logic
   */
  private async executeToolWithRetry(
    call: ToolCall,
    context: RunContext,
    maxRetries: number
  ): Promise<ToolResult> {
    const tool = this.tools.get(call.tool);

    if (!tool) {
      return {
        status: 'error',
        content: `Tool '${call.tool}' not found`,
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Executing tool ${call.tool} (attempt ${attempt}/${maxRetries})`);

        const result = await tool.execute(call.args, context);

        if (result.status === 'success') {
          this.logger.info(`Tool ${call.tool} succeeded on attempt ${attempt}`);
          return result;
        }

        // Tool returned error status (not an exception)
        lastError = new Error(result.content);

        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      } catch (error) {
        lastError = error as Error;
        this.logger.error(
          `Tool ${call.tool} attempt ${attempt} failed: ${(error as Error).message}`
        );

        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Unknown error';
    this.logger.error(`Tool ${call.tool} failed after ${maxRetries} attempts`);

    return {
      status: 'error',
      content: `Tool execution failed after ${maxRetries} attempts: ${errorMessage}`,
    };
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool definitions formatted for LLM prompt
   */
  getToolDefinitionsText(): string {
    const tools = this.getAllTools();

    if (tools.length === 0) {
      return 'No tools available.';
    }

    const lines: string[] = ['You are a helpful AI assistant with access to the following tools:', ''];

    for (const tool of tools) {
      const definition = tool instanceof WebFetchTool || 'getDefinition' in tool
        ? (tool as any).getDefinition()
        : this.createDefinition(tool);

      lines.push(`- ${definition.name}: ${definition.description}`);
      lines.push(`  Parameters: ${definition.parameters}`);
      lines.push('');
    }

    lines.push('When you need to use a tool, respond with:');
    lines.push('TOOL_CALL: <tool_name>');
    lines.push('ARGUMENTS: <json_arguments>');
    lines.push('');
    lines.push('Example:');
    lines.push('TOOL_CALL: web_fetch');
    lines.push('ARGUMENTS: {"url": "https://example.com", "extract": true}');
    lines.push('');
    lines.push('When you have all information needed, provide your final answer without tool calls.');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Create tool definition from Tool interface
   */
  private createDefinition(tool: Tool): ToolDefinition {
    const props = tool.parameters.properties || {};
    const required = tool.parameters.required || [];

    const paramLines: string[] = [];
    for (const [key, value] of Object.entries(props)) {
      const isRequired = required.includes(key);
      const typeInfo = value.type || 'any';
      const desc = value.description || '';
      const reqMarker = isRequired ? '(required)' : '(optional)';

      paramLines.push(`    ${key}: ${typeInfo} ${reqMarker} - ${desc}`);
    }

    const params = paramLines.length > 0 ? `{\n${paramLines.join('\n')}\n  }` : '{}';

    return {
      name: tool.name,
      description: tool.description,
      parameters: params,
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.logger.info('Tool registry cleared');
  }
}
