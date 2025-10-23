/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Uses @google/genai unified SDK with Vertex AI mode
 */
import { VertexAIConfig } from '../types/index.js';
export interface QueryOptions {
    enableThinking?: boolean;
}
export declare class VertexAIService {
    private client;
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