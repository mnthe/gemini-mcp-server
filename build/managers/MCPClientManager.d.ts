/**
 * MCPClientManager - Manages connections to external MCP servers
 * Handles delegation of tasks to other MCP servers
 */
export declare class MCPClientManager {
    private servers;
    constructor();
    /**
     * Load MCP server configurations from environment
     */
    private loadServerConfigs;
    /**
     * Call a tool on an external MCP server
     * Note: This is a framework implementation. In production, this would
     * spawn the server process and communicate via stdio/IPC.
     */
    callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
    /**
     * List available MCP servers
     */
    listServers(): string[];
    /**
     * Check if a server is configured
     */
    hasServer(serverName: string): boolean;
}
//# sourceMappingURL=MCPClientManager.d.ts.map