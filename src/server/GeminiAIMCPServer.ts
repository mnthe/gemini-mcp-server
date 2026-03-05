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
import { QuerySchema, SearchSchema, FetchSchema, ImageGenerationSchema, VideoGenerationSchema, CheckVideoSchema } from '../schemas/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { EnhancedMCPClient } from '../mcp/EnhancedMCPClient.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { AgenticLoop } from '../agentic/AgenticLoop.js';
import { Logger } from '../utils/Logger.js';
import { QueryHandler } from '../handlers/QueryHandler.js';
import { SearchHandler } from '../handlers/SearchHandler.js';
import { FetchHandler } from '../handlers/FetchHandler.js';
import { ImageGenerationHandler } from '../handlers/ImageGenerationHandler.js';
import { VideoGenerationHandler } from '../handlers/VideoGenerationHandler.js';

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
  private imageGenerationHandler: ImageGenerationHandler;
  private videoGenerationHandler: VideoGenerationHandler;

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
    this.toolRegistry = new ToolRegistry(this.logger, config.systemPrompt);

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
    this.imageGenerationHandler = new ImageGenerationHandler(this.geminiAI, config);
    this.videoGenerationHandler = new VideoGenerationHandler(this.geminiAI, config);

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
              model: {
                type: "string",
                description: "Optional model override (e.g., gemini-3-flash-preview, gemini-3.1-pro-preview)",
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
                      description: "File URI for Cloud Storage or public URLs",
                      properties: {
                        mimeType: {
                          type: "string",
                          description: "MIME type of the file"
                        },
                        fileUri: {
                          type: "string",
                          description: this.config.allowFileUris
                            ? "URI of the file (gs:// for Cloud Storage, https:// for public URLs, or file:// for local files)"
                            : "URI of the file (gs:// for Cloud Storage or https:// for public URLs)"
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
        {
          name: "generate_image",
          description:
            "Generate images using Gemini's native image generation (Nano Banana). " +
            "Supports gemini-3-pro-image-preview and gemini-3.1-flash-image-preview models. " +
            `Images are saved to ${this.imageGenerationHandler.getImageOutputDir()} and returned as base64.`,
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Image generation prompt",
              },
              model: {
                type: "string",
                enum: ["gemini-3-pro-image-preview", "gemini-3.1-flash-image-preview"],
                description: "Image model (default: gemini-3-pro-image-preview)",
              },
              aspectRatio: {
                type: "string",
                enum: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
                description: "Aspect ratio (default: 1:1)",
              },
              imageSize: {
                type: "string",
                enum: ["1K", "2K", "4K"],
                description: "Resolution (4K requires gemini-3-pro-image-preview or gemini-3.1-flash-image-preview, default: 1K)",
              },
              imagePaths: {
                type: "array",
                items: { type: "string" },
                description: "Local file paths of reference images to include as input (e.g., for image editing or style transfer)",
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "generate_video",
          description:
            "Start video generation using Google's Veo models. Returns an operationId immediately. " +
            "Video generation typically takes 1-3 minutes. " +
            "Use check_video with the operationId to poll for completion and download results. " +
            "Recommended polling interval: 30 seconds. " +
            "Supports text-to-video, image-to-video (with imagePath), interpolation (imagePath + lastFramePath), " +
            "and reference images (referenceImagePaths, max 3, Veo 3.1 only).",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Video generation prompt",
              },
              model: {
                type: "string",
                enum: ["veo-3.1-fast-generate-001", "veo-3.1-generate-preview"],
                description: "Video model (default: veo-3.1-fast-generate-001)",
              },
              aspectRatio: {
                type: "string",
                enum: ["16:9", "9:16"],
                description: "Aspect ratio (default: 16:9)",
              },
              durationSeconds: {
                type: "string",
                enum: ["4", "6", "8"],
                description: "Video duration in seconds (default: 8)",
              },
              resolution: {
                type: "string",
                enum: ["720p", "1080p", "4k"],
                description: "Video resolution (1080p/4k requires 8s duration, default: 720p)",
              },
              generateAudio: {
                type: "boolean",
                description: "Generate audio for the video (default: true)",
              },
              negativePrompt: {
                type: "string",
                description: "Text describing what to exclude from the video",
              },
              seed: {
                type: "number",
                description: "Random seed for reproducibility",
              },
              numberOfVideos: {
                type: "number",
                description: "Number of videos to generate (default: 1)",
              },
              imagePath: {
                type: "string",
                description: "Local file path of input image for image-to-video generation",
              },
              lastFramePath: {
                type: "string",
                description: "Local file path of last frame image for interpolation (requires imagePath)",
              },
              referenceImagePaths: {
                type: "array",
                items: { type: "string" },
                description: "Local file paths of reference images for style/asset guidance (max 3, Veo 3.1 only)",
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "check_video",
          description:
            "Check the status of a video generation operation. " +
            "Returns status: 'running' (still generating), 'completed' (with saved file paths), or 'failed' (with error). " +
            "If status is 'running', wait ~30 seconds before checking again. " +
            `Completed videos are saved to ${this.videoGenerationHandler.getVideoOutputDir()}.`,
          inputSchema: {
            type: "object",
            properties: {
              operationId: {
                type: "string",
                description: "Operation ID returned by generate_video",
              },
            },
            required: ["operationId"],
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

        case "generate_image": {
          const input = ImageGenerationSchema.parse(args);
          return await this.imageGenerationHandler.handle(input);
        }

        case "generate_video": {
          const input = VideoGenerationSchema.parse(args);
          return await this.videoGenerationHandler.handle(input);
        }

        case "check_video": {
          const input = CheckVideoSchema.parse(args);
          return await this.videoGenerationHandler.handleCheck(input);
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
