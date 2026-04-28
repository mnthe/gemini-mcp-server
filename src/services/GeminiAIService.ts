/**
 * GeminiAIService - Handles communication with Google AI (Gemini models)
 * Uses @google/genai SDK with Vertex AI or Gemini Developer API mode
 */

import { GenerateContentConfig, GoogleGenAI, MediaResolution, Part, ThinkingLevel } from "@google/genai";
import { readFileSync } from "node:fs";
import { extname, resolve as resolvePath, sep as pathSep } from "node:path";

// Re-export ThinkingLevel for consumers
export { ThinkingLevel } from "@google/genai";
import { GeminiAIConfig, MultimodalPart, isSupportedMimeType } from '../types/index.js';
import { validateSecureUrl } from '../utils/urlSecurity.js';
import { validateMultimodalFile } from '../utils/fileSecurity.js';
import { resolveOutputDirs } from '../utils/generatedFileSaver.js';
import { SecurityError } from '../errors/index.js';

export interface ImageGenerationOptions {
  model?: string;
  aspectRatio?: string;
  imageSize?: string;
  imagePaths?: string[];
  systemInstruction?: string;
  thinkingLevel?: ThinkingLevel | string;
  mediaResolution?: string;
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
  enhancePrompt?: boolean;
  personGeneration?: string;
  negativePrompt?: string;
  seed?: number;
  numberOfVideos?: number;
  imagePath?: string;
  lastFramePath?: string;
  referenceImagePaths?: string[];
  videoPath?: string;
}

export interface GeneratedVideo {
  data: Buffer;
  mimeType: string;
}

export interface SpeechSpeakerOptions {
  speaker: string;
  voiceName: string;
}

export interface SpeechGenerationOptions {
  model?: string;
  voiceName?: string;
  languageCode?: string;
  speakers?: SpeechSpeakerOptions[];
}

export interface MusicGenerationOptions {
  model?: string;
  outputMimeType?: string;
  imagePaths?: string[];
  lyrics?: string;
  instrumental?: boolean;
  vocalStyle?: string;
  durationSeconds?: number;
  bpm?: number;
  intensity?: string;
}

