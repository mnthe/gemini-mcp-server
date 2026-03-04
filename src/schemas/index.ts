/**
 * Zod validation schemas for tool inputs
 */

import { z } from "zod";

// Schema for inline data (base64 encoded files)
const InlineDataSchema = z.object({
  mimeType: z.string().describe("MIME type of the file (e.g., 'image/jpeg', 'audio/mp3', 'video/mp4')"),
  data: z.string().describe("Base64 encoded file data"),
});

// Schema for file data (Cloud Storage URIs)
const FileDataSchema = z.object({
  mimeType: z.string().describe("MIME type of the file"),
  fileUri: z.string().describe("URI of the file (gs:// for Cloud Storage or https:// for public URLs)"),
});

// Schema for a single multimodal part
const MultimodalPartSchema = z.object({
  text: z.string().optional().describe("Text content"),
  inlineData: InlineDataSchema.optional().describe("Inline base64 encoded file data"),
  fileData: FileDataSchema.optional().describe("File URI for Cloud Storage or public URLs"),
});

export const QuerySchema = z.object({
  prompt: z.string().describe("The text prompt to send to Vertex AI"),
  sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
  model: z.string().optional().describe("Optional model override (e.g., gemini-3-flash-preview, gemini-3.1-pro-preview)"),
  parts: z.array(MultimodalPartSchema).optional().describe("Optional multimodal content parts (images, audio, video, documents)"),
});

export const SearchSchema = z.object({
  query: z.string().describe("The search query"),
});

export const FetchSchema = z.object({
  id: z.string().describe("The unique identifier for the document to fetch"),
});

const ALLOWED_IMAGE_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
] as const;

export const ImageGenerationSchema = z.object({
  prompt: z.string().describe("Image generation prompt"),
  model: z.enum(ALLOWED_IMAGE_MODELS).optional()
    .describe("Image model (default: gemini-3-pro-image-preview)"),
  aspectRatio: z.enum([
    '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'
  ]).optional().describe("Aspect ratio (default: 1:1)"),
  imageSize: z.enum(['1K', '2K', '4K']).optional()
    .describe("Resolution (4K requires gemini-3-pro-image-preview or gemini-3.1-flash-image-preview, default: 1K)"),
  imagePaths: z.array(z.string()).optional()
    .describe("Local file paths of reference images to include as input (e.g., for image editing or style transfer)"),
});

const ALLOWED_VIDEO_MODELS = [
  'veo-3.1-fast-generate-001',
  'veo-3.1-generate-preview',
] as const;

export const VideoGenerationSchema = z.object({
  prompt: z.string().describe("Video generation prompt"),
  model: z.enum(ALLOWED_VIDEO_MODELS).optional()
    .describe("Video model (default: veo-3.1-fast-generate-001)"),
  aspectRatio: z.enum(['16:9', '9:16']).optional()
    .describe("Aspect ratio (default: 16:9)"),
  durationSeconds: z.enum(['4', '6', '8']).optional()
    .describe("Duration in seconds (1080p/4k requires '8')"),
  resolution: z.enum(['720p', '1080p', '4k']).optional()
    .describe("Video resolution (1080p/4k requires durationSeconds='8')"),
  generateAudio: z.boolean().optional()
    .describe("Whether to generate audio"),
  negativePrompt: z.string().optional()
    .describe("Negative prompt for generation"),
  seed: z.number().optional()
    .describe("Random seed for reproducibility"),
  numberOfVideos: z.number().optional()
    .describe("Number of videos to generate"),
  imagePath: z.string().optional()
    .describe("Local file path of reference image (first frame)"),
  lastFramePath: z.string().optional()
    .describe("Local file path of reference image (last frame, requires imagePath)"),
  referenceImagePaths: z.array(z.string()).optional()
    .describe("Local file paths of reference images (max 3)"),
}).refine(
  (data) => {
    if (data.resolution === '1080p' || data.resolution === '4k') {
      return data.durationSeconds === '8';
    }
    return true;
  },
  { message: "resolution '1080p' or '4k' requires durationSeconds='8'" }
).refine(
  (data) => {
    if (data.lastFramePath) {
      return !!data.imagePath;
    }
    return true;
  },
  { message: "lastFramePath requires imagePath" }
).refine(
  (data) => {
    if (data.referenceImagePaths) {
      return data.referenceImagePaths.length <= 3;
    }
    return true;
  },
  { message: "referenceImagePaths must have at most 3 items" }
);

export type QueryInput = z.infer<typeof QuerySchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FetchInput = z.infer<typeof FetchSchema>;
export type ImageGenerationInput = z.infer<typeof ImageGenerationSchema>;
export type VideoGenerationInput = z.infer<typeof VideoGenerationSchema>;
