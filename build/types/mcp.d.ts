/**
 * Types for MCP server configuration and delegation
 */
export interface MCPServerConfig {
    name: string;
    transport: 'stdio' | 'http';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
}
export interface ReasoningStep {
    step: number;
    thought: string;
    result: string;
}
export interface PromptAnalysisResult {
    needsReasoning: boolean;
    needsDelegation: boolean;
    targetServer?: string;
}
//# sourceMappingURL=mcp.d.ts.map