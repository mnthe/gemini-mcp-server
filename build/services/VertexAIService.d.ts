/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions with thinking mode support
 */
import { VertexAIConfig } from '../types/index.js';
export interface QueryOptions {
    enableThinking?: boolean;
}
export declare class VertexAIService {
    private vertexAI;
    private config;
    constructor(config: VertexAIConfig);
    /**
     * Query Vertex AI with a prompt
     */
    query(prompt: string, options?: QueryOptions): Promise<string>;
    /**
     * Extract text from Vertex AI response
     */
    private extractResponseText;
    /**
     * Get the current configuration
     */
    getConfig(): VertexAIConfig;
}
//# sourceMappingURL=VertexAIService.d.ts.map