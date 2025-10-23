/**
 * ResponseProcessor - Parse Gemini responses into structured items
 * Extracts reasoning, tool calls, and final output following MCP format
 */
import { ReasoningItem } from './RunState.js';
export interface ToolCall {
    tool: string;
    args: any;
    callId?: string;
}
export interface ProcessedResponse {
    reasoningItems: ReasoningItem[];
    toolCalls: ToolCall[];
    finalOutput: string | null;
    messageItems: string[];
}
export declare class ResponseProcessor {
    /**
     * Process a Gemini response and extract structured items
     */
    process(response: string): ProcessedResponse;
    /**
     * Extract reasoning/thinking from response
     * Looks for [Thinking: ...] markers
     */
    private extractReasoning;
    /**
     * Extract tool calls from response (MCP format)
     * Format:
     *   TOOL_CALL: <tool_name>
     *   ARGUMENTS: <json>
     */
    private extractToolCalls;
    /**
     * Extract final output (response without tool calls)
     */
    private extractFinalOutput;
    /**
     * Generate unique call ID for tool calls
     */
    private generateCallId;
    /**
     * Validate that a response is parseable
     */
    validate(response: string): void;
    /**
     * Check if response indicates final output
     */
    isFinalOutput(processed: ProcessedResponse): boolean;
}
//# sourceMappingURL=ResponseProcessor.d.ts.map