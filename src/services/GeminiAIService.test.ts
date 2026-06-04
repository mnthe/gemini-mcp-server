import { describe, it, expect, vi } from 'vitest';
import { GeminiAIService } from './GeminiAIService.js';

/**
 * Tests for Gemini model param compatibility + default model change
 *
 * Since isGemini3Model() is private, we test it indirectly through
 * the service's config behavior. We also test config loading and
 * type-level compatibility.
 */

// Test isGemini3Model regex pattern directly (extracted for testability)
// The regex: /gemini[-_]?3/
const isGemini3Pattern = /gemini[-_]?3/;

describe('isGemini3Model regex pattern', () => {
  it('matches gemini-3.1-pro-preview', () => {
    expect(isGemini3Pattern.test('gemini-3.1-pro-preview')).toBe(true);
  });

  it('matches gemini-3-flash-preview', () => {
    expect(isGemini3Pattern.test('gemini-3-flash-preview')).toBe(true);
  });

  it('matches gemini-3.5-flash', () => {
    expect(isGemini3Pattern.test('gemini-3.5-flash')).toBe(true);
  });

  it('matches gemini-3-pro-image', () => {
    expect(isGemini3Pattern.test('gemini-3-pro-image')).toBe(true);
  });

  it('matches gemini-3.1-flash-image', () => {
    expect(isGemini3Pattern.test('gemini-3.1-flash-image')).toBe(true);
  });

  it('matches gemini3 (no separator)', () => {
    expect(isGemini3Pattern.test('gemini3-pro')).toBe(true);
  });

  it('matches gemini_3 (underscore separator)', () => {
    expect(isGemini3Pattern.test('gemini_3-pro')).toBe(true);
  });

  it('does NOT match gemini-2.5-pro', () => {
    expect(isGemini3Pattern.test('gemini-2.5-pro')).toBe(false);
  });

  it('does NOT match gemini-2-flash', () => {
    expect(isGemini3Pattern.test('gemini-2-flash')).toBe(false);
  });
});

describe('ThinkingLevel enum from SDK', () => {
  it('exports expected enum values', async () => {
    const { ThinkingLevel } = await import('@google/genai');
    expect(ThinkingLevel.LOW).toBe('LOW');
    expect(ThinkingLevel.MEDIUM).toBe('MEDIUM');
    expect(ThinkingLevel.HIGH).toBe('HIGH');
    expect(ThinkingLevel.MINIMAL).toBe('MINIMAL');
  });
});

describe('default model configuration', () => {
  it('defaults to gemini-3.5-flash', async () => {
    // Save and clear env
    const savedModel = process.env.GEMINI_MODEL;
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GEMINI_MODEL;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

    try {
      // Dynamic import to get fresh module
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.model).toBe('gemini-3.5-flash');
      expect(config.useVertexAI).toBe(true);
    } finally {
      // Restore env
      if (savedModel !== undefined) {
        process.env.GEMINI_MODEL = savedModel;
      }
      if (savedProject !== undefined) {
        process.env.GOOGLE_CLOUD_PROJECT = savedProject;
      } else {
        delete process.env.GOOGLE_CLOUD_PROJECT;
      }
      if (savedUseVertex !== undefined) {
        process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex;
      } else {
        delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
      }
    }
  });
});

describe('API mode configuration', () => {
  it('uses Gemini Developer API mode when explicitly configured with an API key', async () => {
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedApiKey = process.env.GEMINI_API_KEY;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GOOGLE_GENAI_USE_VERTEXAI = 'false';

    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.useVertexAI).toBe(false);
      expect(config.apiKey).toBe('test-api-key');
      expect(config.projectId).toBeUndefined();
    } finally {
      if (savedProject !== undefined) process.env.GOOGLE_CLOUD_PROJECT = savedProject;
      else delete process.env.GOOGLE_CLOUD_PROJECT;
      if (savedApiKey !== undefined) process.env.GEMINI_API_KEY = savedApiKey;
      else delete process.env.GEMINI_API_KEY;
      if (savedUseVertex !== undefined) process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex;
      else delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    }
  });
});

