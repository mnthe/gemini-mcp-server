/**
 * VertexAIMCPServer - Main MCP server implementation
 * Orchestrates all components and handles MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { VertexAIConfig, CachedDocument, MCPServerConfig } from '../types/index.js';
import { QuerySchema, SearchSchema, FetchSchema } from '../schemas/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { VertexAIService } from '../services/VertexAIService.js';
import { EnhancedMCPClient } from '../mcp/EnhancedMCPClient.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { AgenticLoop } from '../agentic/AgenticLoop.js';
import { Logger } from '../utils/Logger.js';
import { QueryHandler } from '../handlers/QueryHandler.js';
import { SearchHandler } from '../handlers/SearchHandler.js';
import { FetchHandler } from '../handlers/FetchHandler.js';

export class VertexAIMCPServer {
  private server: Server;
  private config: VertexAIConfig;

  // Core components
  private conversationManager: ConversationManager;
  private vertexAI: VertexAIService;
  private mcpClient: EnhancedMCPClient;
  private toolRegistry: ToolRegistry;
  private agenticLoop: AgenticLoop;
  private logger: Logger;

  // Handlers
  private queryHandler: QueryHandler;
  private searchHandler: SearchHandler;
  private fetchHandler: FetchHandler;

  // Cache
  private searchCache: Map<string, CachedDocument>;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: "vertex-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize cache
    this.searchCache = new Map();

    // Initialize core components
    this.logger = new Logger('server', './logs');
    this.conversationManager = new ConversationManager(
      config.sessionTimeout,
      config.maxHistory
    );
    this.vertexAI = new VertexAIService(config);

    // Initialize MCP client (will be initialized async in start())
    this.mcpClient = new EnhancedMCPClient('server', './logs');

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(this.logger);

    // Initialize agentic loop
    this.agenticLoop = new AgenticLoop(
      this.vertexAI,
      this.toolRegistry
    );

    // Initialize handlers
    this.queryHandler = new QueryHandler(
      this.conversationManager,
      this.agenticLoop,
      config.enableConversations
    );
    this.searchHandler = new SearchHandler(this.vertexAI, this.searchCache);
    this.fetchHandler = new FetchHandler(this.searchCache);

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: "query",
          description:
            "Query Google Cloud Vertex AI (Gemini models) with a prompt. " +
            "This tool operates as an intelligent agent with multi-turn execution capabilities. " +
            "The agent can automatically use available tools (web fetching, external MCP servers) " +
            "to gather information and provide comprehensive answers. " +
            "Supports multi-turn conversations when sessionId is provided.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The prompt to send to Vertex AI",
              },
              sessionId: {
                type: "string",
                description: "Optional conversation session ID for multi-turn conversations",
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "search",
          description:
            "Search for information using Vertex AI. Returns a list of relevant search results. " +
            "Follows OpenAI MCP specification for search tools.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "fetch",
          description:
            "Fetch the full contents of a search result document by its ID. " +
            "Follows OpenAI MCP specification for fetch tools.",
          inputSchema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The unique identifier for the document to fetch",
              },
            },
            required: ["id"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls with switch-case statement
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      switch (toolName) {
        case "query": {
          const input = QuerySchema.parse(args);
          return await this.queryHandler.handle(input);
        }
        
        case "search": {
          const input = SearchSchema.parse(args);
          return await this.searchHandler.handle(input);
        }
        
        case "fetch": {
          const input = FetchSchema.parse(args);
          return await this.fetchHandler.handle(input);
        }
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    });
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    this.logger.info('Initializing Vertex AI MCP Server');

    // Initialize MCP servers from config
    await this.initializeMCPServers();

    // Register tools
    await this.registerTools();

    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info("Vertex AI MCP Server running on stdio");
    console.error("Vertex AI MCP Server running on stdio");
  }

  /**
   * Initialize external MCP servers
   */
  private async initializeMCPServers(): Promise<void> {
    const mcpServersJson = process.env.VERTEX_MCP_SERVERS;
    if (!mcpServersJson) {
      this.logger.info('No external MCP servers configured');
      return;
    }

    try {
      const serverConfigs: MCPServerConfig[] = JSON.parse(mcpServersJson);
      await this.mcpClient.initialize(serverConfigs);
      this.logger.info(`Initialized ${serverConfigs.length} MCP servers`);
    } catch (error) {
      this.logger.error('Failed to initialize MCP servers', error as Error);
    }
  }

  /**
   * Register all tools (WebFetch + MCP tools)
   */
  private async registerTools(): Promise<void> {
    // Register built-in WebFetch tool
    this.toolRegistry.registerWebFetch();

    // Register MCP tools
    this.toolRegistry.registerMCPTools(this.mcpClient);

    const toolCount = this.toolRegistry.getAllTools().length;
    this.logger.info(`Registered ${toolCount} total tools`);
  }
}
