import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getDefaultVideoDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':  return path.join(home, 'Movies', 'gemini-generated');
    default:        return path.join(home, 'Videos', 'gemini-generated');
  }
}

export function saveVideo(data: Buffer, outputDir: string, filename: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, data);
  return filePath;
}

export function generateVideoFilename(index: number): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `vid-${timestamp}-${String(index).padStart(3, '0')}.mp4`;
}
