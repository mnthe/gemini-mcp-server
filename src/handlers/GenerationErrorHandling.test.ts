import { describe, expect, it, vi } from 'vitest';

import { ImageGenerationHandler } from './ImageGenerationHandler.js';
import { MusicGenerationHandler } from './MusicGenerationHandler.js';
import { SpeechGenerationHandler } from './SpeechGenerationHandler.js';

describe('generation handler error details', () => {
  it('includes Gemini image response text when no image data is returned', async () => {
    const handler = new ImageGenerationHandler({
      generateImage: vi.fn().mockResolvedValue({
        images: [],
        text: 'Blocked by safety filters',
      }),
    } as any, {} as any);

    await expect(handler.handle({ prompt: 'make an image' } as any))
      .rejects.toThrow('Gemini image generation response did not include image data: Blocked by safety filters');
  });

  it('includes Gemini TTS response text when no audio data is returned', async () => {
    const handler = new SpeechGenerationHandler({
      generateSpeech: vi.fn().mockResolvedValue({
        audios: [],
        text: 'The prompt was not recognized as speech synthesis',
      }),
    } as any, {} as any);

    await expect(handler.handle({ prompt: 'say hello' } as any))
      .rejects.toThrow('Gemini TTS response did not include audio data: The prompt was not recognized as speech synthesis');
  });

  it('includes Lyria response text when no audio data is returned', async () => {
    const handler = new MusicGenerationHandler({
      generateMusic: vi.fn().mockResolvedValue({
        audios: [],
        text: 'The request was filtered',
      }),
    } as any, {} as any);

    await expect(handler.handle({ prompt: 'make music' } as any))
      .rejects.toThrow('Lyria response did not include audio data: The request was filtered');
  });
});
