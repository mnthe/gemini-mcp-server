/**
 * StdioMCPConnection - MCP connection via stdin/stdout subprocess
 * Spawns MCP server process and communicates via stdio
 */
import { spawn } from 'child_process';
export class StdioMCPConnection {
    config;
    process = null;
    logger;
    messageId = 0;
    pendingRequests = new Map();
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    /**
     * Connect to MCP server (spawn process)
     */
    async connect() {
        this.logger.info(`Connecting to stdio MCP server: ${this.config.name}`);
        this.process = spawn(this.config.command, this.config.args, {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (!this.process.stdout || !this.process.stdin) {
            throw new Error(`Failed to spawn MCP server process: ${this.config.name}`);
        }
        // Set up stdout handler for responses
        let buffer = '';
        this.process.stdout.on('data', (data) => {
            buffer += data.toString();
            // Process complete JSON messages (newline-delimited)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const message = JSON.parse(line);
                        this.handleResponse(message);
                    }
                    catch (error) {
                        this.logger.error(`Failed to parse MCP response: ${line}`, error);
                    }
                }
            }
        });
        // Set up stderr handler for logging
        this.process.stderr?.on('data', (data) => {
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
    async listTools() {
        const response = await this.sendRequest({
            jsonrpc: '2.0',
            id: this.nextMessageId(),
            method: 'tools/list',
            params: {},
        });
        return response.tools || [];
    }
    /**
     * Call a tool on the MCP server
     */
    async callTool(toolName, args) {
        this.logger.toolCall(toolName, args);
        try {
            const response = await this.sendRequest({
                jsonrpc: '2.0',
                id: this.nextMessageId(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args,
                },
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
     * Close connection (kill process)
     */
    async close() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.logger.info(`Closed stdio MCP connection: ${this.config.name}`);
        }
    }
    /**
     * Send JSON-RPC request to MCP server
     */
    async sendRequest(request) {
        if (!this.process || !this.process.stdin) {
            throw new Error(`MCP server ${this.config.name} not connected`);
        }
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(request.id, { resolve, reject });
            const message = JSON.stringify(request) + '\n';
            this.process.stdin.write(message);
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
    handleResponse(message) {
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
            const { resolve, reject } = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                reject(new Error(message.error.message || 'MCP request failed'));
            }
            else {
                resolve(message.result);
            }
        }
    }
    /**
     * Get next message ID
     */
    nextMessageId() {
        return ++this.messageId;
    }
    /**
     * Check if connection is active
     */
    isConnected() {
        return this.process !== null && !this.process.killed;
    }
}
//# sourceMappingURL=StdioMCPConnection.js.map