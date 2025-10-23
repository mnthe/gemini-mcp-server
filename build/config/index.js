/**
 * Configuration loader for Vertex AI MCP Server
 * Loads and validates environment variables
 */
export function loadConfig() {
    // Get project ID from standard Vertex AI SDK env vars or fallback
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.VERTEX_PROJECT_ID ||
        "";
    if (!projectId) {
        console.error("Error: GOOGLE_CLOUD_PROJECT or VERTEX_PROJECT_ID environment variable is required");
        process.exit(1);
    }
    // Get location from standard Vertex AI SDK env vars or fallback
    // Note: @google/genai with Vertex AI mode requires 'global' for proper authentication
    const location = process.env.GOOGLE_CLOUD_LOCATION ||
        process.env.VERTEX_LOCATION ||
        "global";
    // Agent configuration - model and parameters from environment
    const model = process.env.VERTEX_MODEL || "gemini-1.5-flash-002";
    const temperature = parseFloat(process.env.VERTEX_TEMPERATURE || "1.0");
    const maxTokens = parseInt(process.env.VERTEX_MAX_TOKENS || "8192", 10);
    const topP = parseFloat(process.env.VERTEX_TOP_P || "0.95");
    const topK = parseInt(process.env.VERTEX_TOP_K || "40", 10);
    // Conversation mode configuration
    const enableConversations = process.env.VERTEX_ENABLE_CONVERSATIONS === "true";
    const sessionTimeout = parseInt(process.env.VERTEX_SESSION_TIMEOUT || "3600", 10);
    const maxHistory = parseInt(process.env.VERTEX_MAX_HISTORY || "10", 10);
    // Reasoning configuration
    const enableReasoning = process.env.VERTEX_ENABLE_REASONING === "true";
    const maxReasoningSteps = parseInt(process.env.VERTEX_MAX_REASONING_STEPS || "5", 10);
    // Logging configuration
    const logDir = process.env.VERTEX_LOG_DIR;
    const disableLogging = process.env.VERTEX_DISABLE_LOGGING === "true";
    const logToStderr = process.env.VERTEX_LOG_TO_STDERR === "true";
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
    };
}
//# sourceMappingURL=index.js.map