/**
 * GeminiAIService - Handles communication with Google AI (Gemini models)
 * Uses @google/genai unified SDK supporting both Vertex AI and Google AI Studio
 */

import { GenerateContentConfig, GoogleGenAI, Part, ThinkingLevel } from "@google/genai";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

// Re-export ThinkingLevel for consumers
export { ThinkingLevel } from "@google/genai";
import { GeminiAIConfig, MultimodalPart, isSupportedMimeType } from '../types/index.js';
import { validateSecureUrl } from '../utils/urlSecurity.js';
import { validateMultimodalFile } from '../utils/fileSecurity.js';
import { SecurityError } from '../errors/index.js';

export interface ImageGenerationOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  imagePaths?: string[];
}

export interface GeneratedImage {
  data: string;      // base64
  mimeType: string;  // image/png
}

export interface VideoGenerationOptions {
  model?: string;
  aspectRatio?: string;
  durationSeconds?: string;
  resolution?: string;
  generateAudio?: boolean;
  negativePrompt?: string;
  seed?: number;
  numberOfVideos?: number;
  imagePath?: string;
  lastFramePath?: string;
  referenceImagePaths?: string[];
}

export interface GeneratedVideo {
  data: Buffer;
  mimeType: string;
}

export interface QueryOptions {
  enableThinking?: boolean;
  /**
   * Thinking level for Gemini 3 models
   * - MINIMAL: Absolute minimum thinking
   * - LOW: Minimizes latency and cost
   * - MEDIUM: Balanced reasoning
   * - HIGH: Maximizes reasoning depth (default for Gemini 3)
   * Note: For Gemini 2.5 models, use enableThinking with thinkingBudget
   */
  thinkingLevel?: ThinkingLevel;
  /**
   * Media resolution for Gemini 3 models: 'low' | 'medium' | 'high'
   * Controls the resolution of media inputs (images, video frames)
   */
  mediaResolution?: string;
  /**
   * Optional model override for per-request model selection.
   * When provided, overrides the ENV-configured model.
   */
  model?: string;
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
   * Check if the model is a Gemini 3 series model
   * Gemini 3 models use thinkingLevel instead of thinkingBudget
   */
  private isGemini3Model(modelOverride?: string): boolean {
    const model = (modelOverride || this.config.model).toLowerCase();
    return /gemini[-_]?3/.test(model);
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
      const effectiveModel = options.model || this.config.model;

      const config: GenerateContentConfig = {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: this.config.topP,
        topK: this.config.topK,
      };

      // Enable thinking mode if requested
      if (options.enableThinking) {
        if (this.isGemini3Model(effectiveModel)) {
          // Gemini 3 models use thinkingLevel instead of thinkingBudget
          // Note: Cannot disable thinking for Gemini 3 Pro
          config.thinkingConfig = {
            thinkingLevel: options.thinkingLevel ?? ThinkingLevel.HIGH,
          };
        } else {
          // Gemini 2.5 and earlier use thinkingBudget
          config.thinkingConfig = {
            thinkingBudget: -1,  // Auto budget
          };
        }
      }

      // Build content parts
      const contents = await this.buildContents(prompt, multimodalParts);

      const response = await this.client.models.generateContent({
        model: effectiveModel,
        contents,
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return `Error extracting response: ${errorMsg}`;
    }
  }

  /**
   * Generate images using Gemini image models
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<{ images: GeneratedImage[]; text?: string }> {
    const model = options.model || 'gemini-3-pro-image-preview';

    // Build contents: text prompt + optional reference images
    let contents: any;
    if (options.imagePaths && options.imagePaths.length > 0) {
      const parts: Part[] = [{ text: prompt }];
      for (const filePath of options.imagePaths) {
        const data = readFileSync(filePath).toString('base64');
        const mimeType = this.getMimeTypeFromExtension(extname(filePath));
        parts.push({ inlineData: { data, mimeType } });
      }
      contents = [{ role: 'user', parts }];
    } else {
      contents = prompt;
    }

    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: options.aspectRatio || '1:1',
          imageSize: options.imageSize,
        },
      },
    });
    return this.extractImages(response);
  }

  private getMimeTypeFromExtension(ext: string): string {
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
    };
    return map[ext.toLowerCase()] || 'image/png';
  }

  /**
   * Extract images and text from a Gemini response containing inline data
   */
  private extractImages(response: any): { images: GeneratedImage[]; text?: string } {
    const images: GeneratedImage[] = [];
    let text: string | undefined;

    const candidates = response?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          images.push({
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          });
        }
        if (part.text) {
          text = text ? text + '\n' + part.text : part.text;
        }
      }
    }

    // Also check response.text as fallback
    if (!text && response?.text) {
      text = response.text;
    }

    return { images, text };
  }

  /**
   * Generate videos using Gemini video models (Veo)
   */
  async generateVideo(
    prompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<{ videos: GeneratedVideo[] }> {
    const model = options.model || 'veo-3.1-fast-generate-001';

    // Build request parameters
    const params: any = {
      model,
      prompt,
      config: {
        aspectRatio: options.aspectRatio || '16:9',
        durationSeconds: parseInt(options.durationSeconds || '8'),
        resolution: options.resolution,
        generateAudio: options.generateAudio ?? true,
        negativePrompt: options.negativePrompt,
        seed: options.seed,
        numberOfVideos: options.numberOfVideos || 1,
      },
    };

    // Image-to-video: attach input image
    if (options.imagePath) {
      const data = readFileSync(options.imagePath).toString('base64');
      const mimeType = this.getMimeTypeFromExtension(extname(options.imagePath));
      params.image = { bytesBase64: data, mimeType };
    }

    // Interpolation: attach last frame
    if (options.lastFramePath) {
      const data = readFileSync(options.lastFramePath).toString('base64');
      const mimeType = this.getMimeTypeFromExtension(extname(options.lastFramePath));
      params.config.lastFrame = { bytesBase64: data, mimeType };
    }

    // Reference images (max 3)
    if (options.referenceImagePaths && options.referenceImagePaths.length > 0) {
      params.config.referenceImages = options.referenceImagePaths.map((filePath: string) => ({
        referenceType: 'asset',
        image: {
          bytesBase64: readFileSync(filePath).toString('base64'),
          mimeType: this.getMimeTypeFromExtension(extname(filePath)),
        },
      }));
    }

    // 1. Start async operation
    let operation = await this.client.models.generateVideos(params);

    // 2. Poll for completion (10s interval)
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await this.client.operations.getVideosOperation({ operation });
    }

    // 3. Error check
    if (operation.error) {
      throw new Error(`Video generation failed: ${JSON.stringify(operation.error)}`);
    }

    // 4. Extract video data from response
    const videos: GeneratedVideo[] = [];
    for (const genVideo of (operation.response?.generatedVideos || [])) {
      const video = genVideo.video;
      if (video?.videoBytes) {
        videos.push({
          data: Buffer.from(video.videoBytes, 'base64'),
          mimeType: video.mimeType || 'video/mp4',
        });
      } else if (video?.uri) {
        const resp = await fetch(video.uri);
        const arrayBuf = await resp.arrayBuffer();
        videos.push({
          data: Buffer.from(arrayBuf),
          mimeType: 'video/mp4',
        });
      }
    }

    return { videos };
  }

  /**
   * Get the current configuration
   */
  getConfig(): GeminiAIConfig {
    return { ...this.config };
  }
}
