/**
 * VertexAIMCPServer - Main MCP server implementation
 * Orchestrates all components and handles MCP protocol
 */
import { VertexAIConfig } from '../types/index.js';
export declare class VertexAIMCPServer {
    private server;
    private config;
    private conversationManager;
    private vertexAI;
    private mcpClient;
    private toolRegistry;
    private agenticLoop;
    private logger;
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
    /**
     * Initialize external MCP servers
     */
    private initializeMCPServers;
    /**
     * Register all tools (WebFetch + MCP tools)
     */
    private registerTools;
}
//# sourceMappingURL=VertexAIMCPServer.d.ts.map