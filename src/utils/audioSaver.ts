import {
  getDefaultGeneratedDir,
  getExtensionForMimeType,
  saveBufferFile,
  generateTimestampedFilename,
} from './generatedFileSaver.js';

export interface WavOptions {
  channels?: number;
  sampleRate?: number;
  sampleWidthBytes?: number;
}

export function getDefaultSpeechDir(): string {
  return getDefaultGeneratedDir('speech');
}

export function getDefaultMusicDir(): string {
  return getDefaultGeneratedDir('music');
}

export function saveAudio(data: Buffer, outputDir: string, filename: string): string {
  return saveBufferFile(data, outputDir, filename);
}

export function generateSpeechFilename(index: number, mimeType: string): string {
  return generateTimestampedFilename(
    'speech',
    index,
    getExtensionForMimeType(mimeType, 'wav')
  );
}

export function generateMusicFilename(index: number, mimeType: string): string {
  return generateTimestampedFilename(
    'music',
    index,
    getExtensionForMimeType(mimeType, 'mp3')
  );
}

export function pcmToWav(
  pcmData: Buffer,
  options: WavOptions = {}
): Buffer {
  const channels = options.channels || 1;
  const sampleRate = options.sampleRate || 24000;
  const sampleWidthBytes = options.sampleWidthBytes || 2;
  const bitsPerSample = sampleWidthBytes * 8;
  const byteRate = sampleRate * channels * sampleWidthBytes;
  const blockAlign = channels * sampleWidthBytes;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

export function isWavMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return normalized === 'audio/wav' || normalized === 'audio/wave' || normalized === 'audio/x-wav';
}
