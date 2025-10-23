/**
 * VertexAIService - Handles communication with Google Cloud Vertex AI
 * Provides a clean interface for making predictions
 */

import { PredictionServiceClient } from "@google-cloud/aiplatform";
import { VertexAIConfig } from '../types/index.js';

export class VertexAIService {
  private client: PredictionServiceClient;
  private config: VertexAIConfig;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.client = new PredictionServiceClient();
  }

  /**
   * Query Vertex AI with a prompt
   */
  async query(prompt: string): Promise<string> {
    const endpoint = `projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}`;

    const instance = {
      content: prompt,
    };

    const parameters = {
      temperature: this.config.temperature,
      maxOutputTokens: this.config.maxTokens,
      topP: this.config.topP,
      topK: this.config.topK,
    };

    const request = {
      endpoint,
      instances: [instance],
      parameters,
    };

    const [response] = await this.client.predict(request as any);

    return this.extractResponseText(response);
  }

  /**
   * Extract text from Vertex AI response
   */
  private extractResponseText(response: any): string {
    let responseText = "No response received";

    if (response.predictions && response.predictions.length > 0) {
      const prediction = response.predictions[0];
      
      if (typeof prediction === 'object' && prediction !== null) {
        const pred = prediction as Record<string, unknown>;
        
        if (pred.content && typeof pred.content === "string") {
          responseText = pred.content;
        } else if (pred.candidates && Array.isArray(pred.candidates)) {
          const firstCandidate = pred.candidates[0] as Record<string, unknown>;
          if (firstCandidate?.content) {
            responseText = JSON.stringify(firstCandidate.content);
          }
        } else {
          responseText = JSON.stringify(prediction);
        }
      }
    }

    return responseText;
  }

  /**
   * Get the current configuration
   */
  getConfig(): VertexAIConfig {
    return { ...this.config };
  }
}
