/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions
 */
import { VertexAIConfig } from '../types/index.js';
export declare class VertexAIService {
    private client;
    private config;
    constructor(config: VertexAIConfig);
    /**
     * Query Vertex AI with a prompt
     */
    query(prompt: string): Promise<string>;
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