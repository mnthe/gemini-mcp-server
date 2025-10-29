/**
 * EnhancedMCPClient - Unified MCP client supporting both stdio and HTTP
 * Manages connections and tool discovery from multiple MCP servers
 */

import { Logger } from '../utils/Logger.js';
import { Tool, ToolResult, JSONSchema, BaseTool, RunContext } from '../agentic/Tool.js';
import { StdioMCPConnection, StdioMCPConfig } from './StdioMCPConnection.js';
import { HttpMCPConnection, HttpMCPConfig } from './HttpMCPConnection.js';
import { MCPServerConfig } from '../types/index.js';

/**
 * MCP Tool wrapper - wraps MCP server tool as a Tool interface
 */
class MCPToolWrapper extends BaseTool {
  constructor(
    private serverName: string,
    private toolName: string,
    private mcpClient: EnhancedMCPClient,
    public name: string,
    public description: string,
    public parameters: JSONSchema
  ) {
    super();
  }

  async execute(args: any, context: RunContext): Promise<ToolResult> {
    this.validateArgs(args);
    return await this.mcpClient.callTool(this.serverName, this.toolName, args);
  }
}

export class EnhancedMCPClient {
  private stdioServers: Map<string, StdioMCPConnection> = new Map();
  private httpServers: Map<string, HttpMCPConnection> = new Map();
  private logger: Logger;
  private discoveredTools: Tool[] = [];

  constructor(sessionId: string, logDir?: string, disableLogging: boolean = false, logToStderr: boolean = false) {
    this.logger = new Logger(sessionId, logDir, disableLogging, logToStderr);
  }

  /**
   * Initialize from MCP server configurations
   */
  async initialize(configs: MCPServerConfig[]): Promise<void> {
    this.logger.info(`Initializing EnhancedMCPClient with ${configs.length} servers`);

    for (const config of configs) {
      try {
        if (config.transport === 'stdio') {
          await this.initializeStdioServer(config);
        } else if (config.transport === 'http') {
          await this.initializeHttpServer(config);
        } else {
          this.logger.error(`Unknown transport type: ${config.transport}`);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize MCP server ${config.name}`, error as Error);
      }
    }

    // Discover tools from all servers
    await this.discoverTools();

    this.logger.info(`Initialized ${this.discoveredTools.length} tools from MCP servers`);
  }

  /**
   * Initialize stdio MCP server
   */
  private async initializeStdioServer(config: MCPServerConfig): Promise<void> {
    if (!config.command || !config.args) {
      throw new Error(`Stdio server ${config.name} missing command or args`);
    }

    const stdioConfig: StdioMCPConfig = {
      name: config.name,
      command: config.command,
      args: config.args,
    };

    const connection = new StdioMCPConnection(stdioConfig, this.logger);
    await connection.connect();
    this.stdioServers.set(config.name, connection);

    this.logger.info(`Initialized stdio MCP server: ${config.name}`);
  }

  /**
   * Initialize HTTP MCP server
   */
  private async initializeHttpServer(config: MCPServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error(`HTTP server ${config.name} missing url`);
    }

    const httpConfig: HttpMCPConfig = {
      name: config.name,
      url: config.url,
      headers: config.headers,
    };

    const connection = new HttpMCPConnection(httpConfig, this.logger);
    await connection.connect();
    this.httpServers.set(config.name, connection);

    this.logger.info(`Initialized HTTP MCP server: ${config.name}`);
  }

  /**
   * Discover tools from all connected servers
   */
  async discoverTools(): Promise<Tool[]> {
    this.discoveredTools = [];

    // Discover from stdio servers
    await this.discoverToolsFromConnections(this.stdioServers, 'stdio');

    // Discover from HTTP servers
    await this.discoverToolsFromConnections(this.httpServers, 'HTTP');

    return this.discoveredTools;
  }

  /**
   * Helper method to discover tools from a collection of connections
   */
  private async discoverToolsFromConnections(
    connections: Map<string, any>,
    serverType: string
  ): Promise<void> {
    for (const [serverName, connection] of connections.entries()) {
      try {
        const tools = await connection.listTools();
        this.logger.info(`Discovered ${tools.length} tools from ${serverType} server ${serverName}`);

        for (const tool of tools) {
          this.discoveredTools.push(
            new MCPToolWrapper(
              serverName,
              tool.name,
              this,
              `mcp_${serverName}_${tool.name}`,
              tool.description || `Tool ${tool.name} from ${serverName}`,
              tool.inputSchema
            )
          );
        }
      } catch (error) {
        this.logger.error(`Failed to list tools from ${serverType} server ${serverName}`, error as Error);
      }
    }
  }

  /**
   * Get all discovered tools
   */
  getTools(): Tool[] {
    return this.discoveredTools;
  }

  /**
   * Call a tool on the appropriate server
   */
  async callTool(serverName: string, toolName: string, args: any): Promise<ToolResult> {
    // Try stdio server first
    if (this.stdioServers.has(serverName)) {
      return await this.stdioServers.get(serverName)!.callTool(toolName, args);
    }

    // Try HTTP server
    if (this.httpServers.has(serverName)) {
      return await this.httpServers.get(serverName)!.callTool(toolName, args);
    }

    throw new Error(`MCP server '${serverName}' not found`);
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down EnhancedMCPClient');

    for (const connection of this.stdioServers.values()) {
      await connection.close();
    }

    for (const connection of this.httpServers.values()) {
      await connection.close();
    }

    this.stdioServers.clear();
    this.httpServers.clear();
    this.discoveredTools = [];

    this.logger.info('EnhancedMCPClient shutdown complete');
  }
}
