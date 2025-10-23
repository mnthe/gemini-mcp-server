/**
 * HttpMCPConnection - MCP connection via HTTP
 * Communicates with MCP server over HTTP REST API
 */
export class HttpMCPConnection {
    config;
    logger;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    /**
     * Connect to MCP server (verify connectivity)
     */
    async connect() {
        this.logger.info(`Connecting to HTTP MCP server: ${this.config.name} at ${this.config.url}`);
        try {
            // Test connectivity by listing tools
            await this.listTools();
            this.logger.info(`Connected to HTTP MCP server: ${this.config.name}`);
        }
        catch (error) {
            throw new Error(`Failed to connect to HTTP MCP server ${this.config.name}: ${error.message}`);
        }
    }
    /**
     * List available tools from MCP server
     */
    async listTools() {
        const response = await this.httpRequest('POST', '/tools/list', {});
        return response.tools || [];
    }
    /**
     * Call a tool on the MCP server
     */
    async callTool(toolName, args) {
        this.logger.toolCall(toolName, args);
        try {
            const response = await this.httpRequest('POST', '/tools/call', {
                name: toolName,
                arguments: args,
            });
            const result = {
                status: 'success',
                content: JSON.stringify(response.content),
                metadata: { server: this.config.name },
            };
            this.logger.toolResult(toolName, result);
            return result;
        }
        catch (error) {
            const errorResult = {
                status: 'error',
                content: `Tool execution failed: ${error.message}`,
            };
            this.logger.toolResult(toolName, errorResult);
            return errorResult;
        }
    }
    /**
     * Close connection (no-op for HTTP)
     */
    async close() {
        this.logger.info(`Closed HTTP MCP connection: ${this.config.name}`);
    }
    /**
     * Make HTTP request to MCP server
     */
    async httpRequest(method, path, body) {
        const url = `${this.config.url}${path}`;
        const headers = {
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
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`HTTP request failed: ${error}`);
        }
    }
    /**
     * Check if connection is active
     */
    isConnected() {
        // For HTTP, always return true (stateless)
        return true;
    }
}
//# sourceMappingURL=HttpMCPConnection.js.map