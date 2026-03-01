/**
 * StdioMCPConnection - MCP connection via stdin/stdout subprocess
 * Spawns MCP server process and communicates via stdio
 */

import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../utils/Logger.js';
import { Tool, ToolResult, JSONSchema } from '../agentic/Tool.js';
import { BaseMCPConnection } from './BaseMCPConnection.js';

export interface StdioMCPConfig {
  name: string;
  command: string;  // e.g., "npx"
  args: string[];   // e.g., ["@modelcontextprotocol/server-filesystem", "./data"]
}

export class StdioMCPConnection extends BaseMCPConnection {
  private config: StdioMCPConfig;
  private process: ChildProcess | null = null;
  private messageId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(config: StdioMCPConfig, logger: Logger) {
    super(config.name, logger);
    this.config = config;
  }

  /**
   * Connect to MCP server (spawn process)
   */
  async connect(): Promise<void> {
    this.logger.info(`Connecting to stdio MCP server: ${this.config.name}`);

    this.process = spawn(this.config.command, this.config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error(`Failed to spawn MCP server process: ${this.config.name}`);
    }

    // Set up stdout handler for responses
    let buffer = '';
    this.process.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();

      // Process complete JSON messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';  // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleResponse(message);
          } catch (error) {
            this.logger.error(`Failed to parse MCP response: ${line}`, error as Error);
          }
        }
      }
    });

    // Set up stderr handler for logging
    this.process.stderr?.on('data', (data: Buffer) => {
      this.logger.error(`MCP server ${this.config.name} stderr: ${data.toString()}`);
    });

    // Set up process error handler
    this.process.on('error', (error) => {
      this.logger.error(`MCP server ${this.config.name} process error`, error);
    });

    // Set up process exit handler
    this.process.on('exit', (code) => {
      this.logger.info(`MCP server ${this.config.name} exited with code ${code}`);
      this.process = null;
    });

    this.logger.info(`Connected to stdio MCP server: ${this.config.name}`);
  }

  /**
   * List available tools from MCP server
   */
  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: JSONSchema }>> {
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.nextMessageId(),
      method: 'tools/list',
      params: {},
    });

    return response.tools || [];
  }

  /**
   * Implement tool call logic for stdio connection
   */
  protected async callToolImpl(toolName: string, args: any): Promise<ToolResult> {
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.nextMessageId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    });

    return {
      status: 'success',
      content: JSON.stringify(response.content),
      metadata: { server: this.config.name },
    };
  }

  /**
   * Close connection (kill process)
   */
  async close(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.logger.info(`Closed stdio MCP connection: ${this.config.name}`);
    }
  }

  /**
   * Send JSON-RPC request to MCP server
   */
  private async sendRequest(request: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error(`MCP server ${this.config.name} not connected`);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, { resolve, reject });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`MCP request timeout: ${request.method}`));
        }
      }, 30000);
    });
  }

  /**
   * Handle response from MCP server
   */
  private handleResponse(message: any): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || 'MCP request failed'));
      } else {
        resolve(message.result);
      }
    }
  }

  /**
   * Get next message ID
   */
  private nextMessageId(): number {
    return ++this.messageId;
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.process !== null && !this.process.killed;
  }
}
