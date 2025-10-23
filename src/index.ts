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

// Input schema for search/fetch tool
const SearchSchema = z.object({
  query: z.string().describe("The search query"),
});

type QueryInput = z.infer<typeof QuerySchema>;
type SearchInput = z.infer<typeof SearchSchema>;

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
            "Search for information using Vertex AI. " +
            "This tool can be used to fetch and search for information, similar to ChatGPT's web browsing capability.",
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
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "query") {
        return await this.handleQuery(request.params.arguments || {});
      } else if (request.params.name === "search") {
        return await this.handleSearch(request.params.arguments || {});
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
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
      const searchPrompt = `Search and provide information about: ${input.query}`;

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
      let responseText = "No search results found";

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
            text: `Error searching with Vertex AI: ${errorMessage}`,
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
