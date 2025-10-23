/**
 * PromptAnalyzer - Analyzes prompts to determine required strategy
 * Detects whether reasoning or delegation is needed
 */
export class PromptAnalyzer {
    /**
     * Analyze a prompt to determine what strategy to use
     */
    analyze(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        // Check if it's a complex reasoning task
        const reasoningKeywords = [
            'analyze', 'compare', 'evaluate', 'trade-off', 'pros and cons',
            'step by step', 'explain why', 'reasoning', 'think through'
        ];
        const needsReasoning = reasoningKeywords.some(keyword => lowerPrompt.includes(keyword));
        // Check if it mentions external services (delegation targets)
        const delegationKeywords = {
            'web search': 'web-search',
            'search the web': 'web-search',
            'find online': 'web-search',
            'latest information': 'web-search',
        };
        let needsDelegation = false;
        let targetServer;
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
    addReasoningKeywords(keywords) {
        // Extension point for custom keywords
    }
    /**
     * Add custom delegation patterns
     */
    addDelegationPattern(keyword, serverName) {
        // Extension point for custom delegation patterns
    }
}
//# sourceMappingURL=PromptAnalyzer.js.map