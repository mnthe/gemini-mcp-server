/**
 * Configuration types for Gemini AI MCP Server
 */

/**
 * Backend that fulfills a generation request.
 * - 'vertex': Vertex AI (requires GOOGLE_CLOUD_PROJECT)
 * - 'ai-studio': Google AI Studio / Gemini Developer API (requires GEMINI_API_KEY or GOOGLE_API_KEY)
 */
export type Backend = 'vertex' | 'ai-studio';

export interface GeminiAIConfig {
  projectId?: string;
  location?: string;
  apiKey?: string;
  /** True when the default backend is Vertex AI. Kept for backward compatibility. */
  useVertexAI: boolean;
  /** Backend used when a request does not specify one. Populated by loadConfig; consumers should fall back to useVertexAI when absent. */
  defaultBackend?: Backend;
  /** Backends that have credentials configured and can serve requests. Populated by loadConfig; consumers should fall back to [useVertexAI ? 'vertex' : 'ai-studio'] when absent. */
  availableBackends?: Backend[];
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
  systemPrompt?: string;
  mediaResolution?: string;
  imageOutputDir?: string;
  videoOutputDir?: string;
  speechOutputDir?: string;
  musicOutputDir?: string;
}
