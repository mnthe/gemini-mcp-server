/**
 * Tool - Interface and types for tool system
 * Follows MCP standard for tool definitions and execution
 */
export interface JSONSchema {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    description?: string;
    [key: string]: any;
}
export interface ToolResult {
    status: 'success' | 'error';
    content: string;
    metadata?: Record<string, any>;
}
export interface RunContext {
    sessionId: string;
    context: Record<string, any>;
    [key: string]: any;
}
/**
 * Tool interface following MCP standard
 */
export interface Tool {
    /**
     * Tool name (must be unique)
     */
    name: string;
    /**
     * Human-readable description for LLM
     */
    description: string;
    /**
     * JSON Schema for parameters (MCP standard)
     */
    parameters: JSONSchema;
    /**
     * Execute the tool with given arguments
     */
    execute(args: any, context: RunContext): Promise<ToolResult>;
}
/**
 * Tool definition for LLM prompt
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: string;
}
/**
 * Base abstract class for tools
 */
export declare abstract class BaseTool implements Tool {
    abstract name: string;
    abstract description: string;
    abstract parameters: JSONSchema;
    /**
     * Execute the tool - must be implemented by subclasses
     */
    abstract execute(args: any, context: RunContext): Promise<ToolResult>;
    /**
     * Validate arguments against parameters schema
     */
    protected validateArgs(args: any): void;
    /**
     * Get formatted tool definition for LLM prompt
     */
    getDefinition(): ToolDefinition;
    /**
     * Format parameters for human-readable display
     */
    private formatParameters;
}
//# sourceMappingURL=Tool.d.ts.map