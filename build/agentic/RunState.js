/**
 * RunState - Manages state for agentic loop execution
 * In-memory only (no serialization needed for chat MCP server)
 */
import { Logger } from '../utils/Logger.js';
export class RunState {
    // Turn tracking
    currentTurn = 0;
    maxTurns;
    // Message history (in-memory only)
    messages = [];
    generatedItems = [];
    // Context
    sessionId;
    context;
    // Tracking
    toolCallHistory = [];
    reasoningSteps = [];
    // Logging
    logger;
    constructor(options = {}) {
        this.maxTurns = options.maxTurns ?? 10;
        this.sessionId = options.sessionId ?? this.generateSessionId();
        this.context = options.context ?? {};
        this.logger = new Logger(this.sessionId, options.logDir);
        this.logger.info('RunState initialized', {
            maxTurns: this.maxTurns,
            sessionId: this.sessionId,
        });
    }
    /**
     * Add a message to the conversation history
     */
    addMessage(message) {
        this.messages.push(message);
        this.generatedItems.push({
            type: 'message',
            content: message,
            timestamp: new Date(),
        });
        this.logger.info('Message added', {
            role: message.role,
            contentLength: message.content.length,
        });
    }
    /**
     * Add a tool result to the state
     */
    addToolResult(record) {
        this.toolCallHistory.push(record);
        this.generatedItems.push({
            type: 'tool_result',
            content: record,
            timestamp: new Date(),
        });
        this.logger.info('Tool result added', {
            tool: record.tool,
            status: record.result.status,
        });
    }
    /**
     * Add a reasoning step
     */
    addReasoning(reasoning) {
        this.reasoningSteps.push(reasoning);
        this.generatedItems.push({
            type: 'reasoning',
            content: reasoning,
            timestamp: new Date(),
        });
        this.logger.reasoning(reasoning);
    }
    /**
     * Check if the loop can continue
     */
    canContinue() {
        return this.currentTurn < this.maxTurns;
    }
    /**
     * Get conversation context as formatted string
     */
    getConversationContext() {
        if (this.messages.length === 0) {
            return '';
        }
        return this.messages
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join('\n');
    }
    /**
     * Get tool results summary
     */
    getToolResultsSummary() {
        if (this.toolCallHistory.length === 0) {
            return 'No tools used yet.';
        }
        return this.toolCallHistory
            .map((record) => {
            const status = record.result.status === 'success' ? '✓' : '✗';
            const preview = record.result.content.substring(0, 100);
            return `${status} ${record.tool}: ${preview}${record.result.content.length > 100 ? '...' : ''}`;
        })
            .join('\n');
    }
    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Get state summary for debugging
     */
    getSummary() {
        return `RunState {
  sessionId: ${this.sessionId}
  currentTurn: ${this.currentTurn}/${this.maxTurns}
  messages: ${this.messages.length}
  toolCalls: ${this.toolCallHistory.length}
  reasoningSteps: ${this.reasoningSteps.length}
}`;
    }
}
//# sourceMappingURL=RunState.js.map