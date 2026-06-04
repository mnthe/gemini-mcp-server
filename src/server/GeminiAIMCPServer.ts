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
import { ZodError } from "zod";

import { GeminiAIConfig, CachedDocument, MCPServerConfig } from '../types/index.js';
import {
  QuerySchema,
  SearchSchema,
  FetchSchema,
  ImageGenerationSchema,
  SpeechGenerationSchema,
  CheckVideoSchema,
  buildMusicGenerationSchema,
  buildVideoGenerationSchema,
  GEMINI_IMAGE_INPUT_FILE_TYPES,
  getAllowedVideoModels,
  getDefaultVideoModel,
  getAllowedMusicOutputMimeTypes,
  ALLOWED_LYRIA_LANGUAGES,
  VEO_IMAGE_INPUT_FILE_TYPES,
  VEO_EXTENSION_VIDEO_FILE_TYPES,
} from '../schemas/index.js';
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
import { SpeechGenerationHandler } from '../handlers/SpeechGenerationHandler.js';
import { MusicGenerationHandler } from '../handlers/MusicGenerationHandler.js';
import { VideoGenerationHandler } from '../handlers/VideoGenerationHandler.js';
import { getEffectiveSafeDirectories } from '../utils/fileSecurity.js';
import { resolveOutputDirs } from '../utils/generatedFileSaver.js';

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
  private speechGenerationHandler: SpeechGenerationHandler;
  private musicGenerationHandler: MusicGenerationHandler;
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
    this.speechGenerationHandler = new SpeechGenerationHandler(this.geminiAI, config);
    this.musicGenerationHandler = new MusicGenerationHandler(this.geminiAI, config);
    this.videoGenerationHandler = new VideoGenerationHandler(this.geminiAI, config);

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const availableBackends = this.config.availableBackends ?? [this.config.useVertexAI ? 'vertex' : 'ai-studio'];
      const defaultBackend = this.config.defaultBackend ?? (this.config.useVertexAI ? 'vertex' : 'ai-studio');
      const dual = availableBackends.length > 1;
      const backendProp = {
        type: "string",
        enum: availableBackends,
        description: `Backend for this request (default: ${defaultBackend}; available: ${availableBackends.join(', ')}). Vertex AI uses '-001' video model IDs and Vertex-only controls; Google AI Studio uses '-preview' IDs.`,
      };
      const videoModelEnum = dual
        ? [...getAllowedVideoModels(true), ...getAllowedVideoModels(false)]
        : getAllowedVideoModels(this.config.useVertexAI);
      const defaultVideoModel = getDefaultVideoModel(this.config.useVertexAI);
      const maxVideoCount = dual ? 4 : (this.config.useVertexAI ? 4 : 1);
      const musicOutputMimeTypes = dual ? ['audio/mp3', 'audio/wav'] : getAllowedMusicOutputMimeTypes(this.config.useVertexAI);
      const musicOutputMimeDescription = dual
        ? "Optional output MIME type. Vertex AI supports audio/mp3 only; Google AI Studio supports audio/wav for lyria-3-pro-preview."
        : (this.config.useVertexAI
          ? "Optional output MIME type; Vertex AI Lyria 3 model card supports audio/mp3 only"
          : "Optional output MIME type; Gemini API/AI Studio defaults to audio/mp3 and supports audio/wav only with lyria-3-pro-preview");

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
            additionalProperties: false,
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
                description: "Optional model override (e.g., gemini-3.5-flash, gemini-3.1-pro-preview, gemini-3.1-flash-lite, gemini-3.1-pro-preview-customtools)",
              },
              thinkingLevel: {
                type: "string",
                enum: ["minimal", "low", "medium", "high", "MINIMAL", "LOW", "MEDIUM", "HIGH"],
                description: "Optional Gemini 3 thinking level override",
              },
              mediaResolution: {
                type: "string",
                enum: ["low", "medium", "high", "LOW", "MEDIUM", "HIGH"],
                description: "Optional global media resolution for multimodal inputs",
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
            additionalProperties: false,
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
            additionalProperties: false,
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
            "Supports gemini-3-pro-image, gemini-3.1-flash-image, and gemini-2.5-flash-image models. " +
            "gemini-2.5-flash-image supports at most 3 reference images and does not support imageSize; gemini-3.1-flash-image is required for 0.5K and 1:4/1:8/4:1/8:1 ratios. " +
            `Reference images use imagePaths and must be ${GEMINI_IMAGE_INPUT_FILE_TYPES}. ` +
            "Audio and video reference files are not accepted by generate_image. " +
            `Images are saved to ${this.imageGenerationHandler.getImageOutputDir()} and returned as base64.`,
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              prompt: {
                type: "string",
                description: "Image generation prompt",
              },
              model: {
                type: "string",
                enum: ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"],
                description: "Image model (default: gemini-3-pro-image; gemini-2.5-flash-image supports at most 3 reference images and does not support imageSize, and retires 2026-10-02 — prefer gemini-3.1-flash-image)",
              },
              aspectRatio: {
                type: "string",
                enum: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"],
                description: "Aspect ratio (default: 1:1; 1:4, 1:8, 4:1, and 8:1 require gemini-3.1-flash-image)",
              },
              imageSize: {
                type: "string",
                enum: ["0.5K", "1K", "2K", "4K"],
                description: "Resolution (0.5K requires gemini-3.1-flash-image, default: 1K)",
              },
              imagePaths: {
                type: "array",
                items: { type: "string" },
                maxItems: 14,
                description: `Local file paths of reference images to include as input (max 14; gemini-2.5-flash-image supports at most 3). Supported file types: ${GEMINI_IMAGE_INPUT_FILE_TYPES}. Audio/video files are not accepted.`,
              },
              systemInstruction: {
                type: "string",
                description: "Optional system instruction for Gemini 3 image models",
              },
              thinkingLevel: {
                type: "string",
                enum: ["minimal", "high", "MINIMAL", "HIGH"],
                description: "Optional thinking level; only supported by gemini-3.1-flash-image",
              },
              mediaResolution: {
                type: "string",
                enum: ["low", "medium", "high", "LOW", "MEDIUM", "HIGH"],
                description: "Optional media resolution for reference image inputs",
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "generate_speech",
          description:
            "Generate speech audio using Gemini TTS models. " +
            "Supports single-speaker and two-speaker TTS. " +
            "Input is text-only; audio, image, and video reference files are not accepted. TTS has a 32k-token context limit and does not support streaming. " +
            `Audio is saved to ${this.speechGenerationHandler.getSpeechOutputDir()} and returned as MCP audio content.`,
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              prompt: {
                type: "string",
                description: "Text or transcript to synthesize as speech. Gemini TTS is text-only input; audio/image/video reference files are not accepted.",
              },
              model: {
                type: "string",
                enum: ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"],
                description: "Speech model (default: gemini-3.1-flash-tts-preview)",
              },
              voiceName: {
                type: "string",
                description: "Prebuilt voice name for single-speaker TTS (default: Kore)",
              },
              languageCode: {
                type: "string",
                description: "Optional BCP-47 language code for speech synthesis",
              },
              speakers: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                description: "Exactly two speaker voice configs for multi-speaker TTS",
                items: {
                  type: "object",
                  properties: {
                    speaker: {
                      type: "string",
                      description: "Speaker name exactly as it appears in the prompt",
                    },
                    voiceName: {
                      type: "string",
                      description: "Prebuilt voice name for this speaker",
                    },
                  },
                  required: ["speaker", "voiceName"],
                },
              },
            },
            required: ["prompt"],
          },
        },
        {
          name: "generate_music",
          description:
            "Generate music using Lyria models. " +
            "Supports lyria-3-clip-preview fixed 30-second clips and lyria-3-pro-preview full songs up to 184 seconds. " +
            "Lyria 3 supports one clip per prompt; language directions follow the model-card set: English, German, Spanish, French, Hindi, Japanese, Korean, Portuguese. " +
            (this.config.useVertexAI
              ? "Vertex AI mode supports 44.1 kHz, 192 kbps audio/mp3 output only. "
              : "Gemini API/AI Studio mode supports 44.1 kHz stereo audio/mp3 output, and audio/wav only for lyria-3-pro-preview. ") +
            "Negative prompting is not supported. " +
            `Lyria 3 accepts text prompts and optional imagePaths (${GEMINI_IMAGE_INPUT_FILE_TYPES}); audio/video reference files are not accepted. ` +
            `Audio is saved to ${this.musicGenerationHandler.getMusicOutputDir()} and returned as MCP audio content.`,
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              prompt: {
                type: "string",
                description: "Music generation prompt",
              },
              model: {
                type: "string",
                enum: ["lyria-3-clip-preview", "lyria-3-pro-preview"],
                description: "Music model (default: lyria-3-clip-preview)",
              },
              outputMimeType: {
                type: "string",
                enum: musicOutputMimeTypes,
                description: musicOutputMimeDescription,
              },
              imagePaths: {
                type: "array",
                items: { type: "string" },
                maxItems: 10,
                description: `Optional local image paths to use as multimodal music generation inputs (max 10). Supported Gemini image input file types: ${GEMINI_IMAGE_INPUT_FILE_TYPES}. Audio/video reference files are not accepted by Lyria 3.`,
              },
              lyrics: {
                type: "string",
                description: "Optional user-provided lyrics to include in the Lyria prompt",
              },
              instrumental: {
                type: "boolean",
                description: "Explicitly request instrumental-only output",
              },
              vocalStyle: {
                type: "string",
                description: "Optional vocal generation direction, such as vocal tone, language, or delivery style",
              },
              language: {
                type: "string",
                enum: ALLOWED_LYRIA_LANGUAGES,
                description: "Optional output language direction. Supported Lyria 3 languages: English, German, Spanish, French, Hindi, Japanese, Korean, Portuguese",
              },
              durationSeconds: {
                type: "number",
                minimum: 1,
                maximum: 184,
                description: "Optional target duration in seconds; requires lyria-3-pro-preview; maximum 184 seconds. lyria-3-clip-preview is fixed at 30 seconds",
              },
              bpm: {
                type: "number",
                minimum: 40,
                maximum: 240,
                description: "Optional tempo direction in beats per minute",
              },
              intensity: {
                type: "string",
                enum: ["low", "medium", "high", "LOW", "MEDIUM", "HIGH"],
                description: "Optional musical intensity direction",
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
            "reference images (referenceImagePaths, max 3, Veo 3.1 only), and Veo video extension (videoPath). " +
            `Image source file types: ${VEO_IMAGE_INPUT_FILE_TYPES}. videoPath must be ${VEO_EXTENSION_VIDEO_FILE_TYPES}. ` +
            "Audio file references are not supported; describe dialogue, SFX, and ambience in the prompt instead.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              prompt: {
                type: "string",
                description: "Video generation prompt. Include dialogue, SFX, and ambience as text audio cues; audio reference files are not accepted.",
              },
              model: {
                type: "string",
                enum: videoModelEnum,
                description: `Video model (default: ${defaultVideoModel})`,
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
                description: this.config.useVertexAI
                  ? "Generate audio for the video (default: true)"
                  : "Not configurable in Gemini Developer API mode; Veo 3.1 audio is always on",
              },
              enhancePrompt: {
                type: "boolean",
                description: "Use Veo prompt rewriting/enhancement",
              },
              personGeneration: {
                type: "string",
                enum: ["allow_all", "allow_adult", "dont_allow"],
                description: "Optional person generation control",
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
                minimum: 1,
                maximum: maxVideoCount,
                description: `Number of videos to generate (default: 1, max: ${maxVideoCount})`,
              },
              imagePath: {
                type: "string",
                description: `Local file path of input image for image-to-video generation. Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}`,
              },
              lastFramePath: {
                type: "string",
                description: `Local file path of last frame image for interpolation (requires imagePath). Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}`,
              },
              referenceImagePaths: {
                type: "array",
                items: { type: "string" },
                maxItems: 3,
                description: `Local file paths of reference images for style/asset guidance (max 3, Veo 3.1 only). Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}`,
              },
              videoPath: {
                type: "string",
                description: `Local file path of a Veo-generated 720p input video to extend. Supported file types: ${VEO_EXTENSION_VIDEO_FILE_TYPES}`,
              },
              compressionQuality: {
                type: "string",
                enum: ["optimized", "lossless"],
                description: "Output video compression quality (Vertex AI only): 'optimized' (smaller file, default) or 'lossless' (larger, highest quality)",
              },
              resizeMode: {
                type: "string",
                enum: ["crop", "pad"],
                description: "How the input image is fit to the target aspect ratio for image-to-video (Vertex AI only; requires imagePath): 'crop' or 'pad' (default pad)",
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

      // When more than one backend is configured, advertise the per-request
      // `backend` selector on every generation tool so callers can switch.
      if (dual) {
        const backendTools = new Set([
          "query",
          "generate_image",
          "generate_speech",
          "generate_video",
          "generate_music",
        ]);
        for (const tool of tools) {
          if (backendTools.has(tool.name)) {
            (tool.inputSchema.properties as Record<string, unknown>).backend = backendProp;
          }
        }
      }

      return { tools };
    });

    // Handle tool calls with switch-case statement
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      try {
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

          case "generate_speech": {
            const input = SpeechGenerationSchema.parse(args);
            return await this.speechGenerationHandler.handle(input);
          }

          case "generate_music": {
            const input = buildMusicGenerationSchema(this.config.useVertexAI, this.config.availableBackends).parse(args);
            return await this.musicGenerationHandler.handle(input);
          }

          case "generate_video": {
            const input = buildVideoGenerationSchema(this.config.useVertexAI, this.config.availableBackends).parse(args);
            return await this.videoGenerationHandler.handle(input);
          }

          case "check_video": {
            const input = CheckVideoSchema.parse(args);
            return await this.videoGenerationHandler.handleCheck(input);
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (error) {
        return this.formatToolErrorResponse(toolName, error);
      }
    });
  }

  private formatToolErrorResponse(
    toolName: string,
    error: unknown
  ): { isError: true; content: Array<{ type: string; text: string }> } {
    const details = this.describeToolError(error);

    if (error instanceof Error) {
      this.logger.error(`Tool '${toolName}' failed: ${details.message}`, error);
    } else {
      this.logger.error(`Tool '${toolName}' failed: ${details.message}`);
    }

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "failed",
            tool: toolName,
            ...details,
          }),
        },
      ],
    };
  }

  private describeToolError(error: unknown): {
    errorType: string;
    message: string;
    code?: string;
    statusCode?: number;
    issues?: Array<{ path: string; code: string; message: string }>;
  } {
    if (error instanceof ZodError) {
      return {
        errorType: "validation_error",
        message: "Tool arguments failed validation",
        issues: error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
          code: issue.code,
          message: issue.message,
        })),
      };
    }

    const message = this.getErrorMessage(error);
    const code = this.getStringField(error, "code");
    const statusCode = this.getNumberField(error, "status") ?? this.getNumberField(error, "statusCode");
    const errorType = this.getErrorType(error, code, statusCode);

    return {
      errorType,
      message,
      ...(code ? { code } : {}),
      ...(statusCode !== undefined ? { statusCode } : {}),
    };
  }

  private getErrorType(error: unknown, code?: string, statusCode?: number): string {
    if (error instanceof Error && error.name && error.name !== "Error") {
      return error.name;
    }

    if (code === "ENOENT") {
      return "file_not_found";
    }
    if (code === "EACCES" || code === "EPERM") {
      return "file_access_error";
    }
    if (statusCode !== undefined) {
      return "api_error";
    }

    return "runtime_error";
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    const message = this.getStringField(error, "message");
    if (message) {
      return message;
    }

    return "Unknown error";
  }

  private getStringField(value: unknown, field: string): string | undefined {
    if (typeof value !== "object" || value === null || !(field in value)) {
      return undefined;
    }

    const fieldValue = (value as Record<string, unknown>)[field];
    return typeof fieldValue === "string" ? fieldValue : undefined;
  }

  private getNumberField(value: unknown, field: string): number | undefined {
    if (typeof value !== "object" || value === null || !(field in value)) {
      return undefined;
    }

    const fieldValue = (value as Record<string, unknown>)[field];
    return typeof fieldValue === "number" ? fieldValue : undefined;
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    this.logger.info('Initializing Gemini AI MCP Server');
    this.logBootDiagnostics();

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
   * Log effective filesystem policy at boot so users can see exactly which
   * directories multimodal fileData inputs (file://, absolute paths) are
   * allowed to read from in the running process.
   */
  private logBootDiagnostics(): void {
    const outputs = resolveOutputDirs(this.config);
    const safeDirs = getEffectiveSafeDirectories({
      additionalSafeDirectories: [outputs.image, outputs.video, outputs.speech, outputs.music],
    });
    this.logger.info(`cwd: ${process.cwd()}`);
    this.logger.info(`Allowed multimodal directories: ${safeDirs.join(', ')}`);
    this.logger.info(
      `file:// URIs ${this.config.allowFileUris ? 'enabled' : 'disabled'}` +
      (this.config.allowFileUris ? '' : ' (set GEMINI_ALLOW_FILE_URIS=true to enable in CLI environments)')
    );
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
