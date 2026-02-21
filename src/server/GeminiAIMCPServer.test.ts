import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for generate_image tool wiring in GeminiAIMCPServer.
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
    constructor() {}
  },
}));

vi.mock('../utils/imageSaver.js', () => ({
  getDefaultImageDir: vi.fn().mockReturnValue('/tmp/images'),
  saveImage: vi.fn(),
  generateImageFilename: vi.fn(),
}));

import { GeminiAIMCPServer } from './GeminiAIMCPServer.js';

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

  it('throws for unknown tool names', async () => {
    const request = {
      params: {
        name: 'nonexistent_tool',
        arguments: {},
      },
    };

    await expect(callHandler(request)).rejects.toThrow('Unknown tool: nonexistent_tool');
  });
});
