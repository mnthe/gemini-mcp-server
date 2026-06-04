import { describe, expect, it } from 'vitest';
import {
  ImageGenerationSchema,
  MusicGenerationSchema,
  QuerySchema,
  SpeechGenerationSchema,
  VideoGenerationSchema,
  buildMusicGenerationSchema,
  buildVideoGenerationSchema,
} from './index.js';

describe('QuerySchema model controls', () => {
  it('accepts Gemini 3.1 Flash-Lite and request-level controls', () => {
    const parsed = QuerySchema.parse({
      prompt: 'Summarize this image',
      model: 'gemini-3.1-flash-lite',
      thinkingLevel: 'medium',
      mediaResolution: 'high',
    });

    expect(parsed.model).toBe('gemini-3.1-flash-lite');
    expect(parsed.thinkingLevel).toBe('medium');
    expect(parsed.mediaResolution).toBe('high');
  });
});

describe('ImageGenerationSchema model compatibility', () => {
  it('accepts Nano Banana 2 specific image options', () => {
    const parsed = ImageGenerationSchema.parse({
      prompt: 'wide product banner',
      model: 'gemini-3.1-flash-image',
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
    })).toThrow(/gemini-3\.1-flash-image/);
  });

  it('rejects imageSize for gemini-2.5-flash-image', () => {
    expect(() => ImageGenerationSchema.parse({
      prompt: 'fast image',
      model: 'gemini-2.5-flash-image',
      imageSize: '1K',
    })).toThrow(/imageSize is not supported/);
  });

  it('limits image references and restricts thinkingLevel to official image-model values', () => {
    expect(() => ImageGenerationSchema.parse({
      prompt: 'compose these references',
      imagePaths: Array.from({ length: 15 }, (_, index) => `/tmp/ref-${index}.png`),
    })).toThrow();

    expect(() => ImageGenerationSchema.parse({
      prompt: 'fast image edit',
      model: 'gemini-2.5-flash-image',
      imagePaths: [
        '/tmp/ref-1.png',
        '/tmp/ref-2.png',
        '/tmp/ref-3.png',
        '/tmp/ref-4.png',
      ],
    })).toThrow(/at most 3 reference images/);

    expect(() => ImageGenerationSchema.parse({
      prompt: 'flash image',
      model: 'gemini-3.1-flash-image',
      thinkingLevel: 'medium',
    })).toThrow();

    // gemini-2.5-flash-image rejects thinkingLevel
    expect(() => ImageGenerationSchema.parse({
      prompt: 'fast image',
      model: 'gemini-2.5-flash-image',
      thinkingLevel: 'high',
    })).toThrow(/gemini-3\.1-flash-image/);

    // gemini-3-pro-image (default) also rejects thinkingLevel — Vertex API does not support it
    expect(() => ImageGenerationSchema.parse({
      prompt: 'pro image',
      model: 'gemini-3-pro-image',
      thinkingLevel: 'high',
    })).toThrow(/gemini-3\.1-flash-image/);

    // Default (no model) also rejects thinkingLevel — default resolves to gemini-3-pro-image server-side
    expect(() => ImageGenerationSchema.parse({
      prompt: 'default image',
      thinkingLevel: 'high',
    })).toThrow(/gemini-3\.1-flash-image/);

    // Only gemini-3.1-flash-image accepts thinkingLevel
    expect(ImageGenerationSchema.parse({
      prompt: 'flash image',
      model: 'gemini-3.1-flash-image',
      thinkingLevel: 'high',
    }).thinkingLevel).toBe('high');
  });

  it('rejects non-image files as image references', () => {
    expect(() => ImageGenerationSchema.parse({
      prompt: 'edit from this reference',
      imagePaths: ['/tmp/reference.mp3'],
    })).toThrow(/Unsupported image source file type/);
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

  it('rejects unsupported Veo source file types', () => {
    expect(() => VideoGenerationSchema.parse({
      prompt: 'animate this source',
      imagePath: '/tmp/source.wav',
    })).toThrow(/Unsupported Veo image source file type/);

    expect(() => VideoGenerationSchema.parse({
      prompt: 'animate this source',
      imagePath: '/tmp/source.heic',
    })).toThrow(/Unsupported Veo image source file type/);

    expect(() => VideoGenerationSchema.parse({
      prompt: 'extend this shot',
      videoPath: '/tmp/source.mov',
    })).toThrow(/Unsupported video extension source file type/);
  });
});

describe('VideoGenerationSchema Vertex-only output controls', () => {
  it('accepts compressionQuality and resizeMode for image-to-video in Vertex mode', () => {
    const parsed = VideoGenerationSchema.parse({
      prompt: 'animate this frame',
      imagePath: '/tmp/frame.png',
      compressionQuality: 'lossless',
      resizeMode: 'crop',
    });

    expect(parsed.compressionQuality).toBe('lossless');
    expect(parsed.resizeMode).toBe('crop');
  });

  it('rejects resizeMode without imagePath', () => {
    expect(() => VideoGenerationSchema.parse({
      prompt: 'text to video',
      resizeMode: 'pad',
    })).toThrow(/resizeMode requires imagePath/);
  });

  it('rejects resizeMode combined with referenceImagePaths', () => {
    expect(() => VideoGenerationSchema.parse({
      prompt: 'reference guided',
      imagePath: '/tmp/frame.png',
      referenceImagePaths: ['/tmp/ref.png'],
      resizeMode: 'crop',
    })).toThrow();
  });

  it('rejects compressionQuality and resizeMode in Gemini Developer API mode', () => {
    const GeminiApiVideoSchema = buildVideoGenerationSchema(false);

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'compressed video',
      compressionQuality: 'lossless',
    })).toThrow(/compressionQuality is only supported by the Vertex AI backend/);

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'animate this frame',
      imagePath: '/tmp/frame.png',
      resizeMode: 'crop',
    })).toThrow(/resizeMode is only supported by the Vertex AI backend/);
  });
});