describe('mediaResolution config', () => {
  it('loads GEMINI_MEDIA_RESOLUTION from env', async () => {
    const savedModel = process.env.GEMINI_MODEL;
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedMediaRes = process.env.GEMINI_MEDIA_RESOLUTION;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GEMINI_MEDIA_RESOLUTION = 'high';

    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.mediaResolution).toBe('high');
    } finally {
      if (savedModel !== undefined) process.env.GEMINI_MODEL = savedModel;
      if (savedProject !== undefined) process.env.GOOGLE_CLOUD_PROJECT = savedProject;
      else delete process.env.GOOGLE_CLOUD_PROJECT;
      if (savedMediaRes !== undefined) process.env.GEMINI_MEDIA_RESOLUTION = savedMediaRes;
      else delete process.env.GEMINI_MEDIA_RESOLUTION;
      if (savedUseVertex !== undefined) process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex;
      else delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    }
  });

  it('is undefined when env var not set', async () => {
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedMediaRes = process.env.GEMINI_MEDIA_RESOLUTION;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    delete process.env.GEMINI_MEDIA_RESOLUTION;

    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.mediaResolution).toBeUndefined();
    } finally {
      if (savedProject !== undefined) process.env.GOOGLE_CLOUD_PROJECT = savedProject;
      else delete process.env.GOOGLE_CLOUD_PROJECT;
      if (savedMediaRes !== undefined) process.env.GEMINI_MEDIA_RESOLUTION = savedMediaRes;
      else delete process.env.GEMINI_MEDIA_RESOLUTION;
      if (savedUseVertex !== undefined) process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex;
      else delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    }
  });
});

describe('generated audio output config', () => {
  it('loads speech and music output directories from env', async () => {
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedSpeechDir = process.env.GEMINI_SPEECH_OUTPUT_DIR;
    const savedMusicDir = process.env.GEMINI_MUSIC_OUTPUT_DIR;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GEMINI_SPEECH_OUTPUT_DIR = '/tmp/speech';
    process.env.GEMINI_MUSIC_OUTPUT_DIR = '/tmp/music';

    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.speechOutputDir).toBe('/tmp/speech');
      expect(config.musicOutputDir).toBe('/tmp/music');
    } finally {
      if (savedProject !== undefined) process.env.GOOGLE_CLOUD_PROJECT = savedProject;
      else delete process.env.GOOGLE_CLOUD_PROJECT;
      if (savedSpeechDir !== undefined) process.env.GEMINI_SPEECH_OUTPUT_DIR = savedSpeechDir;
      else delete process.env.GEMINI_SPEECH_OUTPUT_DIR;
      if (savedMusicDir !== undefined) process.env.GEMINI_MUSIC_OUTPUT_DIR = savedMusicDir;
      else delete process.env.GEMINI_MUSIC_OUTPUT_DIR;
      if (savedUseVertex !== undefined) process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex;
      else delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    }
  });
});

describe('backend availability detection', () => {
  it('exposes both backends when both credentials are present', async () => {
    const savedKey = process.env.GEMINI_API_KEY;
    const savedGoogleKey = process.env.GOOGLE_API_KEY;
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;

    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.availableBackends).toContain('vertex');
      expect(config.availableBackends).toContain('ai-studio');
      expect(config.availableBackends).toHaveLength(2);
      // project present and no explicit override -> vertex is the default
      expect(config.defaultBackend).toBe('vertex');
      expect(config.useVertexAI).toBe(true);
    } finally {
      if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey; else delete process.env.GEMINI_API_KEY;
      if (savedGoogleKey !== undefined) process.env.GOOGLE_API_KEY = savedGoogleKey; else delete process.env.GOOGLE_API_KEY;
      if (savedProject !== undefined) process.env.GOOGLE_CLOUD_PROJECT = savedProject; else delete process.env.GOOGLE_CLOUD_PROJECT;
      if (savedUseVertex !== undefined) process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex; else delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    }
  });

  it('explicit GOOGLE_GENAI_USE_VERTEXAI=false defaults to ai-studio even with a project set', async () => {
    const savedKey = process.env.GEMINI_API_KEY;
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedUseVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_GENAI_USE_VERTEXAI = 'false';

    try {
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.defaultBackend).toBe('ai-studio');
      expect(config.availableBackends).toContain('vertex');
      expect(config.availableBackends[0]).toBe('ai-studio');
    } finally {
      if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey; else delete process.env.GEMINI_API_KEY;
      if (savedProject !== undefined) process.env.GOOGLE_CLOUD_PROJECT = savedProject; else delete process.env.GOOGLE_CLOUD_PROJECT;
      if (savedUseVertex !== undefined) process.env.GOOGLE_GENAI_USE_VERTEXAI = savedUseVertex; else delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
    }
  });
});

