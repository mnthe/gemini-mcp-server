import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { getDefaultGeneratedDir, getExtensionForMimeType } from './generatedFileSaver.js';
import { pcmToWav } from './audioSaver.js';

describe('getDefaultGeneratedDir', () => {
  it('uses Windows media folders with gemini-generated subdirectories', () => {
    const home = 'C:\\Users\\mcp';

    expect(getDefaultGeneratedDir('image', { platform: 'win32', homeDir: home }))
      .toBe(path.win32.join(home, 'Pictures', 'gemini-generated'));
    expect(getDefaultGeneratedDir('video', { platform: 'win32', homeDir: home }))
      .toBe(path.win32.join(home, 'Videos', 'gemini-generated'));
    expect(getDefaultGeneratedDir('speech', { platform: 'win32', homeDir: home }))
      .toBe(path.win32.join(home, 'Music', 'gemini-generated', 'speech'));
    expect(getDefaultGeneratedDir('music', { platform: 'win32', homeDir: home }))
      .toBe(path.win32.join(home, 'Music', 'gemini-generated', 'music'));
  });

  it('uses macOS media folders with gemini-generated subdirectories', () => {
    const home = '/Users/mcp';

    expect(getDefaultGeneratedDir('image', { platform: 'darwin', homeDir: home }))
      .toBe(path.posix.join(home, 'Pictures', 'gemini-generated'));
    expect(getDefaultGeneratedDir('video', { platform: 'darwin', homeDir: home }))
      .toBe(path.posix.join(home, 'Movies', 'gemini-generated'));
    expect(getDefaultGeneratedDir('speech', { platform: 'darwin', homeDir: home }))
      .toBe(path.posix.join(home, 'Music', 'gemini-generated', 'speech'));
    expect(getDefaultGeneratedDir('music', { platform: 'darwin', homeDir: home }))
      .toBe(path.posix.join(home, 'Music', 'gemini-generated', 'music'));
  });
});

describe('generated file helpers', () => {
  it('maps audio MIME types to stable extensions', () => {
    expect(getExtensionForMimeType('audio/mpeg', 'bin')).toBe('mp3');
    expect(getExtensionForMimeType('audio/wav', 'bin')).toBe('wav');
    expect(getExtensionForMimeType('audio/L16;codec=pcm;rate=24000', 'bin')).toBe('pcm');
  });

  it('wraps PCM data in a valid WAV header', () => {
    const wav = pcmToWav(Buffer.from([0, 1, 2, 3]), { sampleRate: 24000 });

    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.readUInt32LE(40)).toBe(4);
    expect(wav.length).toBe(48);
  });
});
