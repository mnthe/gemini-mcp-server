/**
 * HttpMCPConnection - MCP connection via HTTP
 * Communicates with MCP server over HTTP REST API
 */

import { Logger } from '../utils/Logger.js';
import { Tool, ToolResult, JSONSchema } from '../agentic/Tool.js';

export interface HttpMCPConfig {
  name: string;
  url: string;  // e.g., "http://localhost:3000/mcp"
  headers?: Record<string, string>;
}

export class HttpMCPConnection {
  private config: HttpMCPConfig;
  private logger: Logger;

  constructor(config: HttpMCPConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Connect to MCP server (verify connectivity)
   */
  async connect(): Promise<void> {
    this.logger.info(`Connecting to HTTP MCP server: ${this.config.name} at ${this.config.url}`);

    try {
      // Test connectivity by listing tools
      await this.listTools();
      this.logger.info(`Connected to HTTP MCP server: ${this.config.name}`);
    } catch (error) {
      throw new Error(
        `Failed to connect to HTTP MCP server ${this.config.name}: ${(error as Error).message}`
      );
    }
  }

  /**
   * List available tools from MCP server
   */
  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: JSONSchema }>> {
    const response = await this.httpRequest('POST', '/tools/list', {});
    return response.tools || [];
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: any): Promise<ToolResult> {
    this.logger.toolCall(toolName, args);

    try {
      const response = await this.httpRequest('POST', '/tools/call', {
        name: toolName,
        arguments: args,
      });

      const result: ToolResult = {
        status: 'success',
        content: JSON.stringify(response.content),
        metadata: { server: this.config.name },
      };

      this.logger.toolResult(toolName, result);
      return result;
    } catch (error) {
      const errorResult: ToolResult = {
        status: 'error',
        content: `Tool execution failed: ${(error as Error).message}`,
      };

      this.logger.toolResult(toolName, errorResult);
      return errorResult;
    }
  }

  /**
   * Close connection (no-op for HTTP)
   */
  async close(): Promise<void> {
    this.logger.info(`Closed HTTP MCP connection: ${this.config.name}`);
  }

  /**
   * Make HTTP request to MCP server
   */
  private async httpRequest(method: string, path: string, body: any): Promise<any> {
    const url = `${this.config.url}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`HTTP request failed: ${error}`);
    }
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    // For HTTP, always return true (stateless)
    return true;
  }
}