export interface GeneratedAudio {
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
  thinkingLevel?: ThinkingLevel | string;
  /**
   * Media resolution for multimodal inputs: 'low' | 'medium' | 'high'
   * Controls the resolution of media inputs (images, video frames, PDFs)
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
  private pendingVideoOps = new Map<string, any>();
  private extraSafeDirectories: string[];

  constructor(config: GeminiAIConfig) {
    this.config = config;
    this.client = config.useVertexAI
      ? new GoogleGenAI({
          vertexai: true,
          project: config.projectId,
          location: config.location,
        })
      : new GoogleGenAI({
          apiKey: config.apiKey,
        });

    // Auto-allow this server's own generated-output directories so users can
    // round-trip generated files (e.g. feed a generated image back into query).
    const outputs = resolveOutputDirs(config);
    this.extraSafeDirectories = [outputs.image, outputs.video, outputs.speech, outputs.music]
      .map(d => resolvePath(d));
  }

  private isInSelfManagedDir(absolutePath: string): boolean {
    return this.extraSafeDirectories.some(dir =>
      absolutePath === dir || absolutePath.startsWith(dir + pathSep)
    );
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
   * Query Gemini with a prompt and optional multimodal content
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
      };

      // Gemini 3 exposes topK as a fixed model default. Sending a custom value
      // can be rejected by newer model endpoints, so only send it to older models.
      if (!this.isGemini3Model(effectiveModel)) {
        config.topK = this.config.topK;
      }

      const mediaResolution = this.resolveMediaResolution(
        options.mediaResolution || this.config.mediaResolution
      );
      if (mediaResolution) {
        config.mediaResolution = mediaResolution;
      }

      // Enable thinking mode if requested
      if (options.enableThinking) {
        if (this.isGemini3Model(effectiveModel)) {
          // Gemini 3 models use thinkingLevel instead of thinkingBudget
          // Note: Cannot disable thinking for Gemini 3 Pro
          config.thinkingConfig = {
            thinkingLevel: this.resolveThinkingLevel(options.thinkingLevel) ?? ThinkingLevel.HIGH,
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

  private resolveThinkingLevel(level?: ThinkingLevel | string): ThinkingLevel | undefined {
    if (!level) {
      return undefined;
    }

    const normalized = String(level).trim().toUpperCase();
    switch (normalized) {
      case 'MINIMAL':
        return ThinkingLevel.MINIMAL;
      case 'LOW':
        return ThinkingLevel.LOW;
      case 'MEDIUM':
        return ThinkingLevel.MEDIUM;
      case 'HIGH':
        return ThinkingLevel.HIGH;
      default:
        throw new Error(
          `Invalid thinkingLevel: ${level}. Expected one of minimal, low, medium, high.`
        );
    }
  }

  private resolveMediaResolution(resolution?: string): MediaResolution | undefined {
    if (!resolution) {
      return undefined;
    }

    const normalized = resolution
      .trim()
      .toUpperCase()
      .replace(/[-\s]/g, '_')
      .replace(/^MEDIA_RESOLUTION_/, '');

    switch (normalized) {
      case 'UNSPECIFIED':
        return MediaResolution.MEDIA_RESOLUTION_UNSPECIFIED;
      case 'LOW':
        return MediaResolution.MEDIA_RESOLUTION_LOW;
      case 'MEDIUM':
        return MediaResolution.MEDIA_RESOLUTION_MEDIUM;
      case 'HIGH':
        return MediaResolution.MEDIA_RESOLUTION_HIGH;
      default:
        throw new Error(
          `Invalid mediaResolution: ${resolution}. Expected one of low, medium, high, unspecified.`
        );
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
              allowAllDirectories: this.config.allowFileUris, // Allow file:// only if explicitly enabled
              additionalSafeDirectories: this.extraSafeDirectories,
            }
          );
          
          // Additional HTTPS URL validation for SSRF protection
          if (validated.fileUri.startsWith('https://')) {
            await validateSecureUrl(validated.fileUri);
          }
          
          // file:// URIs are converted to absolute paths by validateMultimodalFile.
          // Gate: only allowed when allowFileUris=true (CLI environments) OR when
          // the resolved path is inside this server's own generated-output dirs
          // (round-trip case — the server wrote the file itself).
          const isFileUri = part.fileData.fileUri.startsWith('file://');
          if (
            isFileUri &&
            !this.config.allowFileUris &&
            !this.isInSelfManagedDir(validated.fileUri)
          ) {
            throw new SecurityError(
              'file:// URIs are not allowed. Set GEMINI_ALLOW_FILE_URIS=true to enable (only for CLI environments, not desktop apps), ' +
              'or use a path under the gemini-generated output directories.'
            );
          }

          if (isFileUri) {
            // Gemini's fileData.fileUri only accepts gs:// or https://; local
            // paths get rejected upstream. Once the path has cleared the same
            // guardrails (validateMultimodalFile + file:// gate), transparently
            // inline the file as base64 so users can round-trip generated files.
            const data = readFileSync(validated.fileUri).toString('base64');
            contentPart.inlineData = {
              mimeType: validated.mimeType,
              data,
            };
          } else {
            contentPart.fileData = {
              mimeType: validated.mimeType,
              fileUri: validated.fileUri,
            };
          }
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
    const contents = this.buildContentsWithInlineFiles(prompt, options.imagePaths);
    const config: GenerateContentConfig = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: options.aspectRatio || '1:1',
        imageSize: options.imageSize,
      },
    };

    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    const thinkingLevel = this.resolveThinkingLevel(options.thinkingLevel);
    if (thinkingLevel) {
      config.thinkingConfig = { thinkingLevel };
    }

    const mediaResolution = this.resolveMediaResolution(options.mediaResolution);
    if (mediaResolution) {
      config.mediaResolution = mediaResolution;
    }

    const response = await this.client.models.generateContent({
      model,
      contents,
      config,
    });
    return this.extractImages(response);
  }

  /**
   * Generate speech audio using Gemini TTS models
   */
  async generateSpeech(
    prompt: string,
    options: SpeechGenerationOptions = {}
  ): Promise<{ audios: GeneratedAudio[]; text?: string }> {
    const model = options.model || 'gemini-3.1-flash-tts-preview';

    const speechConfig: any = {};
    if (options.languageCode) {
      speechConfig.languageCode = options.languageCode;
    }

    if (options.speakers && options.speakers.length > 0) {
      speechConfig.multiSpeakerVoiceConfig = {
        speakerVoiceConfigs: options.speakers.map((speaker) => ({
          speaker: speaker.speaker,
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: speaker.voiceName,
            },
          },
        })),
      };
    } else {
      speechConfig.voiceConfig = {
        prebuiltVoiceConfig: {
          voiceName: options.voiceName || 'Kore',
        },
      };
    }

    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig,
      },
    });

    return this.extractAudioParts(response, 'audio/pcm');
  }

  /**
   * Generate music using Lyria models
   */
  async generateMusic(
    prompt: string,
    options: MusicGenerationOptions = {}
  ): Promise<{ audios: GeneratedAudio[]; text?: string }> {
    const model = options.model || 'lyria-3-clip-preview';
    const config: GenerateContentConfig = {
      responseModalities: ['AUDIO', 'TEXT'],
    };

    if (options.outputMimeType) {
      config.responseMimeType = options.outputMimeType;
    }

    const response = await this.client.models.generateContent({
      model,
      contents: this.buildContentsWithInlineFiles(
        this.buildMusicPrompt(prompt, options),
        options.imagePaths
      ),
      config,
    });

    return this.extractAudioParts(response, options.outputMimeType || 'audio/mp3');
  }

  private buildMusicPrompt(prompt: string, options: MusicGenerationOptions): string {
    const controls: string[] = [];

    if (options.durationSeconds !== undefined) {
      controls.push(`Target duration: ${options.durationSeconds} seconds.`);
    }
    if (options.bpm !== undefined) {
      controls.push(`Tempo: ${options.bpm} BPM.`);
    }
    if (options.intensity) {
      controls.push(`Intensity: ${String(options.intensity).toLowerCase()}.`);
    }
    if (options.instrumental) {
      controls.push('Instrumental only, no vocals.');
    }
    if (options.vocalStyle) {
      controls.push(`Vocal direction: ${options.vocalStyle}`);
    }
    if (options.lyrics) {
      controls.push(`Use these user-provided lyrics:\n${options.lyrics}`);
    }

    if (controls.length === 0) {
      return prompt;
    }

    return `${prompt}\n\nLyria generation controls:\n${controls.join('\n')}`;
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
      '.mpeg': 'video/mpeg',
      '.mpg': 'video/mpg',
      '.avi': 'video/avi',
      '.wmv': 'video/wmv',
      '.flv': 'video/flv',
      '.mpegps': 'video/mpegps',
      '.webm': 'video/webm',
      '.mov': 'video/mov',
    };
    return map[ext.toLowerCase()] || 'image/png';
  }

  private buildContentsWithInlineFiles(prompt: string, filePaths?: string[]): any {
    if (!filePaths || filePaths.length === 0) {
      return prompt;
    }

    const parts: Part[] = [{ text: prompt }];
    for (const filePath of filePaths) {
      const data = readFileSync(filePath).toString('base64');
      const mimeType = this.getMimeTypeFromExtension(extname(filePath));
      parts.push({ inlineData: { data, mimeType } });
    }

    return [{ role: 'user', parts }];
  }

  private getResponseParts(response: any): any[] {
    const parts: any[] = [];

    const candidates = response?.candidates || [];
    for (const candidate of candidates) {
      if (Array.isArray(candidate?.content?.parts)) {
        parts.push(...candidate.content.parts);
      }
    }

    if (parts.length === 0 && Array.isArray(response?.parts)) {
      parts.push(...response.parts);
    }

    return parts;
  }

  /**
   * Extract images and text from a Gemini response containing inline data
   */
  private extractImages(response: any): { images: GeneratedImage[]; text?: string } {
    const images: GeneratedImage[] = [];
    let text: string | undefined;

    for (const part of this.getResponseParts(response)) {
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

    // Also check response.text as fallback
    if (!text && response?.text) {
      text = response.text;
    }

    return { images, text };
  }

  /**
   * Extract audio and text from a Gemini response containing inline data
   */
  private extractAudioParts(
    response: any,
    defaultMimeType: string
  ): { audios: GeneratedAudio[]; text?: string } {
    const audios: GeneratedAudio[] = [];
    let text: string | undefined;

    for (const part of this.getResponseParts(response)) {
      if (part.inlineData) {
        const rawData = part.inlineData.data;
        audios.push({
          data: Buffer.isBuffer(rawData)
            ? rawData
            : Buffer.from(String(rawData), 'base64'),
          mimeType: part.inlineData.mimeType || defaultMimeType,
        });
      }
      if (part.text) {
        text = text ? text + '\n' + part.text : part.text;
      }
    }

    if (!text && response?.text) {
      text = response.text;
    }

    return { audios, text };
  }

  /**
   * Generate videos using Gemini video models (Veo)
   */
  async generateVideo(
    prompt: string,
    options: VideoGenerationOptions = {}
  ): Promise<{ operationId: string }> {
    const model = options.model || 'veo-3.1-fast-generate-001';

    // Build request parameters
    const params: any = {
      model,
      prompt,
      config: {
        aspectRatio: options.aspectRatio || '16:9',
        durationSeconds: options.videoPath ? undefined : parseInt(options.durationSeconds || '8'),
        resolution: options.videoPath ? (options.resolution || '720p') : options.resolution,
        generateAudio: options.generateAudio ?? true,
        enhancePrompt: options.enhancePrompt,
        personGeneration: options.personGeneration,
        negativePrompt: options.negativePrompt,
        seed: options.seed,
        numberOfVideos: options.videoPath ? 1 : (options.numberOfVideos || 1),
      },
    };

    // Video extension: attach a Veo-generated input video.
    if (options.videoPath) {
      const data = readFileSync(options.videoPath).toString('base64');
      const mimeType = this.getMimeTypeFromExtension(extname(options.videoPath));
      params.video = { videoBytes: data, mimeType };
    }

    // Image-to-video: attach input image
    if (options.imagePath) {
      params.image = this.buildVideoImageFromPath(options.imagePath);
    }

    // Interpolation: attach last frame
    if (options.lastFramePath) {
      params.config.lastFrame = this.buildVideoImageFromPath(options.lastFramePath);
    }

    // Reference images (max 3)
    if (options.referenceImagePaths && options.referenceImagePaths.length > 0) {
      params.config.referenceImages = options.referenceImagePaths.map((filePath: string) => ({
        referenceType: 'asset',
        image: this.buildVideoImageFromPath(filePath),
      }));
    }

    // Start async operation
    const operation = await this.client.models.generateVideos(params);

    // Extract UUID from operation name for a cleaner external ID
    // Format: "projects/{project}/locations/{location}/publishers/.../operations/{uuid}"
    const fullName = operation.name || '';
    const operationId = fullName.split('/').pop() || fullName;

    // Cache the full operation object for polling (SDK requires the actual instance)
    this.pendingVideoOps.set(operationId, operation);

    return { operationId };
  }

  private buildVideoImageFromPath(filePath: string): { imageBytes: string; mimeType: string } {
    return {
      imageBytes: readFileSync(filePath).toString('base64'),
      mimeType: this.getMimeTypeFromExtension(extname(filePath)),
    };
  }

  /**
   * Check the status of a video generation operation and download results if complete
   */
  async checkVideoOperation(
    operationId: string
  ): Promise<{ done: boolean; videos?: GeneratedVideo[]; error?: string }> {
    // Retrieve cached operation object (SDK requires actual operation instance for polling)
    const cachedOp = this.pendingVideoOps.get(operationId);
    if (!cachedOp) {
      return { done: true, error: `Unknown operation: ${operationId}. Operation may have been created in a previous server session.` };
    }

    const operation = await this.client.operations.getVideosOperation({
      operation: cachedOp,
    });

    if (!operation.done) {
      // Update cached operation with latest state for next poll
      this.pendingVideoOps.set(operationId, operation);
      return { done: false };
    }

    // Operation finished, clean up cache
    this.pendingVideoOps.delete(operationId);

    if (operation.error) {
      return { done: true, error: JSON.stringify(operation.error) };
    }

    // Extract video data from completed operation
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

    return { done: true, videos };
  }

  /**
   * Get the current configuration
   */
  getConfig(): GeminiAIConfig {
    return { ...this.config };
  }
}
