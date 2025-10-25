/**
 * ToolRegistry - Manages tool registration and execution
 * Supports parallel execution with retry logic
 */
import { Tool, ToolResult, RunContext } from '../agentic/Tool.js';
import { ToolCall } from '../agentic/ResponseProcessor.js';
import { Logger } from '../utils/Logger.js';
import { EnhancedMCPClient } from '../mcp/EnhancedMCPClient.js';
export declare class ToolRegistry {
    private tools;
    private logger;
    private systemPrompt?;
    constructor(logger: Logger, systemPrompt?: string);
    /**
     * Register built-in WebFetch tool
     */
    registerWebFetch(): void;
    /**
     * Register tools from MCP client
     */
    registerMCPTools(mcpClient: EnhancedMCPClient): void;
    /**
     * Execute multiple tools in parallel with retry logic
     */
    executeTools(calls: ToolCall[], context: RunContext, maxRetries?: number): Promise<ToolResult[]>;
    /**
     * Execute single tool with retry logic
     */
    private executeToolWithRetry;
    /**
     * Get tool by name
     */
    getTool(name: string): Tool | undefined;
    /**
     * Get all registered tools
     */
    getAllTools(): Tool[];
    /**
     * Get tool definitions formatted for LLM prompt
     */
    getToolDefinitionsText(): string;
    /**
     * Get system prompt section
     */
    private getSystemPromptSection;
    /**
     * Get tool definitions section
     */
    private getToolDefinitionsSection;
    /**
     * Get tool usage instructions section
     */
    private getToolInstructionsSection;
    /**
     * Create tool definition from Tool interface
     */
    private createDefinition;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Clear all tools
     */
    clear(): void;
}
//# sourceMappingURL=ToolRegistry.d.ts.map