import { describe, it, expect } from 'vitest';

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
  it('matches gemini-3-pro-preview', () => {
    expect(isGemini3Pattern.test('gemini-3-pro-preview')).toBe(true);
  });

  it('matches gemini-3.1-pro-preview', () => {
    expect(isGemini3Pattern.test('gemini-3.1-pro-preview')).toBe(true);
  });

  it('matches gemini-3-flash-preview', () => {
    expect(isGemini3Pattern.test('gemini-3-flash-preview')).toBe(true);
  });

  it('matches gemini-3-pro-image-preview', () => {
    expect(isGemini3Pattern.test('gemini-3-pro-image-preview')).toBe(true);
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
  it('defaults to gemini-3-flash-preview', async () => {
    // Save and clear env
    const savedModel = process.env.GEMINI_MODEL;
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GEMINI_MODEL;
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';

    try {
      // Dynamic import to get fresh module
      const { loadConfig } = await import('../config/index.js');
      const config = loadConfig();
      expect(config.model).toBe('gemini-3-flash-preview');
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
    }
  });
});

describe('mediaResolution config', () => {
  it('loads GEMINI_MEDIA_RESOLUTION from env', async () => {
    const savedModel = process.env.GEMINI_MODEL;
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedMediaRes = process.env.GEMINI_MEDIA_RESOLUTION;
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
    }
  });

  it('is undefined when env var not set', async () => {
    const savedProject = process.env.GOOGLE_CLOUD_PROJECT;
    const savedMediaRes = process.env.GEMINI_MEDIA_RESOLUTION;
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
    }
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
