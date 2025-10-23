/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions with thinking mode support
 */

import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import { VertexAIConfig } from '../types/index.js';

export interface QueryOptions {
  enableThinking?: boolean;
}

export class VertexAIService {
  private vertexAI: VertexAI;
  private config: VertexAIConfig;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });
  }

  /**
   * Query Vertex AI with a prompt
   */
  async query(prompt: string, options: QueryOptions = {}): Promise<string> {
    try {
      const generationConfig: any = {
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
    } catch (error) {
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
  private extractResponseText(result: any): string {
    try {
      if (result?.response?.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        if (candidate?.content?.parts && candidate.content.parts.length > 0) {
          const part = candidate.content.parts[0];
          if (part.text) {
            return part.text;
          }
        }
      }

      // No valid response found
      console.error("No valid response from Gemini:", JSON.stringify(result, null, 2));
      return "Error: No valid response from Gemini API";
    } catch (error) {
      console.error("Error extracting response text:", error);

      // Safe error message (no JSON.stringify which could return HTML)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return `Error extracting response: ${errorMsg}`;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): VertexAIConfig {
    return { ...this.config };
  }
}
