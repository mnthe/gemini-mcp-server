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

// Input schema for the query tool
const QueryVertexAISchema = z.object({
  prompt: z.string().describe("The prompt to send to Vertex AI"),
  model: z
    .string()
    .optional()
    .default("gemini-1.5-flash-002")
    .describe("The Gemini model to use (e.g., gemini-1.5-pro-002, gemini-1.5-flash-002)"),
  maxTokens: z
    .number()
    .optional()
    .default(8192)
    .describe("Maximum number of tokens in the response"),
  temperature: z
    .number()
    .optional()
    .default(1.0)
    .describe("Temperature for response generation (0.0 to 2.0)"),
  topP: z
    .number()
    .optional()
    .default(0.95)
    .describe("Top-p for nucleus sampling"),
  topK: z
    .number()
    .optional()
    .default(40)
    .describe("Top-k for sampling"),
});

type QueryVertexAIInput = z.infer<typeof QueryVertexAISchema>;

interface VertexAIConfig {
  projectId: string;
  location: string;
}

class VertexAIMCPServer {
  private server: Server;
  private predictionClient: PredictionServiceClient;
  private config: VertexAIConfig;

  constructor() {
    // Initialize configuration from environment variables
    this.config = {
      projectId: process.env.VERTEX_PROJECT_ID || "",
      location: process.env.VERTEX_LOCATION || "us-central1",
    };

    if (!this.config.projectId) {
      console.error(
        "Error: VERTEX_PROJECT_ID environment variable is required"
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
          name: "query_vertex_ai",
          description:
            "Query Google Cloud Vertex AI with a prompt using Gemini models. " +
            "This tool allows you to send prompts to Gemini models (like gemini-1.5-pro or gemini-1.5-flash) " +
            "for tasks such as cross-validation, comparison, or getting alternative perspectives.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The prompt to send to Vertex AI",
              },
              model: {
                type: "string",
                description:
                  "The Gemini model to use (e.g., gemini-1.5-pro-002, gemini-1.5-flash-002)",
                default: "gemini-1.5-flash-002",
              },
              maxTokens: {
                type: "number",
                description: "Maximum number of tokens in the response",
                default: 8192,
              },
              temperature: {
                type: "number",
                description:
                  "Temperature for response generation (0.0 to 2.0)",
                default: 1.0,
              },
              topP: {
                type: "number",
                description: "Top-p for nucleus sampling",
                default: 0.95,
              },
              topK: {
                type: "number",
                description: "Top-k for sampling",
                default: 40,
              },
            },
            required: ["prompt"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "query_vertex_ai") {
        return await this.handleQueryVertexAI(request.params.arguments || {});
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  private async handleQueryVertexAI(
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate input
      const input = QueryVertexAISchema.parse(args);

      // Construct the endpoint
      const endpoint = `projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${input.model}`;

      // Prepare the request - Vertex AI expects a specific format
      const instance = {
        content: input.prompt,
      };

      const parameters = {
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens,
        topP: input.topP,
        topK: input.topK,
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
