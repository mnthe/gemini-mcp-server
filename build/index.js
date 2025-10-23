#!/usr/bin/env node
/**
 * Vertex AI MCP Server - Entry Point
 *
 * A Model Context Protocol (MCP) server that provides intelligent agent capabilities
 * for Google Cloud Vertex AI, including automatic reasoning and delegation.
 *
 * Architecture:
 * - config/: Configuration loading and validation
 * - types/: TypeScript type definitions
 * - schemas/: Zod validation schemas
 * - managers/: Business logic managers (conversations, MCP clients)
 * - services/: External service integrations (Vertex AI)
 * - agents/: AI agent logic (prompt analysis, reasoning, delegation)
 * - handlers/: Tool request handlers (query, search, fetch)
 * - server/: MCP server orchestration
 */
import { loadConfig } from './config/index.js';
import { VertexAIMCPServer } from './server/VertexAIMCPServer.js';
// Load configuration
const config = loadConfig();
// Create and start server
const server = new VertexAIMCPServer(config);
server.run().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map