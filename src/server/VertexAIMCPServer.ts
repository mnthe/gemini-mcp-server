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

import { VertexAIConfig, CachedDocument } from '../types/index.js';
import { QuerySchema, SearchSchema, FetchSchema } from '../schemas/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { MCPClientManager } from '../managers/MCPClientManager.js';
import { VertexAIService } from '../services/VertexAIService.js';
import { PromptAnalyzer } from '../agents/PromptAnalyzer.js';
import { ReasoningAgent } from '../agents/ReasoningAgent.js';
import { DelegationAgent } from '../agents/DelegationAgent.js';
import { QueryHandler } from '../handlers/QueryHandler.js';
import { SearchHandler } from '../handlers/SearchHandler.js';
import { FetchHandler } from '../handlers/FetchHandler.js';

export class VertexAIMCPServer {
  private server: Server;
  private config: VertexAIConfig;
  
  // Managers
  private conversationManager: ConversationManager;
  private mcpClientManager: MCPClientManager;
  
  // Services
  private vertexAI: VertexAIService;
  
  // Agents
  private promptAnalyzer: PromptAnalyzer;
  private reasoningAgent: ReasoningAgent;
  private delegationAgent: DelegationAgent;
  
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

    // Initialize managers
    this.conversationManager = new ConversationManager(
      config.sessionTimeout,
      config.maxHistory
    );
    this.mcpClientManager = new MCPClientManager();

    // Initialize services
    this.vertexAI = new VertexAIService(config);

    // Initialize agents
    this.promptAnalyzer = new PromptAnalyzer();
    this.reasoningAgent = new ReasoningAgent(this.vertexAI, config.maxReasoningSteps);
    this.delegationAgent = new DelegationAgent(this.mcpClientManager, this.vertexAI);

    // Initialize handlers
    this.queryHandler = new QueryHandler(
      config,
      this.conversationManager,
      this.vertexAI,
      this.promptAnalyzer,
      this.reasoningAgent,
      this.delegationAgent
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
            "Query Google Cloud Vertex AI with a prompt. " +
            "This tool acts as an intelligent agent that can handle complex requests through internal reasoning and delegation. " +
            "The agent will automatically: " +
            "1) Use chain-of-thought reasoning for complex problems (when VERTEX_ENABLE_REASONING=true), " +
            "2) Delegate to other MCP servers when appropriate (configured via VERTEX_MCP_SERVERS), " +
            "3) Maintain multi-turn conversations (when VERTEX_ENABLE_CONVERSATIONS=true). " +
            "Simply provide your query and the agent handles the rest.",
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Vertex AI MCP Server running on stdio");
  }
}
