/**
 * PromptAnalyzer - Analyzes prompts to determine required strategy
 * Detects whether reasoning or delegation is needed
 */

import { PromptAnalysisResult } from '../types/index.js';

export class PromptAnalyzer {
  /**
   * Analyze a prompt to determine what strategy to use
   */
  analyze(prompt: string): PromptAnalysisResult {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check if it's a complex reasoning task
    const reasoningKeywords = [
      'analyze', 'compare', 'evaluate', 'trade-off', 'pros and cons',
      'step by step', 'explain why', 'reasoning', 'think through'
    ];
    const needsReasoning = reasoningKeywords.some(keyword => lowerPrompt.includes(keyword));

    // Check if it mentions external services (delegation targets)
    const delegationKeywords: Record<string, string> = {
      'web search': 'web-search',
      'search the web': 'web-search',
      'find online': 'web-search',
      'latest information': 'web-search',
    };
    
    let needsDelegation = false;
    let targetServer: string | undefined;
    
    for (const [keyword, server] of Object.entries(delegationKeywords)) {
      if (lowerPrompt.includes(keyword)) {
        needsDelegation = true;
        targetServer = server;
        break;
      }
    }

    return { needsReasoning, needsDelegation, targetServer };
  }

  /**
   * Add custom reasoning keywords
   */
  addReasoningKeywords(keywords: string[]): void {
    // Extension point for custom keywords
  }

  /**
   * Add custom delegation patterns
   */
  addDelegationPattern(keyword: string, serverName: string): void {
    // Extension point for custom delegation patterns
  }
}
