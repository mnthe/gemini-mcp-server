/**
 * EnhancedMCPClient - Unified MCP client supporting both stdio and HTTP
 * Manages connections and tool discovery from multiple MCP servers
 */
import { Tool, ToolResult } from '../agentic/Tool.js';
import { MCPServerConfig } from '../types/index.js';
export declare class EnhancedMCPClient {
    private stdioServers;
    private httpServers;
    private logger;
    private discoveredTools;
    constructor(sessionId: string, logDir?: string, disableLogging?: boolean, logToStderr?: boolean);
    /**
     * Initialize from MCP server configurations
     */
    initialize(configs: MCPServerConfig[]): Promise<void>;
    /**
     * Initialize stdio MCP server
     */
    private initializeStdioServer;
    /**
     * Initialize HTTP MCP server
     */
    private initializeHttpServer;
    /**
     * Discover tools from all connected servers
     */
    discoverTools(): Promise<Tool[]>;
    /**
     * Get all discovered tools
     */
    getTools(): Tool[];
    /**
     * Call a tool on the appropriate server
     */
    callTool(serverName: string, toolName: string, args: any): Promise<ToolResult>;
    /**
     * Shutdown all connections
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=EnhancedMCPClient.d.ts.map