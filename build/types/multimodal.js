/**
 * Multimodal content types for Gemini AI
 * Supports images, audio, video, and code files
 */
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
];
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
];
export const SUPPORTED_AUDIO_TYPES = [
    'audio/wav',
    'audio/mp3',
    'audio/aiff',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
];
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
];
/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType) {
    return (SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
        SUPPORTED_VIDEO_TYPES.includes(mimeType) ||
        SUPPORTED_AUDIO_TYPES.includes(mimeType) ||
        SUPPORTED_DOCUMENT_TYPES.includes(mimeType));
}
/**
 * Get media type category from MIME type
 */
export function getMediaTypeCategory(mimeType) {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType))
        return 'image';
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType))
        return 'video';
    if (SUPPORTED_AUDIO_TYPES.includes(mimeType))
        return 'audio';
    if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType))
        return 'document';
    return 'unknown';
}
//# sourceMappingURL=multimodal.js.map