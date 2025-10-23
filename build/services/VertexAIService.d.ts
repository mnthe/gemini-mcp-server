/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions using the Generative AI SDK
 */
import { VertexAIConfig } from '../types/index.js';
export declare class VertexAIService {
    private vertexAI;
    private model;
    private config;
    constructor(config: VertexAIConfig);
    /**
     * Query Vertex AI with a prompt using the Generative AI API
     */
    query(prompt: string): Promise<string>;
    /**
     * Extract text from Vertex AI Generative AI response
     */
    private extractResponseText;
    /**
     * Get the current configuration
     */
    getConfig(): VertexAIConfig;
}
//# sourceMappingURL=VertexAIService.d.ts.map