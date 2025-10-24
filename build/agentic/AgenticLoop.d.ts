/**
 * AgenticLoop - Main orchestrator for turn-based agentic execution
 * Integrates all components: RunState, Tools, ResponseProcessor, GeminiAI
 */
import { RunOptions } from './RunState.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { Message } from '../types/index.js';
export interface RunResult {
    sessionId: string;
    finalOutput: string;
    messages: Message[];
    toolCallsCount: number;
    reasoningStepsCount: number;
    turnsUsed: number;
}
export declare class AgenticLoop {
    private geminiAI;
    private toolRegistry;
    private responseProcessor;
    constructor(geminiAI: GeminiAIService, toolRegistry: ToolRegistry);
    /**
     * Run the agentic loop
     */
    run(prompt: string, conversationHistory: Message[], options?: RunOptions): Promise<RunResult>;
    /**
     * Build prompt with tool definitions and conversation history
     */
    private buildPromptWithTools;
    /**
     * Determine if thinking mode should be used
     */
    private shouldUseThinking;
    /**
     * Build fallback prompt when all tools fail
     */
    private buildFallbackPrompt;
    /**
     * Build best-effort response when max turns exceeded or errors occur
     */
    private buildBestEffortResponse;
    /**
     * Build result object
     */
    private buildResult;
    /**
     * Build best-effort result when validation fails
     */
    private buildBestEffortResult;
}
//# sourceMappingURL=AgenticLoop.d.ts.map