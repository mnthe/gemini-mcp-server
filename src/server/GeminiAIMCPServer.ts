/**
 * GeminiAIMCPServer - Main MCP server implementation
 * Orchestrates all components and handles MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { GeminiAIConfig, CachedDocument, MCPServerConfig } from '../types/index.js';
import { QuerySchema, SearchSchema, FetchSchema } from '../schemas/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { EnhancedMCPClient } from '../mcp/EnhancedMCPClient.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { AgenticLoop } from '../agentic/AgenticLoop.js';
import { Logger } from '../utils/Logger.js';
import { QueryHandler } from '../handlers/QueryHandler.js';
import { SearchHandler } from '../handlers/SearchHandler.js';
import { FetchHandler } from '../handlers/FetchHandler.js';

export class GeminiAIMCPServer {
  private server: Server;
  private config: GeminiAIConfig;

  // Core components
  private conversationManager: ConversationManager;
  private geminiAI: GeminiAIService;
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

  constructor(config: GeminiAIConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: "gemini-mcp-server",
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

    // Determine log directory and whether to disable logging
    const logDir = config.logDir || './logs';
    const disableLogging = config.disableLogging;
    const logToStderr = config.logToStderr;

    // Initialize core components
    this.logger = new Logger('server', logDir, disableLogging, logToStderr);
    this.conversationManager = new ConversationManager(
      config.sessionTimeout,
      config.maxHistory
    );
    this.geminiAI = new GeminiAIService(config);

    // Initialize MCP client (will be initialized async in start())
    this.mcpClient = new EnhancedMCPClient('server', logDir, disableLogging, logToStderr);

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(this.logger);

    // Initialize agentic loop
    this.agenticLoop = new AgenticLoop(
      this.geminiAI,
      this.toolRegistry
    );

    // Initialize handlers
    this.queryHandler = new QueryHandler(
      this.conversationManager,
      this.agenticLoop,
      config.enableConversations,
      logDir,
      disableLogging,
      logToStderr
    );
    this.searchHandler = new SearchHandler(this.geminiAI, this.searchCache);
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
            "Query Google AI (Gemini models) with a prompt. " +
            "This tool operates as an intelligent agent with multi-turn execution capabilities. " +
            "The agent can automatically use available tools (web fetching, external MCP servers) " +
            "to gather information and provide comprehensive answers. " +
            "Supports multi-turn conversations when sessionId is provided. " +
            "Supports multimodal inputs (images, audio, video, documents) via the optional 'parts' parameter.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The prompt to send to Gemini",
              },
              sessionId: {
                type: "string",
                description: "Optional conversation session ID for multi-turn conversations",
              },
              parts: {
                type: "array",
                description: "Optional multimodal content parts (images, audio, video, documents)",
                items: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      description: "Text content"
                    },
                    inlineData: {
                      type: "object",
                      description: "Inline base64 encoded file data",
                      properties: {
                        mimeType: {
                          type: "string",
                          description: "MIME type of the file (e.g., 'image/jpeg', 'audio/mp3', 'video/mp4')"
                        },
                        data: {
                          type: "string",
                          description: "Base64 encoded file data"
                        }
                      },
                      required: ["mimeType", "data"]
                    },
                    fileData: {
                      type: "object",
                      description: "File URI for Cloud Storage (gs://) or public URLs (https://)",
                      properties: {
                        mimeType: {
                          type: "string",
                          description: "MIME type of the file"
                        },
                        fileUri: {
                          type: "string",
                          description: "URI of the file (gs:// for Cloud Storage or https:// for public URLs)"
                        }
                      },
                      required: ["mimeType", "fileUri"]
                    }
                  }
                }
              }
            },
            required: ["prompt"],
          },
        },
        {
          name: "search",
          description:
            "Search for information using Gemini. Returns a list of relevant search results. " +
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
    this.logger.info('Initializing Gemini AI MCP Server');

    // Initialize MCP servers from config
    await this.initializeMCPServers();

    // Register tools
    await this.registerTools();

    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info("Gemini AI MCP Server running on stdio");
  }

  /**
   * Initialize external MCP servers
   */
  private async initializeMCPServers(): Promise<void> {
    const mcpServersJson = process.env.GEMINI_MCP_SERVERS;
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
