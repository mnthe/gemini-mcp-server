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
import { randomBytes } from "crypto";

// Input schema for the query tool - prompt only
const QuerySchema = z.object({
  prompt: z.string().describe("The prompt to send to Vertex AI"),
  sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
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

// Conversation management interfaces
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ConversationSession {
  id: string;
  history: Message[];
  created: Date;
  lastAccessed: Date;
}

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

// MCP Server Configuration for delegation
interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

// Reasoning step interface
interface ReasoningStep {
  step: number;
  thought: string;
  result: string;
}

interface VertexAIConfig {
  projectId: string;
  location: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  enableConversations: boolean;
  sessionTimeout: number;
  maxHistory: number;
  enableReasoning: boolean;
  maxReasoningSteps: number;
  mcpServers: MCPServerConfig[];
}

// Conversation Manager Class
class ConversationManager {
  private sessions: Map<string, ConversationSession>;
  private sessionTimeout: number;
  private maxHistory: number;

  constructor(sessionTimeout: number, maxHistory: number) {
    this.sessions = new Map();
    this.sessionTimeout = sessionTimeout;
    this.maxHistory = maxHistory;
  }

  createSession(): string {
    const sessionId = `session-${Date.now()}-${randomBytes(8).toString('hex')}`;
    const session: ConversationSession = {
      id: sessionId,
      history: [],
      created: new Date(),
      lastAccessed: new Date(),
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  getSession(sessionId: string): ConversationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Check if session has expired
      const now = new Date();
      const elapsed = (now.getTime() - session.lastAccessed.getTime()) / 1000;
      if (elapsed > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        return undefined;
      }
      session.lastAccessed = now;
    }
    return session;
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.history.push(message);
      // Limit history size
      if (session.history.length > this.maxHistory) {
        session.history = session.history.slice(-this.maxHistory);
      }
    }
  }

  getHistory(sessionId: string): Message[] {
    const session = this.getSession(sessionId);
    return session ? session.history : [];
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  // Cleanup expired sessions
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      const elapsed = (now.getTime() - session.lastAccessed.getTime()) / 1000;
      if (elapsed > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// MCP Client Manager for server-to-server communication
class MCPClientManager {
  private servers: Map<string, MCPServerConfig>;

  constructor() {
    this.servers = new Map();
  }

  registerServer(config: MCPServerConfig): void {
    this.servers.set(config.name, config);
  }

  getServer(name: string): MCPServerConfig | undefined {
    return this.servers.get(name);
  }

  listServers(): string[] {
    return Array.from(this.servers.keys());
  }

  // Simulate tool call to external MCP server
  // In a real implementation, this would spawn a child process and communicate via stdio
  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<any> {
    const server = this.getServer(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found. Available servers: ${this.listServers().join(', ')}`);
    }

    // For now, return a placeholder response indicating the delegation
    // In production, this would:
    // 1. Spawn child process with server.command and server.args
    // 2. Send tool call request via stdio
    // 3. Parse and return response
    return {
      delegated: true,
      serverName,
      toolName,
      message: `Tool '${toolName}' would be called on server '${serverName}' with args: ${JSON.stringify(args)}. (MCP client functionality is a placeholder - actual implementation requires spawning external process)`
    };
  }
}

class VertexAIMCPServer {
  private server: Server;
  private predictionClient: PredictionServiceClient;
  private config: VertexAIConfig;
  private searchCache: Map<string, CachedDocument>;
  private conversationManager: ConversationManager;
  private mcpClientManager: MCPClientManager;

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
      enableConversations: process.env.VERTEX_ENABLE_CONVERSATIONS === "true",
      sessionTimeout: parseInt(process.env.VERTEX_SESSION_TIMEOUT || "3600", 10),
      maxHistory: parseInt(process.env.VERTEX_MAX_HISTORY || "10", 10),
      enableReasoning: process.env.VERTEX_ENABLE_REASONING === "true",
      maxReasoningSteps: parseInt(process.env.VERTEX_MAX_REASONING_STEPS || "5", 10),
      mcpServers: [],
    };

    // Parse MCP servers configuration if provided
    if (process.env.VERTEX_MCP_SERVERS) {
      try {
        this.config.mcpServers = JSON.parse(process.env.VERTEX_MCP_SERVERS);
      } catch (error) {
        console.error("Warning: Failed to parse VERTEX_MCP_SERVERS:", error);
      }
    }

    // Initialize search cache
    this.searchCache = new Map<string, CachedDocument>();

    // Initialize conversation manager
    this.conversationManager = new ConversationManager(
      this.config.sessionTimeout,
      this.config.maxHistory
    );

    // Initialize MCP client manager
    this.mcpClientManager = new MCPClientManager();
    
    // Register configured MCP servers
    for (const serverConfig of this.config.mcpServers) {
      this.mcpClientManager.registerServer(serverConfig);
    }

    // Cleanup expired sessions every 5 minutes
    setInterval(() => {
      this.conversationManager.cleanupExpiredSessions();
    }, 5 * 60 * 1000);

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

      // Handle conversation context
      let conversationContext = "";
      let sessionId = input.sessionId;

      if (this.config.enableConversations && sessionId) {
        // Get conversation history
        const history = this.conversationManager.getHistory(sessionId);
        if (history.length > 0) {
          // Build context from history
          conversationContext = history
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n") + "\n";
        }

        // Add user message to history
        this.conversationManager.addMessage(sessionId, {
          role: 'user',
          content: input.prompt,
          timestamp: new Date(),
        });
      } else if (this.config.enableConversations && !sessionId) {
        // Auto-create session if conversations are enabled
        sessionId = this.conversationManager.createSession();
        this.conversationManager.addMessage(sessionId, {
          role: 'user',
          content: input.prompt,
          timestamp: new Date(),
        });
      }

      // Agent Decision: Determine if prompt needs special handling
      const promptAnalysis = await this.analyzePrompt(input.prompt);
      
      let responseText: string;
      let thinkingProcess = "";

      // Internal Agent Logic: Apply reasoning if needed
      if (this.config.enableReasoning && promptAnalysis.needsReasoning) {
        thinkingProcess += `[Internal: Detected complex problem, applying chain-of-thought reasoning]\n\n`;
        responseText = await this.applyInternalReasoning(input.prompt, conversationContext);
      }
      // Internal Agent Logic: Check if delegation is needed
      else if (promptAnalysis.needsDelegation && this.mcpClientManager.listServers().length > 0) {
        thinkingProcess += `[Internal: Delegating to ${promptAnalysis.targetServer}]\n\n`;
        responseText = await this.applyInternalDelegation(input.prompt, promptAnalysis.targetServer, conversationContext);
      }
      // Standard query
      else {
        responseText = await this.executeQuery(input.prompt, conversationContext);
      }

      // Add assistant response to conversation history
      if (this.config.enableConversations && sessionId) {
        this.conversationManager.addMessage(sessionId, {
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        });
      }

      // Include session ID in response if conversations are enabled
      const resultText = sessionId 
        ? `[Session: ${sessionId}]\n${thinkingProcess}${responseText}`
        : `${thinkingProcess}${responseText}`;

      return {
        content: [
          {
            type: "text",
            text: resultText,
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

  // Analyze prompt to determine what strategy to use
  private async analyzePrompt(prompt: string): Promise<{
    needsReasoning: boolean;
    needsDelegation: boolean;
    targetServer?: string;
  }> {
    // Simple heuristics for now
    const lowerPrompt = prompt.toLowerCase();
    
    // Check if it's a complex reasoning task
    const reasoningKeywords = [
      'analyze', 'compare', 'evaluate', 'trade-off', 'pros and cons',
      'step by step', 'explain why', 'reasoning', 'think through'
    ];
    const needsReasoning = reasoningKeywords.some(keyword => lowerPrompt.includes(keyword));

    // Check if it mentions external services (delegation targets)
    const delegationKeywords: Record<string, string> = {
      'web search': 'web-search',
      'search the web': 'web-search',
      'find online': 'web-search',
      'latest information': 'web-search',
    };
    
    let needsDelegation = false;
    let targetServer: string | undefined;
    
    for (const [keyword, server] of Object.entries(delegationKeywords)) {
      if (lowerPrompt.includes(keyword)) {
        needsDelegation = true;
        targetServer = server;
        break;
      }
    }

    return { needsReasoning, needsDelegation, targetServer };
  }

  // Internal reasoning - chain of thought
  private async applyInternalReasoning(prompt: string, context: string): Promise<string> {
    const steps = Math.min(3, this.config.maxReasoningSteps);
    const reasoningSteps: ReasoningStep[] = [];

    // Step 1: Break down the problem
    const breakdownPrompt = `${context}Break down this complex problem into ${steps} logical steps: ${prompt}\n\nProvide a structured breakdown.`;
    const breakdownResponse = await this.queryVertexAI(breakdownPrompt);
    
    reasoningSteps.push({
      step: 0,
      thought: "Problem breakdown",
      result: breakdownResponse,
    });

    // Process each reasoning step
    for (let i = 1; i <= steps; i++) {
      const stepPrompt = `${context}Problem: "${prompt}"

Previous reasoning:
${reasoningSteps.map(s => `${s.thought}: ${s.result}`).join('\n\n')}

Now reason through step ${i} of ${steps}.`;
      
      const stepResponse = await this.queryVertexAI(stepPrompt);
      
      reasoningSteps.push({
        step: i,
        thought: `Step ${i}`,
        result: stepResponse,
      });
    }

    // Final synthesis
    const synthesisPrompt = `${context}Based on this reasoning, provide a final answer to: ${prompt}

Reasoning steps:
${reasoningSteps.map(s => `${s.thought}:\n${s.result}`).join('\n\n')}`;
    
    const finalAnswer = await this.queryVertexAI(synthesisPrompt);

    // Format response with reasoning trace
    return `## Chain-of-Thought Reasoning

${reasoningSteps.map((s, idx) => `### ${s.thought}\n${s.result}`).join('\n\n')}

## Final Answer
${finalAnswer}`;
  }

  // Internal delegation to other MCP servers
  private async applyInternalDelegation(prompt: string, targetServer: string | undefined, context: string): Promise<string> {
    if (!targetServer) {
      return await this.executeQuery(prompt, context);
    }

    try {
      // Attempt to delegate
      const result = await this.mcpClientManager.callTool(targetServer, 'search', { query: prompt });
      
      // Use Vertex AI to synthesize the delegated result with our own analysis
      const synthesisPrompt = `${context}External tool provided this information: ${JSON.stringify(result)}

Based on this and your knowledge, provide a comprehensive answer to: ${prompt}`;
      
      const synthesis = await this.queryVertexAI(synthesisPrompt);
      
      return `## Delegated Research\n[Used: ${targetServer}]\n\n${synthesis}`;
    } catch (error) {
      // Fallback to standard query if delegation fails
      return await this.executeQuery(prompt, context);
    }
  }

  // Execute a standard query
  private async executeQuery(prompt: string, context: string): Promise<string> {
    const fullPrompt = context 
      ? `${context}user: ${prompt}\nassistant:`
      : prompt;

    return await this.queryVertexAI(fullPrompt);
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

  // Helper method to query Vertex AI (used internally by agent logic)
  private async queryVertexAI(prompt: string): Promise<string> {
    const endpoint = `projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}`;

    const instance = {
      content: prompt,
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

    const [response] = await this.predictionClient.predict(request as any);

    let responseText = "No response received";

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

    return responseText;
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
