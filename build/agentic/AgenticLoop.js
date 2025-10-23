/**
 * AgenticLoop - Main orchestrator for turn-based agentic execution
 * Integrates all components: RunState, Tools, ResponseProcessor, VertexAI
 */
import { RunState } from './RunState.js';
import { ResponseProcessor } from './ResponseProcessor.js';
export class AgenticLoop {
    vertexAI;
    toolRegistry;
    responseProcessor;
    constructor(vertexAI, toolRegistry) {
        this.vertexAI = vertexAI;
        this.toolRegistry = toolRegistry;
        this.responseProcessor = new ResponseProcessor();
    }
    /**
     * Run the agentic loop
     */
    async run(prompt, conversationHistory, options = {}) {
        const state = new RunState(options);
        // Add conversation history
        for (const msg of conversationHistory) {
            state.addMessage(msg);
        }
        // Add current prompt
        state.addMessage({
            role: 'user',
            content: prompt,
            timestamp: new Date(),
        });
        state.logger.info(`Starting agentic loop for session ${state.sessionId}`);
        // Main loop
        while (state.canContinue()) {
            state.currentTurn++;
            state.logger.info(`Turn ${state.currentTurn}/${state.maxTurns}`);
            // 1. Build prompt with tool definitions
            const fullPrompt = this.buildPromptWithTools(state);
            // 2. Detect if we should use thinking mode
            const useThinking = this.shouldUseThinking(state);
            // 3. Call Vertex AI
            const response = await this.vertexAI.query(fullPrompt, {
                enableThinking: useThinking,
            });
            state.logger.info('Received response from Vertex AI');
            // 4. Validate and process response
            try {
                this.responseProcessor.validate(response);
            }
            catch (error) {
                state.logger.error('Invalid response from model', error);
                // Return best effort response
                return this.buildBestEffortResult(state, response);
            }
            const processed = this.responseProcessor.process(response);
            // 5. Handle reasoning
            if (processed.reasoningItems.length > 0) {
                state.logger.info(`Detected ${processed.reasoningItems.length} reasoning items`);
                for (const reasoning of processed.reasoningItems) {
                    state.addReasoning(reasoning);
                }
            }
            // 6. Handle tool calls
            if (processed.toolCalls.length > 0) {
                state.logger.info(`Detected ${processed.toolCalls.length} tool calls`);
                const results = await this.toolRegistry.executeTools(processed.toolCalls, {
                    sessionId: state.sessionId,
                    context: state.context,
                }, 2 // maxRetries
                );
                // Check if all tools failed
                const allFailed = results.every((r) => r.status === 'error');
                if (allFailed) {
                    state.logger.error('All tools failed, falling back to Gemini knowledge');
                    // Build fallback prompt
                    const fallbackPrompt = this.buildFallbackPrompt(state, processed.toolCalls, results);
                    const fallbackResponse = await this.vertexAI.query(fallbackPrompt);
                    // Add fallback response as final output
                    state.addMessage({
                        role: 'assistant',
                        content: fallbackResponse,
                        timestamp: new Date(),
                    });
                    return this.buildResult(state, fallbackResponse);
                }
                // Add tool results to state
                for (let i = 0; i < results.length; i++) {
                    state.addToolResult({
                        tool: processed.toolCalls[i].tool,
                        args: processed.toolCalls[i].args,
                        result: results[i],
                        timestamp: new Date(),
                    });
                }
                // Add tool results to messages for next turn
                const toolResultsText = results
                    .map((r, i) => {
                    const call = processed.toolCalls[i];
                    return `TOOL_RESULT: ${call.tool}\nSTATUS: ${r.status}\nCONTENT: ${r.content}\n---`;
                })
                    .join('\n');
                state.addMessage({
                    role: 'assistant',
                    content: toolResultsText,
                    timestamp: new Date(),
                });
                // Continue loop for next turn
                continue;
            }
            // 7. Final output (no tool calls)
            if (processed.finalOutput) {
                state.logger.info('Final output generated');
                state.addMessage({
                    role: 'assistant',
                    content: processed.finalOutput,
                    timestamp: new Date(),
                });
                return this.buildResult(state, processed.finalOutput);
            }
            // 8. Check max turns - return best effort
            if (state.currentTurn >= state.maxTurns) {
                state.logger.error(`Max turns (${state.maxTurns}) exceeded`);
                const bestEffort = this.buildBestEffortResponse(state);
                return this.buildResult(state, bestEffort);
            }
        }
        // Should not reach here, but handle gracefully
        const fallback = this.buildBestEffortResponse(state);
        return this.buildResult(state, fallback);
    }
    /**
     * Build prompt with tool definitions and conversation history
     */
    buildPromptWithTools(state) {
        const toolDefs = this.toolRegistry.getToolDefinitionsText();
        const history = state.getConversationContext();
        return `${toolDefs}

CONVERSATION HISTORY:
${history}

Respond with either:
1. TOOL_CALL: <name> + ARGUMENTS: <json> if you need more information
2. Your final answer if you have enough information`;
    }
    /**
     * Determine if thinking mode should be used
     */
    shouldUseThinking(state) {
        // Use thinking mode if:
        // - User prompt contains reasoning keywords
        // - Complex problem detected
        const lastUserMessage = state.messages
            .filter((m) => m.role === 'user')
            .pop();
        if (!lastUserMessage) {
            return false;
        }
        const reasoningKeywords = [
            'analyze',
            'compare',
            'evaluate',
            'explain why',
            'step by step',
            'think through',
            'reasoning',
        ];
        const content = lastUserMessage.content.toLowerCase();
        return reasoningKeywords.some((keyword) => content.includes(keyword));
    }
    /**
     * Build fallback prompt when all tools fail
     */
    buildFallbackPrompt(state, toolCalls, results) {
        const failureDetails = toolCalls
            .map((call, i) => {
            return `- ${call.tool}: ${results[i].content}`;
        })
            .join('\n');
        return `The following tools failed to execute:
${failureDetails}

Original request: ${state.messages[state.messages.length - 1].content}

Please provide the best answer you can using your internal knowledge, without relying on external tools.`;
    }
    /**
     * Build best-effort response when max turns exceeded or errors occur
     */
    buildBestEffortResponse(state) {
        const toolSummary = state.getToolResultsSummary();
        return `I attempted to answer your question but encountered limitations (max turns: ${state.maxTurns}).

Tools used:
${toolSummary}

Based on the available information and my knowledge, here's my best answer:

[Note: This response may be incomplete due to execution limits. Please try rephrasing your question or breaking it into smaller parts.]`;
    }
    /**
     * Build result object
     */
    buildResult(state, finalOutput) {
        state.logger.info('Building final result');
        return {
            sessionId: state.sessionId,
            finalOutput,
            messages: state.messages,
            toolCallsCount: state.toolCallHistory.length,
            reasoningStepsCount: state.reasoningSteps.length,
            turnsUsed: state.currentTurn,
        };
    }
    /**
     * Build best-effort result when validation fails
     */
    buildBestEffortResult(state, invalidResponse) {
        state.logger.error('Building best-effort result due to invalid response');
        const output = `I received an invalid response from the model. Here's the raw output:

${invalidResponse.substring(0, 500)}...

Please try again or rephrase your question.`;
        return this.buildResult(state, output);
    }
}
//# sourceMappingURL=AgenticLoop.js.map