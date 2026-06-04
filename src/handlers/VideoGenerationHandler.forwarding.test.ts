import { describe, it, expect, vi } from 'vitest';
import { VideoGenerationHandler } from './VideoGenerationHandler.js';

/**
 * Regression test: the handler must forward every parsed option to the
 * service. compressionQuality/resizeMode were initially dropped here, so the
 * tool advertised them while the service silently used defaults.
 */
describe('VideoGenerationHandler option forwarding', () => {
  function createHandler() {
    const generateVideo = vi.fn().mockResolvedValue({ operationId: 'op-1' });
    const handler = new VideoGenerationHandler(
      { generateVideo } as any,
      { videoOutputDir: '/tmp/videos' } as any
    );
    return { handler, generateVideo };
  }

  it('forwards compressionQuality and resizeMode to generateVideo', async () => {
    const { handler, generateVideo } = createHandler();

    await handler.handle({
      prompt: 'animate this frame',
      imagePath: '/tmp/frame.png',
      compressionQuality: 'lossless',
      resizeMode: 'crop',
    } as any);

    expect(generateVideo).toHaveBeenCalledTimes(1);
    const [prompt, options] = generateVideo.mock.calls[0];
    expect(prompt).toBe('animate this frame');
    expect(options.compressionQuality).toBe('lossless');
    expect(options.resizeMode).toBe('crop');
    expect(options.imagePath).toBe('/tmp/frame.png');
  });

  it('leaves the new fields undefined when not provided', async () => {
    const { handler, generateVideo } = createHandler();

    await handler.handle({ prompt: 'a dancing cat' } as any);

    const [, options] = generateVideo.mock.calls[0];
    expect(options.compressionQuality).toBeUndefined();
    expect(options.resizeMode).toBeUndefined();
  });
});
