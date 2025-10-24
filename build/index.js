#!/usr/bin/env node
/**
 * Gemini AI MCP Server - Entry Point
 *
 * A Model Context Protocol (MCP) server that provides intelligent agent capabilities
 * for Google AI (Gemini models) via Vertex AI or Google AI Studio, including
 * automatic reasoning and delegation.
 *
 * Architecture:
 * - config/: Configuration loading and validation
 * - types/: TypeScript type definitions
 * - schemas/: Zod validation schemas
 * - managers/: Business logic managers (conversations, MCP clients)
 * - services/: External service integrations (Gemini AI)
 * - agentic/: Agentic loop components (AgenticLoop, RunState, ResponseProcessor)
 * - mcp/: MCP client implementation
 * - tools/: Tool implementations (WebFetch, ToolRegistry)
 * - handlers/: Tool request handlers (query, search, fetch)
 * - server/: MCP server orchestration
 */
// Load .env file for local development
import 'dotenv/config';
import { loadConfig } from './config/index.js';
import { GeminiAIMCPServer } from './server/GeminiAIMCPServer.js';
// Load configuration
const config = loadConfig();
// Create and start server
const server = new GeminiAIMCPServer(config);
server.run().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map