describe('VideoGenerationSchema Gemini Developer API compatibility', () => {
  const GeminiApiVideoSchema = buildVideoGenerationSchema(false);

  it('accepts Gemini API preview Veo 3.1 models and rejects Vertex model IDs', () => {
    expect(GeminiApiVideoSchema.parse({
      prompt: 'ocean waves',
      model: 'veo-3.1-generate-preview',
    }).model).toBe('veo-3.1-generate-preview');

    expect(GeminiApiVideoSchema.parse({
      prompt: 'quick draft',
      model: 'veo-3.1-lite-generate-preview',
    }).model).toBe('veo-3.1-lite-generate-preview');

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'vertex model',
      model: 'veo-3.1-generate-001',
    })).toThrow();
  });

  it('rejects Gemini API generateVideos options that the SDK does not support', () => {
    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'video with explicit audio',
      generateAudio: true,
    })).toThrow(/generateAudio/);

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'seeded video',
      seed: 123,
    })).toThrow(/seed/);

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'multiple videos',
      numberOfVideos: 2,
    })).toThrow();
  });

  it('uses Gemini API personGeneration values by input mode', () => {
    expect(GeminiApiVideoSchema.parse({
      prompt: 'person walking',
      personGeneration: 'allow_all',
    }).personGeneration).toBe('allow_all');

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'person walking',
      personGeneration: 'allow_adult',
    })).toThrow(/allow_all/);

    expect(GeminiApiVideoSchema.parse({
      prompt: 'animate this portrait',
      imagePath: '/tmp/frame.png',
      personGeneration: 'allow_adult',
    }).personGeneration).toBe('allow_adult');

    expect(() => GeminiApiVideoSchema.parse({
      prompt: 'animate this portrait',
      imagePath: '/tmp/frame.png',
      personGeneration: 'allow_all',
    })).toThrow(/allow_adult/);
  });
});

