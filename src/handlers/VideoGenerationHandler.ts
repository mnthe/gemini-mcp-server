import { VideoGenerationInput } from '../schemas/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { GeminiAIConfig } from '../types/index.js';
import { getDefaultVideoDir, saveVideo, generateVideoFilename } from '../utils/videoSaver.js';

export class VideoGenerationHandler {
  private geminiService: GeminiAIService;
  private videoOutputDir: string;

  constructor(geminiService: GeminiAIService, config: GeminiAIConfig) {
    this.geminiService = geminiService;
    this.videoOutputDir = config.videoOutputDir || getDefaultVideoDir();
  }

  getVideoOutputDir(): string {
    return this.videoOutputDir;
  }

  async handle(input: VideoGenerationInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.geminiService.generateVideo(input.prompt, {
      model: input.model,
      aspectRatio: input.aspectRatio,
      durationSeconds: input.durationSeconds,
      resolution: input.resolution,
      generateAudio: input.generateAudio,
      negativePrompt: input.negativePrompt,
      seed: input.seed,
      numberOfVideos: input.numberOfVideos,
      imagePath: input.imagePath,
      lastFramePath: input.lastFramePath,
      referenceImagePaths: input.referenceImagePaths,
    });

    const savedPaths: string[] = [];
    for (let i = 0; i < result.videos.length; i++) {
      const vid = result.videos[i];
      const filename = generateVideoFilename(i + 1);
      const filePath = saveVideo(vid.data, this.videoOutputDir, filename);
      savedPaths.push(filePath);
    }

    const content: Array<{ type: string; text: string }> = [{
      type: 'text',
      text: JSON.stringify({
        videos: savedPaths.map((fp, i) => ({
          filePath: fp,
          mimeType: result.videos[i].mimeType,
        })),
      }),
    }];

    return { content };
  }
}
