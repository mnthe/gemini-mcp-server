/**
 * VertexAIMCPServer - Main MCP server implementation
 * Orchestrates all components and handles MCP protocol
 */
import { VertexAIConfig } from '../types/index.js';
export declare class VertexAIMCPServer {
    private server;
    private config;
    private conversationManager;
    private mcpClientManager;
    private vertexAI;
    private promptAnalyzer;
    private reasoningAgent;
    private delegationAgent;
    private queryHandler;
    private searchHandler;
    private fetchHandler;
    private searchCache;
    constructor(config: VertexAIConfig);
    /**
     * Setup MCP protocol handlers
     */
    private setupHandlers;
    /**
     * Start the MCP server
     */
    run(): Promise<void>;
}
//# sourceMappingURL=VertexAIMCPServer.d.ts.map