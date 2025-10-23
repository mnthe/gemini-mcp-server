/**
 * Configuration types for Vertex AI MCP Server
 */

export interface VertexAIConfig {
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
}
