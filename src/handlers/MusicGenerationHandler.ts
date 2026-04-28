import { MusicGenerationInput } from '../schemas/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { GeminiAIConfig } from '../types/index.js';
import {
  generateMusicFilename,
  getDefaultMusicDir,
  saveAudio,
} from '../utils/audioSaver.js';

export class MusicGenerationHandler {
  private geminiService: GeminiAIService;
  private musicOutputDir: string;

  constructor(geminiService: GeminiAIService, config: GeminiAIConfig) {
    this.geminiService = geminiService;
    this.musicOutputDir = config.musicOutputDir || getDefaultMusicDir();
  }

  getMusicOutputDir(): string {
    return this.musicOutputDir;
  }

  async handle(input: MusicGenerationInput): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    const result = await this.geminiService.generateMusic(input.prompt, {
      model: input.model,
      outputMimeType: input.outputMimeType,
      imagePaths: input.imagePaths,
      lyrics: input.lyrics,
      instrumental: input.instrumental,
      vocalStyle: input.vocalStyle,
      durationSeconds: input.durationSeconds,
      bpm: input.bpm,
      intensity: input.intensity,
    });

    if (result.audios.length === 0) {
      throw new Error('Lyria response did not include audio data');
    }

    const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];
    const savedPaths: Array<{ filePath: string; mimeType: string }> = [];

    for (let i = 0; i < result.audios.length; i++) {
      const audio = result.audios[i];
      const filename = generateMusicFilename(i + 1, audio.mimeType);
      const filePath = saveAudio(audio.data, this.musicOutputDir, filename);

      savedPaths.push({
        filePath,
        mimeType: audio.mimeType,
      });

      content.push({
        type: 'audio',
        data: audio.data.toString('base64'),
        mimeType: audio.mimeType,
      });
    }

    content.unshift({
      type: 'text',
      text: JSON.stringify({
        music: savedPaths,
        text: result.text,
      }),
    });

    return { content };
  }
}
