/**
 * ResponseProcessor - Parse Gemini responses into structured items
 * Extracts reasoning, tool calls, and final output following MCP format
 */
import { ModelBehaviorError } from '../errors/index.js';
export class ResponseProcessor {
    /**
     * Process a Gemini response and extract structured items
     */
    process(response) {
        const result = {
            reasoningItems: [],
            toolCalls: [],
            finalOutput: null,
            messageItems: [],
        };
        // Extract reasoning (thinking markers)
        result.reasoningItems = this.extractReasoning(response);
        // Extract tool calls (MCP format)
        result.toolCalls = this.extractToolCalls(response);
        // Determine if this is final output
        if (result.toolCalls.length === 0) {
            // No tool calls = final output
            result.finalOutput = this.extractFinalOutput(response);
        }
        return result;
    }
    /**
     * Extract reasoning/thinking from response
     * Looks for [Thinking: ...] markers
     */
    extractReasoning(response) {
        const reasoningItems = [];
        const thinkingRegex = /\[Thinking:([^\]]+)\]/g;
        let match;
        let stepCount = 0;
        while ((match = thinkingRegex.exec(response)) !== null) {
            const thought = match[1].trim();
            reasoningItems.push({
                step: stepCount++,
                thought: 'Internal reasoning',
                result: thought,
            });
        }
        return reasoningItems;
    }
    /**
     * Extract tool calls from response (MCP format)
     * Format:
     *   TOOL_CALL: <tool_name>
     *   ARGUMENTS: <json>
     */
    extractToolCalls(response) {
        const toolCalls = [];
        // Match TOOL_CALL: <name> followed by ARGUMENTS: <json>
        const toolCallRegex = /TOOL_CALL:\s*([^\n]+)\s*\n\s*ARGUMENTS:\s*({[^}]+}|\[[^\]]+\])/gi;
        let match;
        while ((match = toolCallRegex.exec(response)) !== null) {
            const toolName = match[1].trim();
            const argsString = match[2].trim();
            try {
                const args = JSON.parse(argsString);
                toolCalls.push({
                    tool: toolName,
                    args,
                    callId: this.generateCallId(),
                });
            }
            catch (error) {
                // Invalid JSON in arguments - log but continue
                console.error(`Failed to parse tool arguments for ${toolName}:`, argsString);
            }
        }
        return toolCalls;
    }
    /**
     * Extract final output (response without tool calls)
     */
    extractFinalOutput(response) {
        // Remove thinking markers
        let output = response.replace(/\[Thinking:[^\]]+\]/g, '');
        // Remove any TOOL_CALL/ARGUMENTS blocks (shouldn't exist if no tool calls detected)
        output = output.replace(/TOOL_CALL:\s*[^\n]+\s*\n\s*ARGUMENTS:\s*({[^}]+}|\[[^\]]+\])/gi, '');
        return output.trim();
    }
    /**
     * Generate unique call ID for tool calls
     */
    generateCallId() {
        return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Validate that a response is parseable
     */
    validate(response) {
        if (!response || response.trim().length === 0) {
            throw new ModelBehaviorError(response, 'Empty response from model');
        }
        // Check for malformed tool calls (TOOL_CALL without ARGUMENTS)
        const hasToolCall = /TOOL_CALL:/i.test(response);
        const hasArguments = /ARGUMENTS:/i.test(response);
        if (hasToolCall && !hasArguments) {
            throw new ModelBehaviorError(response, 'Malformed tool call: TOOL_CALL found without ARGUMENTS');
        }
        if (!hasToolCall && hasArguments) {
            throw new ModelBehaviorError(response, 'Malformed tool call: ARGUMENTS found without TOOL_CALL');
        }
    }
    /**
     * Check if response indicates final output
     */
    isFinalOutput(processed) {
        return processed.toolCalls.length === 0 && processed.finalOutput !== null;
    }
}
//# sourceMappingURL=ResponseProcessor.js.map