/**
 * Configuration types for Gemini AI MCP Server
 */

export interface GeminiAIConfig {
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
  logDir?: string;
  disableLogging: boolean;
  logToStderr: boolean;
  allowFileUris: boolean;
}

// Legacy alias for backward compatibility
export type VertexAIConfig = GeminiAIConfig;
