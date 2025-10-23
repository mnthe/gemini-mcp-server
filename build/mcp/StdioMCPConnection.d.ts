/**
 * StdioMCPConnection - MCP connection via stdin/stdout subprocess
 * Spawns MCP server process and communicates via stdio
 */
import { Logger } from '../utils/Logger.js';
import { ToolResult, JSONSchema } from '../agentic/Tool.js';
export interface StdioMCPConfig {
    name: string;
    command: string;
    args: string[];
}
export declare class StdioMCPConnection {
    private config;
    private process;
    private logger;
    private messageId;
    private pendingRequests;
    constructor(config: StdioMCPConfig, logger: Logger);
    /**
     * Connect to MCP server (spawn process)
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
     * Close connection (kill process)
     */
    close(): Promise<void>;
    /**
     * Send JSON-RPC request to MCP server
     */
    private sendRequest;
    /**
     * Handle response from MCP server
     */
    private handleResponse;
    /**
     * Get next message ID
     */
    private nextMessageId;
    /**
     * Check if connection is active
     */
    isConnected(): boolean;
}
//# sourceMappingURL=StdioMCPConnection.d.ts.map