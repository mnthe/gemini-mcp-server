import { describe, expect, it } from 'vitest';
import {
  ImageGenerationSchema,
  MusicGenerationSchema,
  QuerySchema,
  SpeechGenerationSchema,
  VideoGenerationSchema,
} from './index.js';

describe('QuerySchema model controls', () => {
  it('accepts Gemini 3.1 Flash-Lite and request-level controls', () => {
    const parsed = QuerySchema.parse({
      prompt: 'Summarize this image',
      model: 'gemini-3.1-flash-lite-preview',
      thinkingLevel: 'medium',
      mediaResolution: 'high',
    });

    expect(parsed.model).toBe('gemini-3.1-flash-lite-preview');
    expect(parsed.thinkingLevel).toBe('medium');
    expect(parsed.mediaResolution).toBe('high');
  });
});

describe('ImageGenerationSchema model compatibility', () => {
  it('accepts Nano Banana 2 specific image options', () => {
    const parsed = ImageGenerationSchema.parse({
      prompt: 'wide product banner',
      model: 'gemini-3.1-flash-image-preview',
      aspectRatio: '8:1',
      imageSize: '0.5K',
    });

    expect(parsed.aspectRatio).toBe('8:1');
    expect(parsed.imageSize).toBe('0.5K');
  });

  it('rejects Nano Banana 2 only aspect ratios on the default image model', () => {
    expect(() => ImageGenerationSchema.parse({
      prompt: 'wide product banner',
      aspectRatio: '8:1',
    })).toThrow(/gemini-3\.1-flash-image-preview/);
  });

  it('rejects imageSize for gemini-2.5-flash-image', () => {
    expect(() => ImageGenerationSchema.parse({
      prompt: 'fast image',
      model: 'gemini-2.5-flash-image',
      imageSize: '1K',
    })).toThrow(/imageSize is not supported/);
  });
});

describe('VideoGenerationSchema current Veo models', () => {
  it('accepts GA Veo 3.1 models and rejects the retired preview model', () => {
    expect(VideoGenerationSchema.parse({
      prompt: 'ocean waves',
      model: 'veo-3.1-generate-001',
    }).model).toBe('veo-3.1-generate-001');

    expect(VideoGenerationSchema.parse({
      prompt: 'quick draft',
      model: 'veo-3.1-lite-generate-001',
    }).model).toBe('veo-3.1-lite-generate-001');

    expect(() => VideoGenerationSchema.parse({
      prompt: 'old model',
      model: 'veo-3.1-generate-preview',
    })).toThrow();
  });
});

describe('SpeechGenerationSchema TTS models', () => {
  it('accepts Gemini TTS model and two-speaker voice config', () => {
    const parsed = SpeechGenerationSchema.parse({
      prompt: 'Alice: 안녕하세요\nBob: 반갑습니다',
      model: 'gemini-3.1-flash-tts-preview',
      speakers: [
        { speaker: 'Alice', voiceName: 'Kore' },
        { speaker: 'Bob', voiceName: 'Puck' },
      ],
    });

    expect(parsed.speakers).toHaveLength(2);
  });

  it('rejects top-level voiceName with multi-speaker config', () => {
    expect(() => SpeechGenerationSchema.parse({
      prompt: 'Alice: hi\nBob: hello',
      voiceName: 'Kore',
      speakers: [
        { speaker: 'Alice', voiceName: 'Kore' },
        { speaker: 'Bob', voiceName: 'Puck' },
      ],
    })).toThrow(/voiceName cannot be used with speakers/);
  });
});

describe('MusicGenerationSchema Lyria models', () => {
  it('accepts Lyria 3 Pro WAV output', () => {
    const parsed = MusicGenerationSchema.parse({
      prompt: 'A cinematic orchestral track',
      model: 'lyria-3-pro-preview',
      outputMimeType: 'audio/wav',
    });

    expect(parsed.outputMimeType).toBe('audio/wav');
  });

  it('rejects WAV output on Lyria 3 Clip default model', () => {
    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop',
      outputMimeType: 'audio/wav',
    })).toThrow(/lyria-3-pro-preview/);
  });
});
