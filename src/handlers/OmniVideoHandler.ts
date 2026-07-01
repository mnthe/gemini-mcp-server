import { OmniVideoGenerationInput } from '../schemas/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { GeminiAIConfig } from '../types/index.js';
import { getDefaultVideoDir, saveVideo, generateVideoFilename } from '../utils/videoSaver.js';

/**
 * Handles the generate_omni_video tool (Gemini Omni Flash).
 *
 * Omni Flash returns the finished video synchronously via the Interactions API,
 * so unlike the Veo generate_video/check_video pair this handler saves the video
 * and returns its path in a single call. The interactionId is surfaced so callers
 * can chain conversational edits by passing it back as previousInteractionId.
 */
export class OmniVideoHandler {
  private geminiService: GeminiAIService;
  private videoOutputDir: string;

  constructor(geminiService: GeminiAIService, config: GeminiAIConfig) {
    this.geminiService = geminiService;
    this.videoOutputDir = config.videoOutputDir || getDefaultVideoDir();
  }

  getVideoOutputDir(): string {
    return this.videoOutputDir;
  }

  async handle(input: OmniVideoGenerationInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.geminiService.generateOmniVideo(input.prompt, {
      model: input.model,
      aspectRatio: input.aspectRatio,
      durationSeconds: input.durationSeconds,
      imagePaths: input.imagePaths,
      previousInteractionId: input.previousInteractionId,
      systemInstruction: input.systemInstruction,
      backend: input.backend,
    });

    const filename = generateVideoFilename(1);
    const filePath = saveVideo(result.video.data, this.videoOutputDir, filename);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'completed',
          interactionId: result.interactionId,
          video: { filePath, mimeType: result.video.mimeType },
          ...(result.text ? { text: result.text } : {}),
          hint: 'To conversationally edit this video, call generate_omni_video again with previousInteractionId set to the interactionId above.',
        }),
      }],
    };
  }
}
