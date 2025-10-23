/**
 * QueryHandler - Handles the query tool
 * Main intelligent agent entrypoint with automatic reasoning and delegation
 */
export class QueryHandler {
    config;
    conversationManager;
    vertexAI;
    promptAnalyzer;
    reasoningAgent;
    delegationAgent;
    constructor(config, conversationManager, vertexAI, promptAnalyzer, reasoningAgent, delegationAgent) {
        this.config = config;
        this.conversationManager = conversationManager;
        this.vertexAI = vertexAI;
        this.promptAnalyzer = promptAnalyzer;
        this.reasoningAgent = reasoningAgent;
        this.delegationAgent = delegationAgent;
    }
    /**
     * Handle a query tool request
     */
    async handle(input) {
        try {
            // Handle conversation context
            let conversationContext = "";
            let sessionId = input.sessionId;
            if (this.config.enableConversations && sessionId) {
                const history = this.conversationManager.getHistory(sessionId);
                if (history.length > 0) {
                    conversationContext = history
                        .map((msg) => `${msg.role}: ${msg.content}`)
                        .join("\n") + "\n";
                }
                this.conversationManager.addMessage(sessionId, {
                    role: 'user',
                    content: input.prompt,
                    timestamp: new Date(),
                });
            }
            else if (this.config.enableConversations && !sessionId) {
                sessionId = this.conversationManager.createSession();
                this.conversationManager.addMessage(sessionId, {
                    role: 'user',
                    content: input.prompt,
                    timestamp: new Date(),
                });
            }
            // Agent Decision: Determine if prompt needs special handling
            const promptAnalysis = this.promptAnalyzer.analyze(input.prompt);
            let responseText;
            let thinkingProcess = "";
            // Internal Agent Logic: Apply reasoning if needed
            if (this.config.enableReasoning && promptAnalysis.needsReasoning) {
                thinkingProcess += `[Internal: Detected complex problem, applying chain-of-thought reasoning]\n\n`;
                responseText = await this.reasoningAgent.reason(input.prompt, conversationContext);
            }
            // Internal Agent Logic: Check if delegation is needed
            else if (promptAnalysis.needsDelegation && this.delegationAgent.isDelegationAvailable()) {
                thinkingProcess += `[Internal: Delegating to ${promptAnalysis.targetServer}]\n\n`;
                responseText = await this.delegationAgent.delegate(input.prompt, promptAnalysis.targetServer, conversationContext);
            }
            // Standard query
            else {
                const fullPrompt = conversationContext
                    ? `${conversationContext}user: ${input.prompt}\nassistant:`
                    : input.prompt;
                responseText = await this.vertexAI.query(fullPrompt);
            }
            // Add assistant response to conversation history
            if (this.config.enableConversations && sessionId) {
                this.conversationManager.addMessage(sessionId, {
                    role: 'assistant',
                    content: responseText,
                    timestamp: new Date(),
                });
            }
            // Include session ID in response if conversations are enabled
            const resultText = sessionId
                ? `[Session: ${sessionId}]\n${thinkingProcess}${responseText}`
                : `${thinkingProcess}${responseText}`;
            return {
                content: [
                    {
                        type: "text",
                        text: resultText,
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error querying Vertex AI: ${errorMessage}`,
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=QueryHandler.js.map