/**
 * HttpMCPConnection - MCP connection via HTTP
 * Communicates with MCP server over HTTP REST API
 */
import { Logger } from '../utils/Logger.js';
import { ToolResult, JSONSchema } from '../agentic/Tool.js';
export interface HttpMCPConfig {
    name: string;
    url: string;
    headers?: Record<string, string>;
}
export declare class HttpMCPConnection {
    private config;
    private logger;
    constructor(config: HttpMCPConfig, logger: Logger);
    /**
     * Connect to MCP server (verify connectivity)
     */
    connect(): Promise<void>;
    /**
     * List available tools from MCP server
     */
    listTools(): Promise<Array<{
        name: string;
        description: string;
        inputSchema: JSONSchema;
    }>>;
    /**
     * Call a tool on the MCP server
     */
    callTool(toolName: string, args: any): Promise<ToolResult>;
    /**
     * Close connection (no-op for HTTP)
     */
    close(): Promise<void>;
    /**
     * Make HTTP request to MCP server
     */
    private httpRequest;
    /**
     * Check if connection is active
     */
    isConnected(): boolean;
}
//# sourceMappingURL=HttpMCPConnection.d.ts.map