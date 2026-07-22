/**
 * Configuration loader for Gemini AI MCP Server
 * Loads and validates environment variables following gen-ai SDK standards
 * Reference: https://googleapis.github.io/js-genai/release_docs/index.html
 */

import { GeminiAIConfig, Backend } from '../types/index.js';

export function loadConfig(): GeminiAIConfig {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const explicitVertexMode = process.env.GOOGLE_GENAI_USE_VERTEXAI;

  // Detect which backends have credentials. When both are present, the server
  // can route per request (the `backend` tool argument); otherwise it serves
  // the single available backend.
  const vertexAvailable = Boolean(projectId);
  const aiStudioAvailable = Boolean(apiKey);

  if (!vertexAvailable && !aiStudioAvailable) {
    console.error(
      "Error: set GOOGLE_CLOUD_PROJECT (Vertex AI) and/or GEMINI_API_KEY/GOOGLE_API_KEY (Google AI Studio)."
    );
    process.exit(1);
  }

  // Resolve the default backend: explicit override wins, else infer from creds
  // (Vertex preferred when a project is set, matching prior behavior).
  let defaultBackend: Backend;
  if (explicitVertexMode === "true") {
    defaultBackend = "vertex";
  } else if (explicitVertexMode === "false") {
    defaultBackend = "ai-studio";
  } else {
    defaultBackend = vertexAvailable ? "vertex" : "ai-studio";
  }

  if (defaultBackend === "vertex" && !vertexAvailable) {
    console.error(
      "Error: GOOGLE_CLOUD_PROJECT is required when GOOGLE_GENAI_USE_VERTEXAI=true (Vertex AI mode)"
    );
    process.exit(1);
  }
  if (defaultBackend === "ai-studio" && !aiStudioAvailable) {
    console.error(
      "Error: GEMINI_API_KEY or GOOGLE_API_KEY is required when GOOGLE_GENAI_USE_VERTEXAI=false (Google AI Studio mode)"
    );
    process.exit(1);
  }

  // Default backend first so it is the natural primary in any ordered use.
  const availableBackends: Backend[] = [];
  if (defaultBackend === "vertex") {
    availableBackends.push("vertex");
    if (aiStudioAvailable) availableBackends.push("ai-studio");
  } else {
    availableBackends.push("ai-studio");
    if (vertexAvailable) availableBackends.push("vertex");
  }

  const useVertexAI = defaultBackend === "vertex";

  // Get location - follows gen-ai SDK standards
  // Note: @google/genai with Vertex AI mode requires location for proper authentication
  const location = process.env.GOOGLE_CLOUD_LOCATION || "global";

  // Model and parameters - use GEMINI_* environment variables
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const temperature = parseFloat(process.env.GEMINI_TEMPERATURE || "1.0");
  const maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS || "8192", 10);
  const topP = parseFloat(process.env.GEMINI_TOP_P || "0.95");
  const topK = parseInt(process.env.GEMINI_TOP_K || "40", 10);

  // Conversation mode configuration
  const enableConversations = process.env.GEMINI_ENABLE_CONVERSATIONS === "true";
  const sessionTimeout = parseInt(process.env.GEMINI_SESSION_TIMEOUT || "3600", 10);
  const maxHistory = parseInt(process.env.GEMINI_MAX_HISTORY || "10", 10);

  // Reasoning configuration
  const enableReasoning = process.env.GEMINI_ENABLE_REASONING === "true";
  const maxReasoningSteps = parseInt(process.env.GEMINI_MAX_REASONING_STEPS || "5", 10);

  // Logging configuration
  const logDir = process.env.GEMINI_LOG_DIR;
  const disableLogging = process.env.GEMINI_DISABLE_LOGGING === "true";
  const logToStderr = process.env.GEMINI_LOG_TO_STDERR !== "false";  // Default: true (console logging)

  // File URI configuration - allows file:// URLs in CLI environments (Codex, Claude Code, Gemini CLI)
  // Should NOT be enabled in desktop apps (Claude Desktop, ChatGPT App) for security reasons
  const allowFileUris = process.env.GEMINI_ALLOW_FILE_URIS === "true";

  // System prompt override - allows customization of AI assistant behavior
  const systemPrompt = process.env.GEMINI_SYSTEM_PROMPT;

  // Media resolution for Gemini 3 models
  const mediaResolution = process.env.GEMINI_MEDIA_RESOLUTION;

  // Image output directory - where generated images are saved
  const imageOutputDir = process.env.GEMINI_IMAGE_OUTPUT_DIR;

  // Video output directory - where generated videos are saved
  const videoOutputDir = process.env.GEMINI_VIDEO_OUTPUT_DIR;

  // Audio output directories - where generated speech and music are saved
  const speechOutputDir = process.env.GEMINI_SPEECH_OUTPUT_DIR;
  const musicOutputDir = process.env.GEMINI_MUSIC_OUTPUT_DIR;

  return {
    projectId,
    location,
    apiKey,
    useVertexAI,
    defaultBackend,
    availableBackends,
    model,
    temperature,
    maxTokens,
    topP,
    topK,
    enableConversations,
    sessionTimeout,
    maxHistory,
    enableReasoning,
    maxReasoningSteps,
    logDir,
    disableLogging,
    logToStderr,
    allowFileUris,
    systemPrompt,
    mediaResolution,
    imageOutputDir,
    videoOutputDir,
    speechOutputDir,
    musicOutputDir,
  };
}
