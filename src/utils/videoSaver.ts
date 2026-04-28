import {
  getDefaultGeneratedDir,
  saveBufferFile,
  generateTimestampedFilename,
} from './generatedFileSaver.js';

export function getDefaultVideoDir(): string {
  return getDefaultGeneratedDir('video');
}

export function saveVideo(data: Buffer, outputDir: string, filename: string): string {
  return saveBufferFile(data, outputDir, filename);
}

export function generateVideoFilename(index: number): string {
  return generateTimestampedFilename('vid', index, 'mp4');
}
