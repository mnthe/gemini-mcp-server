import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for generation tool wiring in GeminiAIMCPServer.
 *
 * We cannot instantiate the full server (requires API keys, transport, etc.)
 * so we test indirectly: import the module, mock dependencies, and verify
 * the tool registration and routing.
 */

// Mock all heavy dependencies to isolate the wiring logic
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: class MockServer {
      setRequestHandler = vi.fn();
      connect = vi.fn();
      constructor() {}
    },
  };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: { _type: 'CallToolRequest' },
  ListToolsRequestSchema: { _type: 'ListToolsRequest' },
}));

vi.mock('../managers/ConversationManager.js', () => ({
  ConversationManager: class { constructor() {} },
}));

vi.mock('../services/GeminiAIService.js', () => ({
  GeminiAIService: class {
    generateImage = vi.fn();
    constructor() {}
  },
}));

vi.mock('../mcp/EnhancedMCPClient.js', () => ({
  EnhancedMCPClient: class {
    initialize = vi.fn();
    constructor() {}
  },
}));

vi.mock('../tools/ToolRegistry.js', () => ({
  ToolRegistry: class {
    registerWebFetch = vi.fn();
    registerMCPTools = vi.fn();
    getAllTools = vi.fn().mockReturnValue([]);
    constructor() {}
  },
}));

vi.mock('../agentic/AgenticLoop.js', () => ({
  AgenticLoop: class { constructor() {} },
}));

vi.mock('../utils/Logger.js', () => ({
  Logger: class {
    info = vi.fn();
    error = vi.fn();
    warn = vi.fn();
    debug = vi.fn();
    constructor() {}
  },
}));

vi.mock('../handlers/QueryHandler.js', () => ({
  QueryHandler: class {
    handle = vi.fn();
    constructor() {}
  },
}));

vi.mock('../handlers/SearchHandler.js', () => ({
  SearchHandler: class {
    handle = vi.fn();
    constructor() {}
  },
}));

vi.mock('../handlers/FetchHandler.js', () => ({
  FetchHandler: class {
    handle = vi.fn();
    constructor() {}
  },
}));

const mockImageGenHandle = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
vi.mock('../handlers/ImageGenerationHandler.js', () => ({
  ImageGenerationHandler: class {
    handle = mockImageGenHandle;
    getImageOutputDir = vi.fn().mockReturnValue('/tmp/images');
    constructor() {}
  },
}));

const mockSpeechGenHandle = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
vi.mock('../handlers/SpeechGenerationHandler.js', () => ({
  SpeechGenerationHandler: class {
    handle = mockSpeechGenHandle;
    getSpeechOutputDir = vi.fn().mockReturnValue('/tmp/speech');
    constructor() {}
  },
}));

const mockMusicGenHandle = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
vi.mock('../handlers/MusicGenerationHandler.js', () => ({
  MusicGenerationHandler: class {
    handle = mockMusicGenHandle;
    getMusicOutputDir = vi.fn().mockReturnValue('/tmp/music');
    constructor() {}
  },
}));

vi.mock('../handlers/VideoGenerationHandler.js', () => ({
  VideoGenerationHandler: class {
    handle = vi.fn();
    getVideoOutputDir = vi.fn().mockReturnValue('/tmp/videos');
    constructor() {}
  },
}));

const mockOmniVideoHandle = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
vi.mock('../handlers/OmniVideoHandler.js', () => ({
  OmniVideoHandler: class {
    handle = mockOmniVideoHandle;
    getVideoOutputDir = vi.fn().mockReturnValue('/tmp/videos');
    constructor() {}
  },
}));

const mockReferenceSearchHandle = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
vi.mock('../handlers/ReferenceSearchHandler.js', () => ({
  ReferenceSearchHandler: class {
    handle = mockReferenceSearchHandle;
    constructor() {}
  },
}));

vi.mock('../utils/imageSaver.js', () => ({
  getDefaultImageDir: vi.fn().mockReturnValue('/tmp/images'),
  saveImage: vi.fn(),
  generateImageFilename: vi.fn(),
}));

import { GeminiAIMCPServer } from './GeminiAIMCPServer.js';

function createTestConfig(overrides: Record<string, unknown> = {}) {
  return {
    model: 'gemini-2.5-pro',
    apiKey: 'test-key',
    useVertexAI: true,
    sessionTimeout: 3600000,
    maxHistory: 100,
    enableConversations: false,
    maxIterations: 5,
    maxTokens: 8192,
    temperature: 0.7,
    systemPrompt: '',
    mcpServers: [],
    disableLogging: true,
    ...overrides,
  } as any;
}

/**
 * Helper: extract handlers registered via server.setRequestHandler
 * The mock Server stores calls on its setRequestHandler vi.fn().
 */
