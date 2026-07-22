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

  it('matches gemini-3.6-flash', () => {
    expect(isGemini3Pattern.test('gemini-3.6-flash')).toBe(true);
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
  it('defaults to gemini-3.6-flash', async () => {
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
      expect(config.model).toBe('gemini-3.6-flash');
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

describe('query sampling parameter compatibility', () => {
  function createService(model: string) {
    const service = new GeminiAIService({
      projectId: 'test-project',
      location: 'global',
      useVertexAI: true,
      defaultBackend: 'vertex',
      availableBackends: ['vertex'],
      model,
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
    });
    const generateContent = vi.fn().mockResolvedValue({ text: 'ok' });
    (service as any).clientFor = () => ({ models: { generateContent } });
    return { service, generateContent };
  }

  it.each(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])(
    'omits deprecated sampling parameters for %s',
    async (model) => {
      const { service, generateContent } = createService(model);

      await service.query('hello');

      const config = generateContent.mock.calls[0][0].config;
      expect(config).not.toHaveProperty('temperature');
      expect(config).not.toHaveProperty('topP');
      expect(config).not.toHaveProperty('topK');
      expect(config.maxOutputTokens).toBe(8192);
    }
  );

  it('keeps supported sampling parameters for earlier models', async () => {
    const { service, generateContent } = createService('gemini-2.5-flash');

    await service.query('hello');

    expect(generateContent.mock.calls[0][0].config).toMatchObject({
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    });
  });

  it('keeps temperature and topP but omits fixed topK for earlier Gemini 3 models', async () => {
    const { service, generateContent } = createService('gemini-3.5-flash');

    await service.query('hello');

    const config = generateContent.mock.calls[0][0].config;
    expect(config).toMatchObject({ temperature: 0.7, topP: 0.95, maxOutputTokens: 8192 });
    expect(config).not.toHaveProperty('topK');
  });

  it('uses the request-level model override for sampling compatibility', async () => {
    const { service, generateContent } = createService('gemini-2.5-flash');

    await service.query('hello', { model: 'gemini-3.6-flash' });

    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe('gemini-3.6-flash');
    expect(request.config).not.toHaveProperty('temperature');
    expect(request.config).not.toHaveProperty('topP');
    expect(request.config).not.toHaveProperty('topK');
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
      expect(config.availableBackends?.[0]).toBe('ai-studio');
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
      model: 'gemini-3.6-flash',
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

describe('generateOmniVideo (Interactions API)', () => {
  function createServiceConfig(overrides: Record<string, unknown> = {}) {
    return {
      projectId: 'test-project',
      location: 'us-central1',
      apiKey: 'test-api-key',
      useVertexAI: false,
      defaultBackend: 'ai-studio',
      availableBackends: ['ai-studio'],
      model: 'gemini-3.6-flash',
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

  function stubInteractions(service: GeminiAIService, interaction: Record<string, unknown>) {
    const create = vi.fn().mockResolvedValue(interaction);
    const clientFor = vi.fn(() => ({ interactions: { create } }));
    (service as any).clientFor = clientFor;
    return { create, clientFor };
  }

  it('oneshot text-to-video builds a video response_format and returns the interactionId', async () => {
    const service = new GeminiAIService(createServiceConfig());
    const { create } = stubInteractions(service, {
      id: 'omni-1',
      status: 'completed',
      output_video: { data: Buffer.from('fake-mp4').toString('base64'), mime_type: 'video/mp4' },
      output_text: 'here is your clip',
    });

    const result = await service.generateOmniVideo('a fox running through snow', {
      aspectRatio: '9:16',
    });

    const params = create.mock.calls[0][0];
    expect(params.model).toBe('gemini-omni-flash-preview');
    expect(params.input).toBe('a fox running through snow');
    // Omni Flash does not support a structured duration field on response_format.
    expect(params.response_format).toEqual({ type: 'video', aspect_ratio: '9:16' });
    expect(params.store).toBe(true);
    expect(params).not.toHaveProperty('previous_interaction_id');
    // system_instruction is not supported by Omni Flash and must not be forwarded.
    expect(params).not.toHaveProperty('system_instruction');

    expect(result.interactionId).toBe('omni-1');
    expect(result.video.mimeType).toBe('video/mp4');
    expect(result.video.data.toString()).toBe('fake-mp4');
    expect(result.text).toBe('here is your clip');
  });

  it('defaults to the Google AI Studio backend even when the server default is Vertex', async () => {
    const service = new GeminiAIService(
      createServiceConfig({ useVertexAI: true, defaultBackend: 'vertex', availableBackends: ['vertex', 'ai-studio'] })
    );
    const { clientFor } = stubInteractions(service, {
      id: 'omni-vx',
      status: 'completed',
      output_video: { data: Buffer.from('clip').toString('base64'), mime_type: 'video/mp4' },
    });

    await service.generateOmniVideo('a kite in the wind');

    // Omni is AI-Studio-only; it must not route to Vertex despite the server default.
    expect(clientFor).toHaveBeenCalledWith('ai-studio');
  });

  it('honors an explicit backend override', async () => {
    const service = new GeminiAIService(createServiceConfig());
    const { clientFor } = stubInteractions(service, {
      id: 'omni-ov',
      status: 'completed',
      output_video: { data: Buffer.from('clip').toString('base64'), mime_type: 'video/mp4' },
    });

    await service.generateOmniVideo('a kite in the wind', { backend: 'vertex' });

    expect(clientFor).toHaveBeenCalledWith('vertex');
  });

  it('interactive edit forwards previousInteractionId as previous_interaction_id', async () => {
    const service = new GeminiAIService(createServiceConfig());
    const { create } = stubInteractions(service, {
      id: 'omni-2',
      status: 'completed',
      output_video: { data: Buffer.from('edited').toString('base64'), mime_type: 'video/mp4' },
    });

    const result = await service.generateOmniVideo('make the sky orange', {
      previousInteractionId: 'omni-1',
    });

    const params = create.mock.calls[0][0];
    expect(params.previous_interaction_id).toBe('omni-1');
    expect(params.input).toBe('make the sky orange');
    expect(result.interactionId).toBe('omni-2');
  });

  it('throws a descriptive error when no video is returned', async () => {
    const service = new GeminiAIService(createServiceConfig());
    stubInteractions(service, { id: 'omni-3', status: 'failed', output_text: 'blocked' });

    await expect(service.generateOmniVideo('x')).rejects.toThrow(/no video \(status: failed\): blocked/);
  });
});

describe('referenceSearch (Google Search grounding)', () => {
  function createServiceConfig(overrides: Record<string, unknown> = {}) {
    return {
      projectId: 'test-project',
      location: 'us-central1',
      apiKey: 'test-api-key',
      useVertexAI: true,
      model: 'gemini-3.6-flash',
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

  function stubGenerateContent(service: GeminiAIService, response: Record<string, unknown>) {
    const generateContent = vi.fn().mockResolvedValue(response);
    (service as any).clientFor = () => ({ models: { generateContent } });
    return generateContent;
  }

  const groundedResponse = {
    candidates: [{
      content: { parts: [{ text: 'Gemini 3 launched in 2026.' }] },
      groundingMetadata: {
        webSearchQueries: ['gemini 3 launch date'],
        groundingChunks: [
          { web: { uri: 'https://blog.google/gemini', title: 'Gemini blog', domain: 'blog.google' } },
          { web: { uri: 'https://ai.google.dev', title: 'AI docs', domain: 'ai.google.dev' } },
          { retrievedContext: {} }, // no web -> filtered out
        ],
        groundingSupports: [
          {
            segment: { startIndex: 0, endIndex: 9, text: 'Gemini 3' },
            groundingChunkIndices: [0, 1],
            confidenceScores: [0.98, 0.71],
          },
        ],
        searchEntryPoint: { renderedContent: '<div>Search Suggestions</div>' },
      },
    }],
  };

  it('sends Vertex-only excludeDomains/blockingConfidence and maps grounding metadata', async () => {
    const service = new GeminiAIService(createServiceConfig());
    const generateContent = stubGenerateContent(service, groundedResponse);

    const result = await service.referenceSearch('when did Gemini 3 launch?', {
      excludeDomains: ['reddit.com'],
      blockingConfidence: 'medium',
      includeImages: true,
    });

    const params = generateContent.mock.calls[0][0];
    const googleSearch = params.config.tools[0].googleSearch;
    expect(params.config).not.toHaveProperty('temperature');
    expect(googleSearch.excludeDomains).toEqual(['reddit.com']);
    expect(googleSearch.blockingConfidence).toBe('BLOCK_MEDIUM_AND_ABOVE');
    expect(googleSearch.searchTypes).toEqual({ webSearch: {}, imageSearch: {} });
    expect(googleSearch).not.toHaveProperty('timeRangeFilter');
    expect(params.config.tools).toHaveLength(1); // no urlContext without urls

    expect(result.text).toBe('Gemini 3 launched in 2026.');
    expect(result.searchQueries).toEqual(['gemini 3 launch date']);
    // third chunk (no web) is filtered out
    expect(result.citations).toEqual([
      { index: 0, title: 'Gemini blog', uri: 'https://blog.google/gemini', domain: 'blog.google' },
      { index: 1, title: 'AI docs', uri: 'https://ai.google.dev', domain: 'ai.google.dev' },
    ]);
    expect(result.supports[0].sourceIndices).toEqual([0, 1]);
    expect(result.supports[0].confidenceScores).toEqual([0.98, 0.71]);
    expect(result.searchEntryPoint).toBe('<div>Search Suggestions</div>');
  });

  it('sends timeRangeFilter and a urlContext tool on the Google AI Studio backend', async () => {
    const service = new GeminiAIService(createServiceConfig({
      useVertexAI: false,
      projectId: undefined,
      defaultBackend: 'ai-studio',
      availableBackends: ['ai-studio'],
    }));
    const generateContent = stubGenerateContent(service, groundedResponse);

    await service.referenceSearch('recent AI news', {
      timeRange: { startTime: '2026-06-01T00:00:00Z', endTime: '2026-07-01T00:00:00Z' },
      urls: ['https://ai.google.dev/docs'],
    });

    const params = generateContent.mock.calls[0][0];
    const googleSearch = params.config.tools[0].googleSearch;
    expect(googleSearch.timeRangeFilter).toEqual({
      startTime: '2026-06-01T00:00:00Z',
      endTime: '2026-07-01T00:00:00Z',
    });
    expect(params.config.tools[1]).toEqual({ urlContext: {} });
    // explicit urls are appended to the request text so URL context fetches them
    expect(params.contents).toContain('https://ai.google.dev/docs');
    expect(params.contents).toContain('recent AI news');
  });

  it('falls back to byte-slicing the answer when a support segment omits text', async () => {
    const service = new GeminiAIService(createServiceConfig());
    stubGenerateContent(service, {
      candidates: [{
        content: { parts: [{ text: 'Hello world answer' }] },
        groundingMetadata: {
          groundingSupports: [
            { segment: { startIndex: 0, endIndex: 5 }, groundingChunkIndices: [0] },
          ],
        },
      }],
    });

    const result = await service.referenceSearch('x');
    expect(result.supports[0].text).toBe('Hello');
    expect(result.citations).toEqual([]);
    expect(result.searchQueries).toEqual([]);
  });

  it('rejects an invalid blockingConfidence value', async () => {
    const service = new GeminiAIService(createServiceConfig());
    stubGenerateContent(service, groundedResponse);

    await expect(service.referenceSearch('x', { blockingConfidence: 'extreme' }))
      .rejects.toThrow(/Invalid blockingConfidence/);
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
