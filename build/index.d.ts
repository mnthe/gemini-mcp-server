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
 * - agentic/: Agentic loop components (AgenticLoop, RunState, ResponseProcessor)
 * - mcp/: MCP client implementation
 * - tools/: Tool implementations (WebFetch, ToolRegistry)
 * - handlers/: Tool request handlers (query, search, fetch)
 * - server/: MCP server orchestration
 */
import 'dotenv/config';
//# sourceMappingURL=index.d.ts.map