/**
 * PromptAnalyzer - Analyzes prompts to determine required strategy
 * Detects whether reasoning or delegation is needed
 */
import { PromptAnalysisResult } from '../types/index.js';
export declare class PromptAnalyzer {
    /**
     * Analyze a prompt to determine what strategy to use
     */
    analyze(prompt: string): PromptAnalysisResult;
    /**
     * Add custom reasoning keywords
     */
    addReasoningKeywords(keywords: string[]): void;
    /**
     * Add custom delegation patterns
     */
    addDelegationPattern(keyword: string, serverName: string): void;
}
//# sourceMappingURL=PromptAnalyzer.d.ts.map