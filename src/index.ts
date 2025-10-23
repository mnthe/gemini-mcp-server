#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { PredictionServiceClient } from "@google-cloud/aiplatform";
import { z } from "zod";

// Input schema for the query tool - prompt only
const QuerySchema = z.object({
  prompt: z.string().describe("The prompt to send to Vertex AI"),
});

// Input schema for search tool (OpenAI MCP spec)
const SearchSchema = z.object({
  query: z.string().describe("The search query"),
});

// Input schema for fetch tool (OpenAI MCP spec)
const FetchSchema = z.object({
  id: z.string().describe("The unique identifier for the document to fetch"),
});

type QueryInput = z.infer<typeof QuerySchema>;
type SearchInput = z.infer<typeof SearchSchema>;
type FetchInput = z.infer<typeof FetchSchema>;

// Interface for search results (OpenAI MCP spec)
interface SearchResult {
  id: string;
  title: string;
  url: string;
}

// Interface for fetch result (OpenAI MCP spec)
interface FetchResult {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, unknown>;
}

// Simple in-memory cache for search results
interface CachedDocument {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, unknown>;
}

interface VertexAIConfig {
  projectId: string;
  location: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
}

class VertexAIMCPServer {
  private server: Server;
  private predictionClient: PredictionServiceClient;
  private config: VertexAIConfig;
  private searchCache: Map<string, CachedDocument>;

  constructor() {
    // Initialize configuration from environment variables
    // Support both standard Vertex AI SDK env vars and custom ones
    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT_ID || "",
      location: process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "us-central1",
      model: process.env.VERTEX_MODEL || "gemini-1.5-flash-002",
      temperature: parseFloat(process.env.VERTEX_TEMPERATURE || "1.0"),
      maxTokens: parseInt(process.env.VERTEX_MAX_TOKENS || "8192", 10),
      topP: parseFloat(process.env.VERTEX_TOP_P || "0.95"),
      topK: parseInt(process.env.VERTEX_TOP_K || "40", 10),
    };

    // Initialize search cache
    this.searchCache = new Map<string, CachedDocument>();

    if (!this.config.projectId) {
      console.error(
        "Error: GOOGLE_CLOUD_PROJECT or VERTEX_PROJECT_ID environment variable is required"
      );
      process.exit(1);
    }

    // Initialize Vertex AI client
    this.predictionClient = new PredictionServiceClient({
      apiEndpoint: `${this.config.location}-aiplatform.googleapis.com`,
    });

    // Initialize MCP server
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

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: "query",
          description:
            "Query Google Cloud Vertex AI with a prompt. " +
            "This tool allows you to send prompts to Vertex AI models " +
            "for tasks such as cross-validation, comparison, or getting alternative perspectives.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The prompt to send to Vertex AI",
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

      switch (toolName) {
        case "query":
          return await this.handleQuery(request.params.arguments || {});
        
        case "search":
          return await this.handleSearch(request.params.arguments || {});
        
        case "fetch":
          return await this.handleFetch(request.params.arguments || {});
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    });
  }

  private async handleQuery(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input
      const input = QuerySchema.parse(args);

      // Construct the endpoint using config
      const endpoint = `projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}`;

      // Prepare the request - Vertex AI expects a specific format
      const instance = {
        content: input.prompt,
      };

      const parameters = {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      };

      const request = {
        endpoint,
        instances: [instance],
        parameters,
      };

      // Make the prediction
      const [response] = await this.predictionClient.predict(request as any);

      // Extract the response text
      let responseText = "No response received";

      if (response.predictions && response.predictions.length > 0) {
        const prediction = response.predictions[0];
        
        // Try to extract text from different possible response structures
        if (typeof prediction === 'object' && prediction !== null) {
          const pred = prediction as Record<string, unknown>;
          
          if (pred.content && typeof pred.content === "string") {
            responseText = pred.content;
          } else if (pred.candidates && Array.isArray(pred.candidates)) {
            const firstCandidate = pred.candidates[0] as Record<string, unknown>;
            if (firstCandidate?.content) {
              responseText = JSON.stringify(firstCandidate.content);
            }
          } else {
            // Fallback: stringify the entire prediction
            responseText = JSON.stringify(prediction);
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error querying Vertex AI: ${errorMessage}`,
          },
        ],
      };
    }
  }

  private async handleSearch(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input
      const input = SearchSchema.parse(args);

      // Construct a search-oriented prompt
      const searchPrompt = `Search and provide information about: ${input.query}. 
      Return your response as a structured list of relevant topics or documents with brief descriptions.`;

      // Use the same prediction client but with a search-oriented approach
      const endpoint = `projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}`;

      const instance = {
        content: searchPrompt,
      };

      const parameters = {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      };

      const request = {
        endpoint,
        instances: [instance],
        parameters,
      };

      // Make the prediction
      const [response] = await this.predictionClient.predict(request as any);

      // Extract the response text
      let responseText = "";

      if (response.predictions && response.predictions.length > 0) {
        const prediction = response.predictions[0];
        
        if (typeof prediction === 'object' && prediction !== null) {
          const pred = prediction as Record<string, unknown>;
          
          if (pred.content && typeof pred.content === "string") {
            responseText = pred.content;
          } else if (pred.candidates && Array.isArray(pred.candidates)) {
            const firstCandidate = pred.candidates[0] as Record<string, unknown>;
            if (firstCandidate?.content) {
              responseText = JSON.stringify(firstCandidate.content);
            }
          } else {
            responseText = JSON.stringify(prediction);
          }
        }
      }

      // Parse response into search results format (OpenAI MCP spec)
      // Create structured results from the AI response
      const results: SearchResult[] = [];
      
      // Generate search results based on the query
      // For now, we'll create a single comprehensive result
      const docId = `doc-${Date.now()}`;
      const result: SearchResult = {
        id: docId,
        title: `Search results for: ${input.query}`,
        url: `vertex-ai://search/${encodeURIComponent(input.query)}`
      };
      results.push(result);

      // Cache the full document for fetch
      const cachedDoc: CachedDocument = {
        id: docId,
        title: result.title,
        text: responseText,
        url: result.url,
        metadata: {
          query: input.query,
          timestamp: new Date().toISOString(),
          model: this.config.model
        }
      };
      this.searchCache.set(docId, cachedDoc);

      // Return results in OpenAI MCP format
      const resultsJson = JSON.stringify({ results });

      return {
        content: [
          {
            type: "text",
            text: resultsJson,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ 
              results: [],
              error: `Error searching with Vertex AI: ${errorMessage}`
            }),
          },
        ],
      };
    }
  }

  private async handleFetch(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input
      const input = FetchSchema.parse(args);

      // Retrieve from cache
      const cachedDoc = this.searchCache.get(input.id);

      if (!cachedDoc) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Document with id '${input.id}' not found. Please perform a search first.`
              }),
            },
          ],
        };
      }

      // Return document in OpenAI MCP format
      const fetchResult: FetchResult = {
        id: cachedDoc.id,
        title: cachedDoc.title,
        text: cachedDoc.text,
        url: cachedDoc.url,
        metadata: cachedDoc.metadata
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(fetchResult),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: `Error fetching document: ${errorMessage}`
            }),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Vertex AI MCP Server running on stdio");
  }
}

// Start the server
const server = new VertexAIMCPServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
