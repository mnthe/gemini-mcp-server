/**
 * GeminiAIService - Handles communication with Google AI (Gemini models)
 * Uses @google/genai unified SDK supporting both Vertex AI and Google AI Studio
 */

import { GenerateContentConfig, GoogleGenAI } from "@google/genai";
import { GeminiAIConfig } from '../types/index.js';

export interface QueryOptions {
  enableThinking?: boolean;
}

export class GeminiAIService {
  private client: GoogleGenAI;
  private config: GeminiAIConfig;

  constructor(config: GeminiAIConfig) {
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
  async query(prompt: string, options: QueryOptions = {}): Promise<string> {
    try {
       const config: GenerateContentConfig = {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      };

      // Enable thinking mode if requested
      if (options.enableThinking) {
        config.thinkingConfig = {
          thinkingBudget: -1,  // Auto budget
          includeThoughts: true,  // Include thought summaries in response
        };
      }

      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config,
      });

      return this.extractResponseText(response);
    } catch (error) {
      // Log error details for debugging
      console.error('Gemini API query error:', error);

      // Return error message instead of throwing
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini API error: ${errorMsg}`);
    }
  }

  /**
   * Extract text from Gemini API response
   */
  private extractResponseText(response: any): string {
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
    } catch (error) {
      console.error("Error extracting response text:", error);

      // Safe error message
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return `Error extracting response: ${errorMsg}`;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): GeminiAIConfig {
    return { ...this.config };
  }
}
