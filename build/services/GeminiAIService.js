/**
 * GeminiAIService - Handles communication with Google AI (Gemini models)
 * Uses @google/genai unified SDK supporting both Vertex AI and Google AI Studio
 */
import { GoogleGenAI } from "@google/genai";
import { isSupportedMimeType } from '../types/index.js';
export class GeminiAIService {
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
     * Query Vertex AI with a prompt and optional multimodal content
     */
    async query(prompt, options = {}, multimodalParts) {
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
            // Build content parts
            const contents = this.buildContents(prompt, multimodalParts);
            const response = await this.client.models.generateContent({
                model: this.config.model,
                contents,
                config,
            });
            return this.extractResponseText(response);
        }
        catch (error) {
            // Log error details for debugging
            console.error('Gemini API query error:', error);
            // Return error message instead of throwing
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini API error: ${errorMsg}`);
        }
    }
    /**
     * Build contents array from prompt and multimodal parts
     */
    buildContents(prompt, multimodalParts) {
        // If no multimodal parts, use simple string format
        if (!multimodalParts || multimodalParts.length === 0) {
            return prompt;
        }
        // Build structured content with parts
        const parts = [];
        // Add text prompt as first part
        if (prompt) {
            parts.push({ text: prompt });
        }
        // Add multimodal parts
        for (const part of multimodalParts) {
            const contentPart = {};
            if (part.text) {
                contentPart.text = part.text;
            }
            if (part.inlineData) {
                // Validate MIME type
                if (!isSupportedMimeType(part.inlineData.mimeType)) {
                    console.warn(`Unsupported MIME type: ${part.inlineData.mimeType}. Including anyway.`);
                }
                contentPart.inlineData = {
                    mimeType: part.inlineData.mimeType,
                    data: part.inlineData.data,
                };
            }
            if (part.fileData) {
                // Validate MIME type
                if (!isSupportedMimeType(part.fileData.mimeType)) {
                    console.warn(`Unsupported MIME type: ${part.fileData.mimeType}. Including anyway.`);
                }
                contentPart.fileData = {
                    mimeType: part.fileData.mimeType,
                    fileUri: part.fileData.fileUri,
                };
            }
            // Only add part if it has content
            if (Object.keys(contentPart).length > 0) {
                parts.push(contentPart);
            }
        }
        // Return structured content
        return [
            {
                role: "user",
                parts,
            },
        ];
    }
    /**
     * Extract text from Gemini API response
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
//# sourceMappingURL=GeminiAIService.js.map