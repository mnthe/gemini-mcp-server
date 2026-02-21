import { ImageGenerationInput } from '../schemas/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { GeminiAIConfig } from '../types/index.js';
import { getDefaultImageDir, saveImage, generateImageFilename } from '../utils/imageSaver.js';

export class ImageGenerationHandler {
  private geminiService: GeminiAIService;
  private imageOutputDir: string;

  constructor(geminiService: GeminiAIService, config: GeminiAIConfig) {
    this.geminiService = geminiService;
    this.imageOutputDir = config.imageOutputDir || getDefaultImageDir();
  }

  async handle(input: ImageGenerationInput): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    const result = await this.geminiService.generateImage(input.prompt, {
      model: input.model,
      aspectRatio: input.aspectRatio,
      imageSize: input.imageSize,
    });

    const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];
    const savedPaths: string[] = [];

    // Save images and create content blocks
    for (let i = 0; i < result.images.length; i++) {
      const img = result.images[i];
      const filename = generateImageFilename(i + 1, img.mimeType);
      const filePath = saveImage(img.data, this.imageOutputDir, filename);
      savedPaths.push(filePath);

      content.push({
        type: 'image',
        data: img.data,
        mimeType: img.mimeType,
      });
    }

    // Add structured text with file paths
    const textInfo = JSON.stringify({
      images: savedPaths.map((fp, i) => ({
        filePath: fp,
        mimeType: result.images[i].mimeType,
      })),
      text: result.text,
    });

    content.unshift({ type: 'text', text: textInfo });

    return { content };
  }
}