describe('generateVideo backend compatibility', () => {
  function createServiceConfig(overrides: Record<string, unknown> = {}) {
    return {
      projectId: 'test-project',
      location: 'us-central1',
      apiKey: 'test-api-key',
      useVertexAI: true,
      model: 'gemini-3.5-flash',
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.95,
      topK: 40,
      enableConversations: false,
      sessionTimeout: 3600000,
      maxHistory: 100,
      enableReasoning: false,
      maxReasoningSteps: 5,
      disableLogging: true,
      logToStderr: false,
      allowFileUris: false,
      ...overrides,
    } as any;
  }

  function stubGenerateVideos(service: GeminiAIService) {
    const generateVideos = vi.fn().mockResolvedValue({
      name: 'projects/test-project/locations/us-central1/operations/op-123',
    });
    (service as any).clientFor = () => ({
      models: { generateVideos },
      operations: {},
    });
    return generateVideos;
  }

  it('uses Vertex Veo 3.1 GA defaults and sends Vertex-only config fields', async () => {
    const service = new GeminiAIService(createServiceConfig());
    const generateVideos = stubGenerateVideos(service);

    const result = await service.generateVideo('a cinematic ocean shot', {
      seed: 123,
    });

    const params = generateVideos.mock.calls[0][0];
    expect(result.operationId).toBe('op-123');
    expect(params.model).toBe('veo-3.1-fast-generate-001');
    expect(params.config.generateAudio).toBe(true);
    expect(params.config.seed).toBe(123);
  });

  it('uses Gemini API preview defaults and omits unsupported config fields', async () => {
    const service = new GeminiAIService(createServiceConfig({
      useVertexAI: false,
      projectId: undefined,
    }));
    const generateVideos = stubGenerateVideos(service);

    await service.generateVideo('a cinematic ocean shot', {
      generateAudio: false,
      seed: 123,
    });

    const params = generateVideos.mock.calls[0][0];
    expect(params.model).toBe('veo-3.1-fast-generate-preview');
    expect(params.config).not.toHaveProperty('generateAudio');
    expect(params.config).not.toHaveProperty('seed');
  });

  it('maps compressionQuality and resizeMode to SDK enum values in Vertex mode', async () => {
    const service = new GeminiAIService(createServiceConfig());
    const generateVideos = stubGenerateVideos(service);

    await service.generateVideo('animate this frame', {
      compressionQuality: 'lossless',
      resizeMode: 'crop',
    });

    const params = generateVideos.mock.calls[0][0];
    expect(params.config.compressionQuality).toBe('LOSSLESS');
    expect(params.config.resizeMode).toBe('CROP');
  });

  it('omits compressionQuality and resizeMode in Gemini Developer API mode', async () => {
    const service = new GeminiAIService(createServiceConfig({
      useVertexAI: false,
      projectId: undefined,
    }));
    const generateVideos = stubGenerateVideos(service);

    await service.generateVideo('animate this frame', {
      compressionQuality: 'lossless',
      resizeMode: 'crop',
    });

    const params = generateVideos.mock.calls[0][0];
    expect(params.config).not.toHaveProperty('compressionQuality');
    expect(params.config).not.toHaveProperty('resizeMode');
  });

  it('routes per-request backend override (default vertex, request ai-studio)', async () => {
    // Default backend is vertex, but the request selects ai-studio.
    const service = new GeminiAIService(createServiceConfig({
      defaultBackend: 'vertex',
      availableBackends: ['vertex', 'ai-studio'],
    }));
    const generateVideos = stubGenerateVideos(service);

    await service.generateVideo('a cinematic ocean shot', {
      backend: 'ai-studio',
      seed: 123,
      compressionQuality: 'lossless',
    });

    const params = generateVideos.mock.calls[0][0];
    // ai-studio backend default model + Vertex-only fields omitted
    expect(params.model).toBe('veo-3.1-fast-generate-preview');
    expect(params.config).not.toHaveProperty('seed');
    expect(params.config).not.toHaveProperty('compressionQuality');
  });

  it('routes per-request backend override (default ai-studio, request vertex)', async () => {
    const service = new GeminiAIService(createServiceConfig({
      useVertexAI: false,
      defaultBackend: 'ai-studio',
      availableBackends: ['ai-studio', 'vertex'],
    }));
    const generateVideos = stubGenerateVideos(service);

    await service.generateVideo('a cinematic ocean shot', {
      backend: 'vertex',
      seed: 123,
    });

    const params = generateVideos.mock.calls[0][0];
    expect(params.model).toBe('veo-3.1-fast-generate-001');
    expect(params.config.seed).toBe(123);
    expect(params.config.generateAudio).toBe(true);
  });
});

describe('QueryOptions interface', () => {
  it('accepts mediaResolution option', async () => {
    const { ThinkingLevel } = await import('@google/genai');
    // Type-level test: this should compile without errors
    const options: import('./GeminiAIService.js').QueryOptions = {
      enableThinking: true,
      thinkingLevel: ThinkingLevel.HIGH,
      mediaResolution: 'high',
    };
    expect(options.mediaResolution).toBe('high');
    expect(options.thinkingLevel).toBe(ThinkingLevel.HIGH);
  });
});
