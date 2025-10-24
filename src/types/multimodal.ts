/**
 * Multimodal content types for Gemini AI
 * Supports images, audio, video, and code files
 */

/**
 * Inline data for small files (base64 encoded)
 */
export interface InlineData {
  mimeType: string;
  data: string; // base64 encoded
}

/**
 * File data for large files (Cloud Storage URIs)
 */
export interface FileData {
  mimeType: string;
  fileUri: string; // gs:// or https:// URI
}

/**
 * A part of multimodal content
 */
export interface MultimodalPart {
  text?: string;
  inlineData?: InlineData;
  fileData?: FileData;
}

/**
 * Input for multimodal query
 */
export interface MultimodalContent {
  text?: string;
  parts?: MultimodalPart[];
}

/**
 * Supported MIME types for different media
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp',
] as const;

export const SUPPORTED_AUDIO_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
] as const;

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'application/x-javascript',
  'text/x-typescript',
  'application/x-typescript',
  'text/csv',
  'text/markdown',
  'text/x-python',
  'application/x-python-code',
  'application/json',
  'text/xml',
  'application/rtf',
] as const;

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];
export type SupportedVideoType = typeof SUPPORTED_VIDEO_TYPES[number];
export type SupportedAudioType = typeof SUPPORTED_AUDIO_TYPES[number];
export type SupportedDocumentType = typeof SUPPORTED_DOCUMENT_TYPES[number];
export type SupportedMimeType = SupportedImageType | SupportedVideoType | SupportedAudioType | SupportedDocumentType;

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return (
    SUPPORTED_IMAGE_TYPES.includes(mimeType as any) ||
    SUPPORTED_VIDEO_TYPES.includes(mimeType as any) ||
    SUPPORTED_AUDIO_TYPES.includes(mimeType as any) ||
    SUPPORTED_DOCUMENT_TYPES.includes(mimeType as any)
  );
}

/**
 * Get media type category from MIME type
 */
export function getMediaTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType as any)) return 'image';
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType as any)) return 'video';
  if (SUPPORTED_AUDIO_TYPES.includes(mimeType as any)) return 'audio';
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType as any)) return 'document';
  return 'unknown';
}
