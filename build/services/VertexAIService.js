/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions
 */
import { VertexAI } from "@google-cloud/vertexai";
export class VertexAIService {
    vertexAI;
    model;
    config;
    constructor(config) {
        this.config = config;
        this.vertexAI = new VertexAI({
            project: config.projectId,
            location: config.location,
        });
        this.model = this.vertexAI.getGenerativeModel({
            model: config.model,
            generationConfig: {
                temperature: config.temperature,
                maxOutputTokens: config.maxTokens,
                topP: config.topP,
                topK: config.topK,
            },
        });
    }
    /**
     * Query Vertex AI with a prompt
     */
    async query(prompt) {
        const request = {
            contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
        };
        const result = await this.model.generateContent(request);
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