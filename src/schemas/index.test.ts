import { describe, expect, it } from 'vitest';
import { ImageGenerationSchema, QuerySchema, VideoGenerationSchema } from './index.js';

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
