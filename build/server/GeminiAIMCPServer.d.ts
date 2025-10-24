/**
 * GeminiAIMCPServer - Main MCP server implementation
 * Orchestrates all components and handles MCP protocol
 */
import { GeminiAIConfig } from '../types/index.js';
export declare class GeminiAIMCPServer {
    private server;
    private config;
    private conversationManager;
    private geminiAI;
    private mcpClient;
    private toolRegistry;
    private agenticLoop;
    private logger;
    private queryHandler;
    private searchHandler;
    private fetchHandler;
    private searchCache;
    constructor(config: GeminiAIConfig);
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
//# sourceMappingURL=GeminiAIMCPServer.d.ts.map