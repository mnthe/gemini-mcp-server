import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GeminiAIService } from './GeminiAIService.js';

function createService(model = 'gemini-3.8-flash') {
  return new GeminiAIService({
    apiKey: 'test-api-key',
    useVertexAI: false,
    defaultBackend: 'ai-studio',
    availableBackends: ['ai-studio'],
    model,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxTokens: 8192,
    enableConversations: false,
    sessionTimeout: 3600000,
    maxHistory: 100,
    enableReasoning: false,
    maxReasoningSteps: 5,
    disableLogging: true,
    logToStderr: false,
    allowFileUris: false,
  });
}

function mockApi(response: unknown) {
  const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe('new model SDK request serialization', () => {
  it.each(['gemini-3.8-flash', 'gemini-3.7-flash'])(
    'sends supported query and grounding configs to %s', async (model) => {
      const fetch = mockApi({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
      const service = createService(model);
      expect(await service.query('hello', { enableThinking: true, thinkingLevel: 'low' })).toBe('ok');
      expect((await service.referenceSearch('latest news', { thinkingLevel: 'medium' })).text).toBe('ok');
      for (const [url, init] of fetch.mock.calls) {
        expect(String(url)).toContain(`/models/${model}:generateContent`);
        const config = JSON.parse(init.body).generationConfig;
        expect(config).not.toHaveProperty('temperature');
        expect(config).not.toHaveProperty('topP');
        expect(config).not.toHaveProperty('topK');
        expect(config.thinkingConfig).not.toHaveProperty('thinkingBudget');
      }
      expect(JSON.parse(fetch.mock.calls[1][1].body).tools).toEqual([{ googleSearch: {} }]);
    }
  );

  it.each(['gemini-3.8-flash', 'gemini-3.7-flash'])(
    'rejects minimal thinking for grounding with %s without network access', async (model) => {
      const fetch = mockApi({});
      await expect(createService(model).referenceSearch('news', { thinkingLevel: 'MINIMAL' }))
        .rejects.toThrow(/minimal.*not supported/);
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(['audio/mp3', 'audio/wav'])(
    'preserves Lyria 3.5 %s format, prompt controls, audio and lyrics through the SDK', async (mimeType) => {
      const fetch = mockApi({
        id: 'music-1', status: 'completed',
        steps: [{ type: 'model_output', content: [
          { type: 'text', text: 'song lyrics' },
          { type: 'audio', data: Buffer.from('music').toString('base64'), mime_type: mimeType },
        ] }],
      });
      const result = await createService().generateMusic('a piano song', {
        model: 'lyria-3.5', outputMimeType: mimeType, durationSeconds: 120, lyrics: 'Hello world',
      });
      const request = fetch.mock.calls[0][0] as Request;
      expect(request.url).toContain('/interactions');
      const body = await request.json();
      expect(body.model).toBe('lyria-3.5');
      expect(body.response_format).toEqual({ type: 'audio', mime_type: mimeType, delivery: 'inline' });
      expect(body.input).toContain('Target duration: 120 seconds.');
      expect(body.input).toContain('Hello world');
      expect(result.audios[0].data.toString()).toBe('music');
      expect(result.audios[0].mimeType).toBe(mimeType);
      expect(result.text).toContain('song lyrics');
    }
  );

  it('rejects an empty Lyria 3.5 result', async () => {
    mockApi({ id: 'music-empty', status: 'failed', steps: [] });
    await expect(createService().generateMusic('song', { model: 'lyria-3.5' })).rejects.toThrow(/no audio/);
  });

  it('serializes image-guided Lyria 3.5 input and rejects missing files before the API call', async () => {
    const fetch = mockApi({ id: 'music-image', status: 'completed', steps: [{ type: 'model_output', content: [
      { type: 'audio', data: Buffer.from('music').toString('base64'), mime_type: 'audio/mp3' },
    ] }] });
    const dir = mkdtempSync(join(tmpdir(), 'gemini-lyria-test-'));
    const imagePath = join(dir, 'scene.png');
    const image = Buffer.from('test-image');
    writeFileSync(imagePath, image);
    await createService().generateMusic('music for this scene', { model: 'lyria-3.5', imagePaths: [imagePath] });
    const body = await (fetch.mock.calls[0][0] as Request).json();
    expect(body.input).toEqual([
      { type: 'text', text: 'music for this scene' },
      { type: 'image', data: image.toString('base64'), mime_type: 'image/png' },
    ]);
    fetch.mockClear();
    await expect(createService().generateMusic('song', { model: 'lyria-3.5', imagePaths: [join(dir, 'missing.png')] }))
      .rejects.toThrow(/ENOENT/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects Lyria 3.5 on Vertex before calling the API', async () => {
    const fetch = mockApi({});
    await expect(createService().generateMusic('song', { model: 'lyria-3.5', backend: 'vertex' }))
      .rejects.toThrow(/Google AI Studio/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the legacy music generation endpoint and default', async () => {
    const fetch = mockApi({ candidates: [{ content: { parts: [
      { inlineData: { data: Buffer.from('clip').toString('base64'), mimeType: 'audio/mp3' } },
    ] } }] });
    const result = await createService().generateMusic('short loop');
    expect(String(fetch.mock.calls[0][0])).toContain('/models/lyria-3-clip-preview:generateContent');
    expect(result.audios[0].data.toString()).toBe('clip');
  });

  it('serializes Omni 1.1 resolution and conversation ID and decodes the video', async () => {
    const fetch = mockApi({
      id: 'video-2', status: 'completed', steps: [{ type: 'model_output', content: [
        { type: 'video', data: Buffer.from('video').toString('base64'), mime_type: 'video/mp4' },
      ] }],
    });
    const result = await createService().generateOmniVideo('make it sunny', {
      resolution: '1080p', aspectRatio: '9:16', previousInteractionId: 'video-1',
    });
    const body = await (fetch.mock.calls[0][0] as Request).json();
    expect(body.model).toBe('gemini-omni-1.1-flash');
    expect(body.response_format).toEqual({ type: 'video', aspect_ratio: '9:16', resolution: '1080p' });
    expect(body.previous_interaction_id).toBe('video-1');
    expect(result.video.data.toString()).toBe('video');
    expect(result.interactionId).toBe('video-2');
  });
});
