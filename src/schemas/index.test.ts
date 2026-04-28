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
      thinkingLevel: 'high',
      mediaResolution: 'medium',
    });

    expect(parsed.aspectRatio).toBe('8:1');
    expect(parsed.imageSize).toBe('0.5K');
    expect(parsed.thinkingLevel).toBe('high');
    expect(parsed.mediaResolution).toBe('medium');
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

  it('limits image references to 14 and restricts thinkingLevel to gemini-3.1-flash-image-preview', () => {
    expect(() => ImageGenerationSchema.parse({
      prompt: 'compose these references',
      imagePaths: Array.from({ length: 15 }, (_, index) => `/tmp/ref-${index}.png`),
    })).toThrow();

    // gemini-2.5-flash-image rejects thinkingLevel
    expect(() => ImageGenerationSchema.parse({
      prompt: 'fast image',
      model: 'gemini-2.5-flash-image',
      thinkingLevel: 'low',
    })).toThrow(/gemini-3\.1-flash-image-preview/);

    // gemini-3-pro-image-preview (default) also rejects thinkingLevel — Vertex API does not support it
    expect(() => ImageGenerationSchema.parse({
      prompt: 'pro image',
      model: 'gemini-3-pro-image-preview',
      thinkingLevel: 'medium',
    })).toThrow(/gemini-3\.1-flash-image-preview/);

    // Default (no model) also rejects thinkingLevel — default resolves to gemini-3-pro-image-preview server-side
    expect(() => ImageGenerationSchema.parse({
      prompt: 'default image',
      thinkingLevel: 'high',
    })).toThrow(/gemini-3\.1-flash-image-preview/);

    // Only gemini-3.1-flash-image-preview accepts thinkingLevel
    expect(ImageGenerationSchema.parse({
      prompt: 'flash image',
      model: 'gemini-3.1-flash-image-preview',
      thinkingLevel: 'high',
    }).thinkingLevel).toBe('high');
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

  it('accepts Veo extension video source on standard and fast models', () => {
    const parsed = VideoGenerationSchema.parse({
      prompt: 'extend this shot into the garden',
      model: 'veo-3.1-fast-generate-001',
      videoPath: '/tmp/veo-output.mp4',
      resolution: '720p',
    });

    expect(parsed.videoPath).toBe('/tmp/veo-output.mp4');
  });

  it('accepts Lite extension preview source but rejects unsupported Lite options', () => {
    expect(VideoGenerationSchema.parse({
      prompt: 'extend this shot',
      model: 'veo-3.1-lite-generate-001',
      videoPath: '/tmp/veo-output.mp4',
    }).videoPath).toBe('/tmp/veo-output.mp4');

    expect(() => VideoGenerationSchema.parse({
      prompt: 'quick draft',
      model: 'veo-3.1-lite-generate-001',
      resolution: '4k',
      durationSeconds: '8',
    })).toThrow(/4k/);

    expect(() => VideoGenerationSchema.parse({
      prompt: 'use references',
      model: 'veo-3.1-lite-generate-001',
      referenceImagePaths: ['/tmp/ref.png'],
    })).toThrow(/referenceImagePaths are not supported/);
  });

  it('rejects mixed Veo source modes', () => {
    expect(() => VideoGenerationSchema.parse({
      prompt: 'extend this shot',
      videoPath: '/tmp/veo-output.mp4',
      imagePath: '/tmp/frame.png',
    })).toThrow(/videoPath cannot be used/);

    expect(() => VideoGenerationSchema.parse({
      prompt: 'use these references',
      imagePath: '/tmp/frame.png',
      referenceImagePaths: ['/tmp/ref.png'],
    })).toThrow(/referenceImagePaths cannot be used/);
  });

  it('rejects unsupported extension options', () => {
    expect(() => VideoGenerationSchema.parse({
      prompt: 'extend this shot',
      videoPath: '/tmp/veo-output.mp4',
      resolution: '1080p',
      durationSeconds: '8',
    })).toThrow(/videoPath extension only supports resolution='720p'/);

    expect(() => VideoGenerationSchema.parse({
      prompt: 'extend this shot',
      videoPath: '/tmp/veo-output.mp4',
      numberOfVideos: 2,
    })).toThrow(/single video/);
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

  it('accepts Lyria preview feature controls', () => {
    const parsed = MusicGenerationSchema.parse({
      prompt: 'A full pop song',
      model: 'lyria-3-pro-preview',
      lyrics: '[Verse]\nHello from the test suite',
      vocalStyle: 'warm Korean pop vocal',
      durationSeconds: 120,
      bpm: 110,
      intensity: 'medium',
    });

    expect(parsed.durationSeconds).toBe(120);
    expect(parsed.bpm).toBe(110);
    expect(parsed.lyrics).toContain('Hello');
  });

  it('rejects incompatible Lyria preview feature controls', () => {
    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop',
      durationSeconds: 60,
    })).toThrow(/durationSeconds requires/);

    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop',
      instrumental: true,
      lyrics: '[Verse]\nWords',
    })).toThrow(/instrumental cannot be combined/);
  });

  it('rejects more than 10 image sources', () => {
    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop inspired by these images',
      imagePaths: Array.from({ length: 11 }, (_, index) => `/tmp/ref-${index}.jpg`),
    })).toThrow();
  });
});
