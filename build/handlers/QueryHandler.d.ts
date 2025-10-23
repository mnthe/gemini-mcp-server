/**
 * QueryHandler - Handles the query tool
 * Main intelligent agent entrypoint with automatic reasoning and delegation
 */
import { QueryInput } from '../schemas/index.js';
import { VertexAIConfig } from '../types/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { VertexAIService } from '../services/VertexAIService.js';
import { PromptAnalyzer } from '../agents/PromptAnalyzer.js';
import { ReasoningAgent } from '../agents/ReasoningAgent.js';
import { DelegationAgent } from '../agents/DelegationAgent.js';
export declare class QueryHandler {
    private config;
    private conversationManager;
    private vertexAI;
    private promptAnalyzer;
    private reasoningAgent;
    private delegationAgent;
    constructor(config: VertexAIConfig, conversationManager: ConversationManager, vertexAI: VertexAIService, promptAnalyzer: PromptAnalyzer, reasoningAgent: ReasoningAgent, delegationAgent: DelegationAgent);
    /**
     * Handle a query tool request
     */
    handle(input: QueryInput): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
}
//# sourceMappingURL=QueryHandler.d.ts.map