/**
 * Types for MCP server configuration and delegation
 */

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
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
