import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the server wiring for generate_video tool here,
// following the same pattern as GeminiAIMCPServer.test.ts.

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
    generateVideo = vi.fn();
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

vi.mock('../handlers/ImageGenerationHandler.js', () => ({
  ImageGenerationHandler: class {
    handle = vi.fn();
    getImageOutputDir = vi.fn().mockReturnValue('/tmp/images');
    constructor() {}
  },
}));

const mockVideoGenHandle = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
vi.mock('../handlers/VideoGenerationHandler.js', () => ({
  VideoGenerationHandler: class {
    handle = mockVideoGenHandle;
    getVideoOutputDir = vi.fn().mockReturnValue('/tmp/videos');
    constructor() {}
  },
}));

vi.mock('../utils/imageSaver.js', () => ({
  getDefaultImageDir: vi.fn().mockReturnValue('/tmp/images'),
  saveImage: vi.fn(),
  generateImageFilename: vi.fn(),
}));

vi.mock('../utils/videoSaver.js', () => ({
  getDefaultVideoDir: vi.fn().mockReturnValue('/tmp/videos'),
  saveVideo: vi.fn(),
  generateVideoFilename: vi.fn(),
}));

import { GeminiAIMCPServer } from '../server/GeminiAIMCPServer.js';

function createTestConfig() {
  return {
    model: 'gemini-2.5-pro',
    apiKey: 'test-key',
    sessionTimeout: 3600000,
    maxHistory: 100,
    enableConversations: false,
    maxIterations: 5,
    maxTokens: 8192,
    temperature: 0.7,
    systemPrompt: '',
    mcpServers: [],
    disableLogging: true,
  } as any;
}

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

describe('GeminiAIMCPServer generate_video wiring', () => {
  let mcpServer: GeminiAIMCPServer;
  let listHandler: Function;
  let callHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoGenHandle.mockClear();
    mcpServer = new GeminiAIMCPServer(createTestConfig());
    const internalServer = (mcpServer as any).server;
    const handlers = getHandlers(internalServer);
    listHandler = handlers.listHandler;
    callHandler = handlers.callHandler;
  });

  it('includes generate_video in tools/list', async () => {
    expect(listHandler).toBeDefined();

    const result = await listHandler();
    const toolNames = result.tools.map((t: any) => t.name);

    expect(toolNames).toContain('generate_video');
  });

  it('generate_video tool has correct inputSchema with required prompt', async () => {
    const result = await listHandler();
    const videoGenTool = result.tools.find((t: any) => t.name === 'generate_video');

    expect(videoGenTool).toBeDefined();
    expect(videoGenTool.inputSchema.required).toContain('prompt');
    expect(videoGenTool.inputSchema.properties.prompt).toBeDefined();
    expect(videoGenTool.inputSchema.properties.model).toBeDefined();
    expect(videoGenTool.inputSchema.properties.aspectRatio).toBeDefined();
    expect(videoGenTool.inputSchema.properties.durationSeconds).toBeDefined();
    expect(videoGenTool.inputSchema.properties.resolution).toBeDefined();
    expect(videoGenTool.inputSchema.properties.generateAudio).toBeDefined();
    expect(videoGenTool.inputSchema.properties.negativePrompt).toBeDefined();
    expect(videoGenTool.inputSchema.properties.seed).toBeDefined();
    expect(videoGenTool.inputSchema.properties.numberOfVideos).toBeDefined();
    expect(videoGenTool.inputSchema.properties.imagePath).toBeDefined();
    expect(videoGenTool.inputSchema.properties.lastFramePath).toBeDefined();
    expect(videoGenTool.inputSchema.properties.referenceImagePaths).toBeDefined();
  });

  it('routes generate_video call to VideoGenerationHandler', async () => {
    expect(callHandler).toBeDefined();

    const request = {
      params: {
        name: 'generate_video',
        arguments: { prompt: 'a dancing cat' },
      },
    };

    await callHandler(request);

    expect(mockVideoGenHandle).toHaveBeenCalledWith({ prompt: 'a dancing cat' });
  });
});
