import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function getDefaultImageDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':  return path.join(home, 'Pictures', 'gemini-generated');
    case 'win32':   return path.join(home, 'Pictures', 'gemini-generated');
    case 'linux':   return path.join(home, 'Pictures', 'gemini-generated');
    default:        return path.join(home, 'gemini-generated');
  }
}

export function saveImage(
  base64Data: string,
  outputDir: string,
  filename: string
): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function generateImageFilename(index: number, mimeType: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  return `img-${timestamp}-${String(index).padStart(3, '0')}.${ext}`;
}
