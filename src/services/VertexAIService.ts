/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions using the Generative AI SDK
 */

import { VertexAI } from "@google-cloud/vertexai";
import { VertexAIConfig } from '../types/index.js';

export class VertexAIService {
  private vertexAI: VertexAI;
  private config: VertexAIConfig;

  constructor(config: VertexAIConfig) {
    this.config = config;
    // Initialize Vertex AI client with project and location
    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });
  }

  /**
   * Query Vertex AI with a prompt using the Generative AI API
   */
  async query(prompt: string): Promise<string> {
    // Get the generative model
    const model = this.vertexAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      },
    });

    // Generate content
    const result = await model.generateContent(prompt);
    
    return this.extractResponseText(result);
  }

  /**
   * Extract text from Vertex AI Generative AI response
   */
  private extractResponseText(result: any): string {
    try {
      // Get the response from the result
      const response = result.response;
      
      if (!response) {
        return "No response received";
      }

      // Extract text from candidates
      if (response.candidates && response.candidates.length > 0) {
        const firstCandidate = response.candidates[0];
        
        if (firstCandidate.content && firstCandidate.content.parts) {
          // Concatenate all text parts
          const textParts = firstCandidate.content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
          
          if (textParts) {
            return textParts;
          }
        }
      }

      // Fallback: try to get text directly from response
      const text = response.text?.();
      if (text) {
        return text;
      }

      return "No response text found";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract response text: ${errorMessage}`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): VertexAIConfig {
    return { ...this.config };
  }
}
