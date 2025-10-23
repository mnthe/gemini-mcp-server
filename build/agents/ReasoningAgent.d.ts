/**
 * ReasoningAgent - Handles chain-of-thought reasoning
 * Breaks down complex problems into steps and synthesizes answers
 */
import { VertexAIService } from '../services/VertexAIService.js';
export declare class ReasoningAgent {
    private vertexAI;
    private maxSteps;
    constructor(vertexAI: VertexAIService, maxSteps?: number);
    /**
     * Apply chain-of-thought reasoning to a prompt
     */
    reason(prompt: string, context?: string): Promise<string>;
    /**
     * Format the reasoning output
     */
    private formatReasoningOutput;
}
//# sourceMappingURL=ReasoningAgent.d.ts.map