function getHandlers(serverInstance: any) {
  const calls = serverInstance.setRequestHandler.mock.calls as any[][];
  const listHandler = calls.find(
    (call) => call[0]?._type === 'ListToolsRequest'
  )?.[1];
  const callHandler = calls.find(
    (call) => call[0]?._type === 'CallToolRequest'
  )?.[1];
  return { listHandler, callHandler };
}

describe('GeminiAIMCPServer generate_image wiring', () => {
  let mcpServer: GeminiAIMCPServer;
  let listHandler: Function;
  let callHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    mockImageGenHandle.mockClear();
    mockSpeechGenHandle.mockClear();
    mockMusicGenHandle.mockClear();
    mockOmniVideoHandle.mockClear();
    mockReferenceSearchHandle.mockClear();
    mcpServer = new GeminiAIMCPServer(createTestConfig());
    // Access the internal Server mock instance via the private field
    const internalServer = (mcpServer as any).server;
    const handlers = getHandlers(internalServer);
    listHandler = handlers.listHandler;
    callHandler = handlers.callHandler;
  });

  it('includes generate_image in tools/list', async () => {
    expect(listHandler).toBeDefined();

    const result = await listHandler();
    const toolNames = result.tools.map((t: any) => t.name);

    expect(toolNames).toContain('generate_image');
  });

  it('generate_image tool has correct inputSchema with required prompt', async () => {
    const result = await listHandler();
    const imageGenTool = result.tools.find((t: any) => t.name === 'generate_image');

    expect(imageGenTool).toBeDefined();
    expect(imageGenTool.inputSchema.required).toContain('prompt');
    expect(imageGenTool.inputSchema.properties.prompt).toBeDefined();
    expect(imageGenTool.inputSchema.properties.model).toBeDefined();
    expect(imageGenTool.inputSchema.properties.aspectRatio).toBeDefined();
    expect(imageGenTool.inputSchema.properties.imageSize).toBeDefined();
    expect(imageGenTool.inputSchema.properties.model.enum).toEqual([
      'gemini-3-pro-image',
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
      'gemini-2.5-flash-image',
    ]);
    expect(imageGenTool.inputSchema.properties.aspectRatio.enum).toContain('1:4');
    expect(imageGenTool.inputSchema.properties.aspectRatio.enum).toContain('8:1');
    expect(imageGenTool.inputSchema.properties.imageSize.enum).toContain('0.5K');
    expect(imageGenTool.inputSchema.properties.imagePaths.maxItems).toBe(14);
    expect(imageGenTool.inputSchema.properties.imagePaths.description).toContain('HEIC');
    expect(imageGenTool.inputSchema.properties.imagePaths.description).toContain('Audio/video files are not accepted');
    expect(imageGenTool.inputSchema.properties.systemInstruction).toBeDefined();
    expect(imageGenTool.inputSchema.properties.thinkingLevel.enum).toContain('high');
    expect(imageGenTool.inputSchema.properties.thinkingLevel.enum).not.toContain('medium');
    expect(imageGenTool.inputSchema.properties.mediaResolution.enum).toContain('medium');
  });

  it('routes generate_image call to ImageGenerationHandler', async () => {
    expect(callHandler).toBeDefined();

    const request = {
      params: {
        name: 'generate_image',
        arguments: { prompt: 'a cat' },
      },
    };

    await callHandler(request);

    // Verify the mock handle function was called with parsed args
    expect(mockImageGenHandle).toHaveBeenCalledWith({ prompt: 'a cat' });
  });

  it('generate_speech tool is exposed and routed to SpeechGenerationHandler', async () => {
    const result = await listHandler();
    const speechTool = result.tools.find((t: any) => t.name === 'generate_speech');

    expect(speechTool).toBeDefined();
    expect(speechTool.inputSchema.required).toContain('prompt');
    // Vertex mode (createTestConfig useVertexAI: true) advertises the GA '-tts' ids.
    expect(speechTool.inputSchema.properties.model.enum).toEqual([
      'gemini-3.1-flash-tts-preview',
      'gemini-2.5-flash-tts',
      'gemini-2.5-pro-tts',
    ]);
    expect(speechTool.description).toContain('Input is text-only');
    expect(speechTool.inputSchema.properties.speakers.minItems).toBe(2);
    expect(speechTool.inputSchema.properties.speakers.maxItems).toBe(2);

    await callHandler({
      params: {
        name: 'generate_speech',
        arguments: { prompt: 'say hello', voiceName: 'Kore' },
      },
    });

    expect(mockSpeechGenHandle).toHaveBeenCalledWith({ prompt: 'say hello', voiceName: 'Kore' });
  });

  it('advertises Google AI Studio TTS ids when Vertex mode is disabled', async () => {
    const aiStudioServer = new GeminiAIMCPServer(createTestConfig({ useVertexAI: false }));
    const handlers = getHandlers((aiStudioServer as any).server);
    const result = await handlers.listHandler();
    const speechTool = result.tools.find((t: any) => t.name === 'generate_speech');

    expect(speechTool.inputSchema.properties.model.enum).toEqual([
      'gemini-3.1-flash-tts-preview',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-pro-preview-tts',
    ]);

    // A Vertex-only GA id must be rejected on the AI Studio backend.
    const invalidResult = await handlers.callHandler({
      params: {
        name: 'generate_speech',
        arguments: { prompt: 'hi', model: 'gemini-2.5-flash-tts' },
      },
    });
    const errorBody = JSON.parse(invalidResult.content[0].text);
    expect(invalidResult.isError).toBe(true);
    expect(errorBody.errorType).toBe('validation_error');
  });

  it('generate_omni_video tool is exposed and routed to OmniVideoHandler', async () => {
    const result = await listHandler();
    const omniTool = result.tools.find((t: any) => t.name === 'generate_omni_video');

    expect(omniTool).toBeDefined();
    expect(omniTool.inputSchema.required).toContain('prompt');
    expect(omniTool.inputSchema.properties.model.enum).toEqual(['gemini-omni-flash-preview']);
    expect(omniTool.inputSchema.properties.aspectRatio.enum).toEqual(['16:9', '9:16']);
    expect(omniTool.inputSchema.properties.durationSeconds.minimum).toBe(3);
    expect(omniTool.inputSchema.properties.durationSeconds.maximum).toBe(10);
    expect(omniTool.inputSchema.properties.imagePaths.maxItems).toBe(7);
    expect(omniTool.inputSchema.properties.previousInteractionId).toBeDefined();
    expect(omniTool.description).toContain('Omni Flash');
    expect(omniTool.description).toContain('previousInteractionId');
    expect(omniTool.description).toContain('720p');

    await callHandler({
      params: {
        name: 'generate_omni_video',
        arguments: { prompt: 'a fox running', durationSeconds: 6 },
      },
    });

    expect(mockOmniVideoHandle).toHaveBeenCalledWith({ prompt: 'a fox running', durationSeconds: 6 });
  });

  it('generate_music tool is exposed and routed to MusicGenerationHandler', async () => {
    const result = await listHandler();
    const musicTool = result.tools.find((t: any) => t.name === 'generate_music');

    expect(musicTool).toBeDefined();
    expect(musicTool.inputSchema.required).toContain('prompt');
    expect(musicTool.inputSchema.properties.model.enum).toEqual([
      'lyria-3-clip-preview',
      'lyria-3-pro-preview',
    ]);
    expect(musicTool.inputSchema.properties.outputMimeType.enum).toEqual([
      'audio/mp3',
    ]);
    expect(musicTool.inputSchema.properties.imagePaths.maxItems).toBe(10);
    expect(musicTool.description).toContain('audio/video reference files are not accepted');
    expect(musicTool.description).toContain('44.1 kHz');
    expect(musicTool.description).toContain('one clip per prompt');
    expect(musicTool.description).toContain('Vertex AI mode supports 44.1 kHz, 192 kbps audio/mp3 output only');
    expect(musicTool.inputSchema.properties.imagePaths.description).toContain('WEBP');
    expect(musicTool.inputSchema.properties.lyrics).toBeDefined();
    expect(musicTool.inputSchema.properties.instrumental).toBeDefined();
    expect(musicTool.inputSchema.properties.language.enum).toContain('Korean');
    expect(musicTool.inputSchema.properties.durationSeconds.maximum).toBe(184);
    expect(musicTool.inputSchema.properties.bpm).toBeDefined();
    expect(musicTool.inputSchema.properties.intensity.enum).toContain('medium');

    await callHandler({
      params: {
        name: 'generate_music',
        arguments: { prompt: 'short folk loop', model: 'lyria-3-clip-preview' },
      },
    });

    expect(mockMusicGenHandle).toHaveBeenCalledWith({
      prompt: 'short folk loop',
      model: 'lyria-3-clip-preview',
    });
  });

  it('uses Gemini API music output schema when Vertex mode is disabled', async () => {
    const aiStudioServer = new GeminiAIMCPServer(createTestConfig({ useVertexAI: false }));
    const handlers = getHandlers((aiStudioServer as any).server);
    const result = await handlers.listHandler();
    const musicTool = result.tools.find((t: any) => t.name === 'generate_music');

    expect(musicTool.inputSchema.properties.outputMimeType.enum).toEqual([
      'audio/mp3',
      'audio/wav',
    ]);
    expect(musicTool.description).toContain('Gemini API/AI Studio mode supports 44.1 kHz stereo audio/mp3 output');

    await handlers.callHandler({
      params: {
        name: 'generate_music',
        arguments: {
          prompt: 'full ambient song',
          model: 'lyria-3-pro-preview',
          outputMimeType: 'audio/wav',
        },
      },
    });

    expect(mockMusicGenHandle).toHaveBeenCalledWith({
      prompt: 'full ambient song',
      model: 'lyria-3-pro-preview',
      outputMimeType: 'audio/wav',
    });

    const invalidResult = await handlers.callHandler({
      params: {
        name: 'generate_music',
        arguments: {
          prompt: 'short loop',
          outputMimeType: 'audio/wav',
        },
      },
    });
    const errorBody = JSON.parse(invalidResult.content[0].text);

    expect(invalidResult.isError).toBe(true);
    expect(errorBody.tool).toBe('generate_music');
    expect(errorBody.errorType).toBe('validation_error');
    expect(errorBody.issues[0].message).toMatch(/lyria-3-pro-preview/);
  });

  it('reference_search tool is exposed and routed to ReferenceSearchHandler', async () => {
    const result = await listHandler();
    const refTool = result.tools.find((t: any) => t.name === 'reference_search');

    expect(refTool).toBeDefined();
    expect(refTool.inputSchema.required).toContain('prompt');
    expect(refTool.inputSchema.properties.excludeDomains.maxItems).toBe(2000);
    expect(refTool.inputSchema.properties.blockingConfidence.enum).toEqual(['low', 'medium', 'high']);
    expect(refTool.inputSchema.properties.timeRange.required).toEqual(['startTime', 'endTime']);
    expect(refTool.inputSchema.properties.urls.maxItems).toBe(20);
    expect(refTool.inputSchema.properties.includeImages.type).toBe('boolean');
    expect(refTool.inputSchema.properties.thinkingLevel.enum).toContain('high');
    expect(refTool.description).toContain('citations');
    expect(refTool.description).toContain('searchSuggestionsHtml');

    await callHandler({
      params: {
        name: 'reference_search',
        arguments: { prompt: 'when did Gemini 3 launch?', excludeDomains: ['reddit.com'] },
      },
    });

    expect(mockReferenceSearchHandle).toHaveBeenCalledWith({
      prompt: 'when did Gemini 3 launch?',
      excludeDomains: ['reddit.com'],
    });
  });

  it('rejects Vertex-only reference_search tuning on the Google AI Studio backend', async () => {
    const aiStudioServer = new GeminiAIMCPServer(createTestConfig({ useVertexAI: false }));
    const handlers = getHandlers((aiStudioServer as any).server);

    const invalidResult = await handlers.callHandler({
      params: {
        name: 'reference_search',
        arguments: { prompt: 'recent news', excludeDomains: ['reddit.com'] },
      },
    });
    const errorBody = JSON.parse(invalidResult.content[0].text);

    expect(invalidResult.isError).toBe(true);
    expect(errorBody.tool).toBe('reference_search');
    expect(errorBody.errorType).toBe('validation_error');
    expect(errorBody.issues[0].message).toMatch(/Vertex AI backend only/);
  });

  it('returns structured error content for handler failures', async () => {
    mockImageGenHandle.mockRejectedValueOnce(new Error('Gemini API unavailable'));

    const result = await callHandler({
      params: {
        name: 'generate_image',
        arguments: { prompt: 'a cat' },
      },
    });

    const errorBody = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(errorBody).toEqual({
      status: 'failed',
      tool: 'generate_image',
      errorType: 'runtime_error',
      message: 'Gemini API unavailable',
    });
  });

  it('returns structured validation errors for invalid arguments', async () => {
    const result = await callHandler({
      params: {
        name: 'generate_image',
        arguments: { prompt: 'a cat', imageSize: '0.5K' },
      },
    });

    const errorBody = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(errorBody.status).toBe('failed');
    expect(errorBody.tool).toBe('generate_image');
    expect(errorBody.errorType).toBe('validation_error');
    expect(errorBody.issues).toEqual([
      {
        path: '(root)',
        code: 'custom',
        message: "imageSize '0.5K' requires model='gemini-3.1-flash-image'",
      },
    ]);
  });

  it('returns structured error content for unknown tool names', async () => {
    const request = {
      params: {
        name: 'nonexistent_tool',
        arguments: {},
      },
    };

    const result = await callHandler(request);
    const errorBody = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(errorBody).toEqual({
      status: 'failed',
      tool: 'nonexistent_tool',
      errorType: 'runtime_error',
      message: 'Unknown tool: nonexistent_tool',
    });
  });
});
