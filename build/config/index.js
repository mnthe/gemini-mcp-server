/**
 * Configuration loader for Gemini AI MCP Server
 * Loads and validates environment variables following gen-ai SDK standards
 * Reference: https://googleapis.github.io/js-genai/release_docs/index.html
 */
export function loadConfig() {
    // Get project ID - follows gen-ai SDK standard environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || "";
    if (!projectId) {
        console.error("Error: GOOGLE_CLOUD_PROJECT environment variable is required");
        process.exit(1);
    }
    // Get location - follows gen-ai SDK standards
    // Note: @google/genai with Vertex AI mode requires location for proper authentication
    const location = process.env.GOOGLE_CLOUD_LOCATION || "global";
    // Model and parameters - use GEMINI_* environment variables
    const model = process.env.GEMINI_MODEL || "gemini-2.5-pro";
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
    const logToStderr = process.env.GEMINI_LOG_TO_STDERR === "true";
    // File URI configuration - allows file:// URLs in CLI environments (Codex, Claude Code, Gemini CLI)
    // Should NOT be enabled in desktop apps (Claude Desktop, ChatGPT App) for security reasons
    const allowFileUris = process.env.GEMINI_ALLOW_FILE_URIS === "true";
    return {
        projectId,
        location,
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
    };
}
//# sourceMappingURL=index.js.map