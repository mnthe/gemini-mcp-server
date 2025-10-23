/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions with thinking mode support
 */
import { VertexAI } from "@google-cloud/vertexai";
export class VertexAIService {
    vertexAI;
    config;
    constructor(config) {
        this.config = config;
        this.vertexAI = new VertexAI({
            project: config.projectId,
            location: config.location,
        });
    }
    /**
     * Query Vertex AI with a prompt
     */
    async query(prompt, options = {}) {
        const generationConfig = {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
            topP: this.config.topP,
            topK: this.config.topK,
        };
        // Enable thinking mode if requested
        if (options.enableThinking) {
            // Gemini thinking mode configuration
            // Note: This is a placeholder - adjust based on actual Gemini API
            generationConfig.thinkingConfig = {
                mode: 'THINKING',
            };
        }
        const model = this.vertexAI.getGenerativeModel({
            model: this.config.model,
            generationConfig,
        });
        const request = {
            contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
        };
        const result = await model.generateContent(request);
        return this.extractResponseText(result);
    }
    /**
     * Extract text from Vertex AI response
     */
    extractResponseText(result) {
        let responseText = "No response received";
        try {
            if (result?.response?.candidates && result.response.candidates.length > 0) {
                const candidate = result.response.candidates[0];
                if (candidate?.content?.parts && candidate.content.parts.length > 0) {
                    const part = candidate.content.parts[0];
                    if (part.text) {
                        responseText = part.text;
                    }
                }
            }
        }
        catch (error) {
            console.error("Error extracting response text:", error);
            responseText = JSON.stringify(result);
        }
        return responseText;
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=VertexAIService.js.map