import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type GeneratedFileKind = 'image' | 'video' | 'speech' | 'music';

interface DefaultDirOptions {
  platform?: NodeJS.Platform;
  homeDir?: string;
}

function getPathModule(platform: NodeJS.Platform): path.PlatformPath {
  return platform === 'win32' ? path.win32 : path.posix;
}

export interface OutputDirsConfig {
  imageOutputDir?: string;
  videoOutputDir?: string;
  speechOutputDir?: string;
  musicOutputDir?: string;
}

export function resolveOutputDirs(
  config: OutputDirsConfig = {},
  options: DefaultDirOptions = {}
): { image: string; video: string; speech: string; music: string } {
  return {
    image: config.imageOutputDir || getDefaultGeneratedDir('image', options),
    video: config.videoOutputDir || getDefaultGeneratedDir('video', options),
    speech: config.speechOutputDir || getDefaultGeneratedDir('speech', options),
    music: config.musicOutputDir || getDefaultGeneratedDir('music', options),
  };
}

export function getDefaultGeneratedDir(
  kind: GeneratedFileKind,
  options: DefaultDirOptions = {}
): string {
  const platform = options.platform || process.platform;
  const home = options.homeDir || os.homedir();
  const pathModule = getPathModule(platform);

  switch (kind) {
    case 'image':
      if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
        return pathModule.join(home, 'Pictures', 'gemini-generated');
      }
      return pathModule.join(home, 'gemini-generated');

    case 'video':
      if (platform === 'darwin') {
        return pathModule.join(home, 'Movies', 'gemini-generated');
      }
      if (platform === 'win32' || platform === 'linux') {
        return pathModule.join(home, 'Videos', 'gemini-generated');
      }
      return pathModule.join(home, 'gemini-generated');

    case 'speech':
      if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
        return pathModule.join(home, 'Music', 'gemini-generated', 'speech');
      }
      return pathModule.join(home, 'gemini-generated', 'speech');

    case 'music':
      if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
        return pathModule.join(home, 'Music', 'gemini-generated', 'music');
      }
      return pathModule.join(home, 'gemini-generated', 'music');
  }
}

export function saveBufferFile(data: Buffer, outputDir: string, filename: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, data);
  return filePath;
}

export function saveBase64File(base64Data: string, outputDir: string, filename: string): string {
  return saveBufferFile(Buffer.from(base64Data, 'base64'), outputDir, filename);
}

export function generateTimestampedFilename(
  prefix: string,
  index: number,
  extension: string
): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const normalizedExtension = extension.replace(/^\./, '');
  return `${prefix}-${timestamp}-${String(index).padStart(3, '0')}.${normalizedExtension}`;
}

export function getExtensionForMimeType(mimeType: string, fallback: string): string {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/pcm': 'pcm',
    'audio/l16': 'pcm',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
  };
  return map[normalized] || fallback;
}
