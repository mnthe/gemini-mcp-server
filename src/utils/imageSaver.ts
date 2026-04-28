import {
  getDefaultGeneratedDir,
  getExtensionForMimeType,
  saveBase64File,
  generateTimestampedFilename,
} from './generatedFileSaver.js';

export function getDefaultImageDir(): string {
  return getDefaultGeneratedDir('image');
}

export function saveImage(
  base64Data: string,
  outputDir: string,
  filename: string
): string {
  return saveBase64File(base64Data, outputDir, filename);
}

export function generateImageFilename(index: number, mimeType: string): string {
  return generateTimestampedFilename(
    'img',
    index,
    getExtensionForMimeType(mimeType, 'png')
  );
}
