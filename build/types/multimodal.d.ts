/**
 * Multimodal content types for Gemini AI
 * Supports images, audio, video, and code files
 */
/**
 * Inline data for small files (base64 encoded)
 */
export interface InlineData {
    mimeType: string;
    data: string;
}
/**
 * File data for large files (Cloud Storage URIs)
 */
export interface FileData {
    mimeType: string;
    fileUri: string;
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
export declare const SUPPORTED_IMAGE_TYPES: readonly ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
export declare const SUPPORTED_VIDEO_TYPES: readonly ["video/mp4", "video/mpeg", "video/mov", "video/avi", "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp"];
export declare const SUPPORTED_AUDIO_TYPES: readonly ["audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac"];
export declare const SUPPORTED_DOCUMENT_TYPES: readonly ["application/pdf", "text/plain", "text/html", "text/css", "text/javascript", "application/x-javascript", "text/x-typescript", "application/x-typescript", "text/csv", "text/markdown", "text/x-python", "application/x-python-code", "application/json", "text/xml", "application/rtf"];
export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];
export type SupportedVideoType = typeof SUPPORTED_VIDEO_TYPES[number];
export type SupportedAudioType = typeof SUPPORTED_AUDIO_TYPES[number];
export type SupportedDocumentType = typeof SUPPORTED_DOCUMENT_TYPES[number];
export type SupportedMimeType = SupportedImageType | SupportedVideoType | SupportedAudioType | SupportedDocumentType;
/**
 * Check if a MIME type is supported
 */
export declare function isSupportedMimeType(mimeType: string): boolean;
/**
 * Get media type category from MIME type
 */
export declare function getMediaTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'unknown';
//# sourceMappingURL=multimodal.d.ts.map