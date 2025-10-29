/**
 * HttpMCPConnection - MCP connection via HTTP
 * Communicates with MCP server over HTTP REST API
 */

import { Logger } from '../utils/Logger.js';
import { Tool, ToolResult, JSONSchema } from '../agentic/Tool.js';
import { BaseMCPConnection } from './BaseMCPConnection.js';

export interface HttpMCPConfig {
  name: string;
  url: string;  // e.g., "http://localhost:3000/mcp"
  headers?: Record<string, string>;
}

export class HttpMCPConnection extends BaseMCPConnection {
  private config: HttpMCPConfig;

  constructor(config: HttpMCPConfig, logger: Logger) {
    super(config.name, logger);
    this.config = config;
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
   * Implement tool call logic for HTTP connection
   */
  protected async callToolImpl(toolName: string, args: any): Promise<ToolResult> {
    const response = await this.httpRequest('POST', '/tools/call', {
      name: toolName,
      arguments: args,
    });

    return {
      status: 'success',
      content: JSON.stringify(response.content),
      metadata: { server: this.config.name },
    };
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
