/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Uses @google/genai unified SDK with Vertex AI mode
 */
import { GoogleGenAI } from "@google/genai";
export class VertexAIService {
    client;
    config;
    constructor(config) {
        this.config = config;
        this.client = new GoogleGenAI({
            vertexai: true,
            project: config.projectId,
            location: config.location,
        });
    }
    /**
     * Query Vertex AI with a prompt
     */
    async query(prompt, options = {}) {
        try {
            const config = {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens,
                topP: this.config.topP,
                topK: this.config.topK,
            };
            // Enable thinking mode if requested
            if (options.enableThinking) {
                config.thinkingConfig = {
                    thinkingBudget: -1, // Auto budget
                    includeThoughts: true, // Include thought summaries in response
                };
            }
            const response = await this.client.models.generateContent({
                model: this.config.model,
                contents: prompt,
                config,
            });
            return this.extractResponseText(response);
        }
        catch (error) {
            // Log error details for debugging
            console.error('Vertex AI query error:', error);
            // Return error message instead of throwing
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`Vertex AI API error: ${errorMsg}`);
        }
    }
    /**
     * Extract text from Vertex AI response
     */
    extractResponseText(response) {
        try {
            // @google/genai has simpler response structure
            if (response?.text) {
                return response.text;
            }
            // Fallback: check candidates structure
            if (response?.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate?.content?.parts && candidate.content.parts.length > 0) {
                    const part = candidate.content.parts[0];
                    if (part.text) {
                        return part.text;
                    }
                }
            }
            // No valid response found
            console.error("No valid response from Gemini:", JSON.stringify(response, null, 2));
            return "Error: No valid response from Gemini API";
        }
        catch (error) {
            console.error("Error extracting response text:", error);
            // Safe error message
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return `Error extracting response: ${errorMsg}`;
        }
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=VertexAIService.js.map