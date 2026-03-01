/**
 * BaseMCPConnection - Base class for MCP connections
 * Provides common functionality for callTool error handling and logging
 */

import { Logger } from '../utils/Logger.js';
import { ToolResult, JSONSchema } from '../agentic/Tool.js';

export abstract class BaseMCPConnection {
  protected logger: Logger;
  protected serverName: string;

  constructor(serverName: string, logger: Logger) {
    this.serverName = serverName;
    this.logger = logger;
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  abstract connect(): Promise<void>;
  abstract listTools(): Promise<Array<{ name: string; description: string; inputSchema: JSONSchema }>>;
  abstract close(): Promise<void>;
  abstract isConnected(): boolean;

  /**
   * Call a tool with common error handling and logging
   * Subclasses can override this or use callToolImpl
   */
  async callTool(toolName: string, args: any): Promise<ToolResult> {
    this.logger.toolCall(toolName, args);

    try {
      const result = await this.callToolImpl(toolName, args);
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
   * Subclasses must implement the actual tool call logic
   */
  protected abstract callToolImpl(toolName: string, args: any): Promise<ToolResult>;
}