describe('buildVideoGenerationSchema dual-backend mode', () => {
  const DualSchema = buildVideoGenerationSchema(true, ['vertex', 'ai-studio']);

  it('accepts both Vertex (-001) and AI Studio (-preview) models when routed correctly', () => {
    expect(DualSchema.parse({ prompt: 'x', model: 'veo-3.1-generate-001' }).model)
      .toBe('veo-3.1-generate-001');
    expect(DualSchema.parse({ prompt: 'x', backend: 'ai-studio', model: 'veo-3.1-generate-preview' }).model)
      .toBe('veo-3.1-generate-preview');
  });

  it('rejects a model that does not match the selected backend', () => {
    // default backend is vertex; a -preview model belongs to ai-studio
    expect(() => DualSchema.parse({ prompt: 'x', model: 'veo-3.1-generate-preview' }))
      .toThrow(/does not match the selected backend/);
    expect(() => DualSchema.parse({ prompt: 'x', backend: 'vertex', model: 'veo-3.1-generate-preview' }))
      .toThrow(/does not match the selected backend/);
  });

  it('gates Vertex-only fields by the selected backend', () => {
    expect(() => DualSchema.parse({
      prompt: 'x', backend: 'ai-studio', model: 'veo-3.1-generate-preview', seed: 1,
    })).toThrow(/seed/);
    // vertex is the default backend, so seed is allowed without a backend arg
    expect(DualSchema.parse({ prompt: 'x', seed: 1 }).seed).toBe(1);
  });

  it('rejects a backend value that is not configured', () => {
    const VertexOnly = buildVideoGenerationSchema(true, ['vertex']);
    expect(() => VertexOnly.parse({ prompt: 'x', backend: 'ai-studio' })).toThrow();
  });
});

describe('buildMusicGenerationSchema dual-backend mode', () => {
  const DualMusic = buildMusicGenerationSchema(true, ['vertex', 'ai-studio']);

  it('allows WAV only on the ai-studio backend for lyria-3-pro-preview', () => {
    expect(DualMusic.parse({
      prompt: 'song', backend: 'ai-studio', model: 'lyria-3-pro-preview', outputMimeType: 'audio/wav',
    }).outputMimeType).toBe('audio/wav');

    // vertex backend rejects wav
    expect(() => DualMusic.parse({
      prompt: 'song', backend: 'vertex', model: 'lyria-3-pro-preview', outputMimeType: 'audio/wav',
    })).toThrow(/audio\/mp3/);
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
  it('accepts Vertex Lyria 3 MP3 output and supported language', () => {
    const parsed = MusicGenerationSchema.parse({
      prompt: 'A cinematic orchestral track',
      model: 'lyria-3-pro-preview',
      outputMimeType: 'audio/mp3',
      language: 'Korean',
    });

    expect(parsed.outputMimeType).toBe('audio/mp3');
    expect(parsed.language).toBe('Korean');
  });

  it('rejects WAV output in Vertex Lyria 3 mode', () => {
    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop',
      model: 'lyria-3-pro-preview',
      outputMimeType: 'audio/wav',
    })).toThrow();
  });

  it('allows WAV output only for Lyria 3 Pro in Gemini API mode', () => {
    const GeminiApiMusicSchema = buildMusicGenerationSchema(false);

    expect(GeminiApiMusicSchema.parse({
      prompt: 'A cinematic orchestral track',
      model: 'lyria-3-pro-preview',
      outputMimeType: 'audio/wav',
    }).outputMimeType).toBe('audio/wav');

    expect(() => GeminiApiMusicSchema.parse({
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
      language: 'Korean',
      durationSeconds: 120,
      bpm: 110,
      intensity: 'medium',
    });

    expect(parsed.durationSeconds).toBe(120);
    expect(parsed.bpm).toBe(110);
    expect(parsed.lyrics).toContain('Hello');
    expect(parsed.language).toBe('Korean');
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

    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop',
      language: 'Italian',
    })).toThrow();

    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop',
      negativePrompt: 'no drums',
    })).toThrow(/Unrecognized key/);
  });

  it('rejects more than 10 image sources', () => {
    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop inspired by these images',
      imagePaths: Array.from({ length: 11 }, (_, index) => `/tmp/ref-${index}.jpg`),
    })).toThrow();
  });

  it('rejects audio files as Lyria reference inputs', () => {
    expect(() => MusicGenerationSchema.parse({
      prompt: 'A short acoustic loop inspired by this audio',
      imagePaths: ['/tmp/reference.wav'],
    })).toThrow(/Unsupported image source file type/);
  });
});
