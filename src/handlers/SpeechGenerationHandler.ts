import { SpeechGenerationInput } from '../schemas/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { GeminiAIConfig } from '../types/index.js';
import {
  generateSpeechFilename,
  getDefaultSpeechDir,
  isWavMimeType,
  pcmToWav,
  saveAudio,
} from '../utils/audioSaver.js';

export class SpeechGenerationHandler {
  private geminiService: GeminiAIService;
  private speechOutputDir: string;

  constructor(geminiService: GeminiAIService, config: GeminiAIConfig) {
    this.geminiService = geminiService;
    this.speechOutputDir = config.speechOutputDir || getDefaultSpeechDir();
  }

  getSpeechOutputDir(): string {
    return this.speechOutputDir;
  }

  async handle(input: SpeechGenerationInput): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    const result = await this.geminiService.generateSpeech(input.prompt, {
      model: input.model,
      voiceName: input.voiceName,
      languageCode: input.languageCode,
      speakers: input.speakers,
      backend: input.backend,
    });

    if (result.audios.length === 0) {
      throw new Error(
        result.text
          ? `Gemini TTS response did not include audio data: ${result.text}`
          : 'Gemini TTS response did not include audio data'
      );
    }

    const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];
    const savedPaths: Array<{ filePath: string; mimeType: string; sourceMimeType: string }> = [];

    for (let i = 0; i < result.audios.length; i++) {
      const audio = result.audios[i];
      const outputData = isWavMimeType(audio.mimeType) ? audio.data : pcmToWav(audio.data);
      const outputMimeType = 'audio/wav';
      const filename = generateSpeechFilename(i + 1, outputMimeType);
      const filePath = saveAudio(outputData, this.speechOutputDir, filename);

      savedPaths.push({
        filePath,
        mimeType: outputMimeType,
        sourceMimeType: audio.mimeType,
      });

      content.push({
        type: 'audio',
        data: outputData.toString('base64'),
        mimeType: outputMimeType,
      });
    }

    content.unshift({
      type: 'text',
      text: JSON.stringify({
        speech: savedPaths,
        text: result.text,
      }),
    });

    return { content };
  }
}
