/**
 * GeminiAIService - Handles communication with Google AI (Gemini models)
 * Uses @google/genai unified SDK supporting both Vertex AI and Google AI Studio
 */

import { GenerateContentConfig, GoogleGenAI, Part } from "@google/genai";
import { GeminiAIConfig, MultimodalPart, isSupportedMimeType } from '../types/index.js';
import { validateSecureUrl } from '../utils/urlSecurity.js';
import { validateMultimodalFile } from '../utils/fileSecurity.js';
import { SecurityError } from '../errors/index.js';
import { getErrorMessage } from '../utils/errorUtils.js';

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
   * Query Vertex AI with a prompt and optional multimodal content
   */
  async query(
    prompt: string, 
    options: QueryOptions = {},
    multimodalParts?: MultimodalPart[]
  ): Promise<string> {
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

      // Build content parts
      const contents = await this.buildContents(prompt, multimodalParts);

      const response = await this.client.models.generateContent({
        model: this.config.model,
        contents,
        config,
      });

      return this.extractResponseText(response);
    } catch (error) {
      // Log error details for debugging
      console.error('Gemini API query error:', error);

      // Return error message instead of throwing
      throw new Error(`Gemini API error: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Build contents array from prompt and multimodal parts
   */
  private async buildContents(prompt: string, multimodalParts?: MultimodalPart[]): Promise<any> {
    // If no multimodal parts, use simple string format
    if (!multimodalParts || multimodalParts.length === 0) {
      return prompt;
    }

    // Build structured content with parts
    const parts: Part[] = [];

    // Add text prompt as first part
    if (prompt) {
      parts.push({ text: prompt });
    }

    // Add multimodal parts with security validation
    for (const part of multimodalParts) {
      const contentPart: Part = {};

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
        // Security validation for file data using comprehensive file security validator
        try {
          // Validate MIME type and URI together
          const validated = validateMultimodalFile(
            part.fileData.mimeType,
            part.fileData.fileUri,
            { 
              allowAllDirectories: this.config.allowFileUris // Allow file:// only if explicitly enabled
            }
          );
          
          // Additional HTTPS URL validation for SSRF protection
          if (validated.fileUri.startsWith('https://')) {
            await validateSecureUrl(validated.fileUri);
          }
          
          // file:// URIs are converted to absolute paths by validateMultimodalFile
          // Only allowed if allowFileUris is true (CLI environments)
          if (part.fileData.fileUri.startsWith('file://') && !this.config.allowFileUris) {
            throw new SecurityError(
              'file:// URIs are not allowed. Set GEMINI_ALLOW_FILE_URIS=true to enable (only for CLI environments, not desktop apps)'
            );
          }
          
          contentPart.fileData = {
            mimeType: validated.mimeType,
            fileUri: validated.fileUri,
          };
        } catch (error) {
          if (error instanceof SecurityError) {
            throw error;
          }
          throw new Error(`Invalid file data: ${(error as Error).message}`);
        }
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
      return `Error extracting response: ${getErrorMessage(error)}`;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): GeminiAIConfig {
    return { ...this.config };
  }
}
