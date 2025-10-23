/**
 * RunState - Manages state for agentic loop execution
 * In-memory only (no serialization needed for chat MCP server)
 */
import { Logger } from '../utils/Logger.js';
import { Message } from '../types/index.js';
export interface RunItem {
    type: 'message' | 'tool_call' | 'tool_result' | 'reasoning';
    content: any;
    timestamp: Date;
}
export interface ToolCallRecord {
    tool: string;
    args: any;
    result: {
        status: 'success' | 'error';
        content: string;
    };
    timestamp: Date;
}
export interface ReasoningItem {
    step: number;
    thought: string;
    result: string;
}
export interface RunOptions {
    sessionId?: string;
    maxTurns?: number;
    context?: Record<string, any>;
    logDir?: string;
}
export declare class RunState {
    currentTurn: number;
    readonly maxTurns: number;
    messages: Message[];
    generatedItems: RunItem[];
    readonly sessionId: string;
    context: Record<string, any>;
    toolCallHistory: ToolCallRecord[];
    reasoningSteps: ReasoningItem[];
    readonly logger: Logger;
    constructor(options?: RunOptions);
    /**
     * Add a message to the conversation history
     */
    addMessage(message: Message): void;
    /**
     * Add a tool result to the state
     */
    addToolResult(record: ToolCallRecord): void;
    /**
     * Add a reasoning step
     */
    addReasoning(reasoning: ReasoningItem): void;
    /**
     * Check if the loop can continue
     */
    canContinue(): boolean;
    /**
     * Get conversation context as formatted string
     */
    getConversationContext(): string;
    /**
     * Get tool results summary
     */
    getToolResultsSummary(): string;
    /**
     * Generate a unique session ID
     */
    private generateSessionId;
    /**
     * Get state summary for debugging
     */
    getSummary(): string;
}
//# sourceMappingURL=RunState.d.ts.map