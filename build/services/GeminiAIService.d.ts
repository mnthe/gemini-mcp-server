/**
 * GeminiAIService - Handles communication with Google AI (Gemini models)
 * Uses @google/genai unified SDK supporting both Vertex AI and Google AI Studio
 */
import { GeminiAIConfig } from '../types/index.js';
export interface QueryOptions {
    enableThinking?: boolean;
}
export declare class GeminiAIService {
    private client;
    private config;
    constructor(config: GeminiAIConfig);
    /**
     * Query Vertex AI with a prompt
     */
    query(prompt: string, options?: QueryOptions): Promise<string>;
    /**
     * Extract text from Gemini API response
     */
    private extractResponseText;
    /**
     * Get the current configuration
     */
    getConfig(): GeminiAIConfig;
}
//# sourceMappingURL=GeminiAIService.d.ts.map