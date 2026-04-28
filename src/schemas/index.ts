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
  model: z.string().optional().describe("Optional model override (e.g., gemini-3-flash-preview, gemini-3.1-pro-preview, gemini-3.1-flash-lite-preview, gemini-3.1-pro-preview-customtools)"),
  thinkingLevel: z.enum(['minimal', 'low', 'medium', 'high', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH']).optional()
    .describe("Optional Gemini 3 thinking level override"),
  mediaResolution: z.enum(['low', 'medium', 'high', 'LOW', 'MEDIUM', 'HIGH']).optional()
    .describe("Optional global media resolution for multimodal inputs"),
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
  'gemini-2.5-flash-image',
] as const;

const ALLOWED_IMAGE_ASPECT_RATIOS = [
  '1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'
] as const;

const FLASH_IMAGE_ONLY_ASPECT_RATIOS: readonly string[] = ['1:4', '1:8', '4:1', '8:1'];

export const ImageGenerationSchema = z.object({
  prompt: z.string().describe("Image generation prompt"),
  model: z.enum(ALLOWED_IMAGE_MODELS).optional()
    .describe("Image model (default: gemini-3-pro-image-preview)"),
  aspectRatio: z.enum(ALLOWED_IMAGE_ASPECT_RATIOS).optional()
    .describe("Aspect ratio (default: 1:1; 1:4, 1:8, 4:1, and 8:1 require gemini-3.1-flash-image-preview)"),
  imageSize: z.enum(['0.5K', '1K', '2K', '4K']).optional()
    .describe("Resolution (0.5K requires gemini-3.1-flash-image-preview, default: 1K)"),
  imagePaths: z.array(z.string()).max(14).optional()
    .describe("Local file paths of reference images to include as input (max 14; e.g., for image editing or style transfer)"),
  systemInstruction: z.string().optional()
    .describe("Optional system instruction for Gemini 3 image models"),
  thinkingLevel: z.enum(['minimal', 'low', 'medium', 'high', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH']).optional()
    .describe("Optional thinking level; only supported by gemini-3.1-flash-image-preview"),
  mediaResolution: z.enum(['low', 'medium', 'high', 'LOW', 'MEDIUM', 'HIGH']).optional()
    .describe("Optional media resolution for reference image inputs"),
}).refine(
  (data) => {
    if (!data.aspectRatio) {
      return true;
    }
    return data.model === 'gemini-3.1-flash-image-preview' ||
      !FLASH_IMAGE_ONLY_ASPECT_RATIOS.includes(data.aspectRatio);
  },
  { message: "aspectRatio 1:4, 1:8, 4:1, and 8:1 require model='gemini-3.1-flash-image-preview'" }
).refine(
  (data) => {
    return data.imageSize !== '0.5K' || data.model === 'gemini-3.1-flash-image-preview';
  },
  { message: "imageSize '0.5K' requires model='gemini-3.1-flash-image-preview'" }
).refine(
  (data) => {
    return data.model !== 'gemini-2.5-flash-image' || data.imageSize === undefined;
  },
  { message: "imageSize is not supported by model='gemini-2.5-flash-image'; omit imageSize for its 1K output" }
).refine(
  (data) => {
    return !data.thinkingLevel || data.model === 'gemini-3.1-flash-image-preview';
  },
  { message: "thinkingLevel is only supported by model='gemini-3.1-flash-image-preview'" }
);

const ALLOWED_VIDEO_MODELS = [
  'veo-3.1-fast-generate-001',
  'veo-3.1-generate-001',
  'veo-3.1-lite-generate-001',
] as const;

const ALLOWED_SPEECH_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
] as const;

const SpeechSpeakerSchema = z.object({
  speaker: z.string().min(1).describe("Speaker name exactly as it appears in the prompt"),
  voiceName: z.string().min(1).describe("Prebuilt voice name for this speaker"),
});

export const SpeechGenerationSchema = z.object({
  prompt: z.string().describe("Text or transcript to synthesize as speech"),
  model: z.enum(ALLOWED_SPEECH_MODELS).optional()
    .describe("Speech model (default: gemini-3.1-flash-tts-preview)"),
  voiceName: z.string().min(1).optional()
    .describe("Prebuilt voice name for single-speaker TTS (default: Kore)"),
  languageCode: z.string().min(2).optional()
    .describe("Optional BCP-47 language code for speech synthesis"),
  speakers: z.array(SpeechSpeakerSchema).length(2).optional()
    .describe("Exactly two speaker voice configs for multi-speaker TTS"),
}).refine(
  (data) => !data.voiceName || !data.speakers,
  { message: "voiceName cannot be used with speakers; set voiceName per speaker instead" }
);

const ALLOWED_MUSIC_MODELS = [
  'lyria-3-clip-preview',
  'lyria-3-pro-preview',
] as const;

export const MusicGenerationSchema = z.object({
  prompt: z.string().describe("Music generation prompt"),
  model: z.enum(ALLOWED_MUSIC_MODELS).optional()
    .describe("Music model (default: lyria-3-clip-preview)"),
  outputMimeType: z.enum(['audio/mp3', 'audio/wav']).optional()
    .describe("Optional output MIME type; audio/wav requires lyria-3-pro-preview"),
  imagePaths: z.array(z.string()).max(10).optional()
    .describe("Optional local image paths to use as multimodal music generation inputs (max 10)"),
  lyrics: z.string().optional()
    .describe("Optional user-provided lyrics to include in the Lyria prompt"),
  instrumental: z.boolean().optional()
    .describe("Whether to explicitly request instrumental-only output"),
  vocalStyle: z.string().optional()
    .describe("Optional vocal generation direction, such as vocal tone, language, or delivery style"),
  durationSeconds: z.number().int().min(1).max(184).optional()
    .describe("Optional target duration in seconds; requires lyria-3-pro-preview"),
  bpm: z.number().int().min(40).max(240).optional()
    .describe("Optional tempo direction in beats per minute"),
  intensity: z.enum(['low', 'medium', 'high', 'LOW', 'MEDIUM', 'HIGH']).optional()
    .describe("Optional musical intensity direction"),
}).refine(
  (data) => data.outputMimeType !== 'audio/wav' || data.model === 'lyria-3-pro-preview',
  { message: "outputMimeType 'audio/wav' requires model='lyria-3-pro-preview'" }
).refine(
  (data) => data.durationSeconds === undefined || data.model === 'lyria-3-pro-preview',
  { message: "durationSeconds requires model='lyria-3-pro-preview'" }
).refine(
  (data) => !data.instrumental || (!data.lyrics && !data.vocalStyle),
  { message: "instrumental cannot be combined with lyrics or vocalStyle" }
);

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
  enhancePrompt: z.boolean().optional()
    .describe("Whether to use Veo prompt rewriting/enhancement"),
  personGeneration: z.enum(['allow_adult', 'dont_allow']).optional()
    .describe("Optional person generation control"),
  negativePrompt: z.string().optional()
    .describe("Negative prompt for generation"),
  seed: z.number().int().min(0).max(4294967295).optional()
    .describe("Random seed for reproducibility (0-4294967295)"),
  numberOfVideos: z.number().int().min(1).max(4).optional()
    .describe("Number of videos to generate (1-4)"),
  imagePath: z.string().optional()
    .describe("Local file path of reference image (first frame)"),
  lastFramePath: z.string().optional()
    .describe("Local file path of reference image (last frame, requires imagePath)"),
  referenceImagePaths: z.array(z.string()).optional()
    .describe("Local file paths of reference images (max 3)"),
  videoPath: z.string().optional()
    .describe("Local file path of a Veo-generated 720p video to extend"),
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
).refine(
  (data) => {
    if (!data.referenceImagePaths?.length) {
      return true;
    }
    return data.model !== 'veo-3.1-lite-generate-001';
  },
  { message: "referenceImagePaths are not supported by model='veo-3.1-lite-generate-001'" }
).refine(
  (data) => {
    if (!data.videoPath) {
      return true;
    }
    return !data.imagePath && !data.lastFramePath && !data.referenceImagePaths?.length;
  },
  { message: "videoPath cannot be used with imagePath, lastFramePath, or referenceImagePaths" }
).refine(
  (data) => {
    if (!data.referenceImagePaths?.length) {
      return true;
    }
    return !data.imagePath && !data.lastFramePath && !data.videoPath;
  },
  { message: "referenceImagePaths cannot be used with imagePath, lastFramePath, or videoPath" }
).refine(
  (data) => {
    if (!data.videoPath || !data.resolution) {
      return true;
    }
    return data.resolution === '720p';
  },
  { message: "videoPath extension only supports resolution='720p'" }
).refine(
  (data) => !data.videoPath || !data.durationSeconds,
  { message: "durationSeconds cannot be used with videoPath; Veo extension adds 7 seconds" }
).refine(
  (data) => !data.videoPath || data.numberOfVideos === undefined || data.numberOfVideos === 1,
  { message: "videoPath extension returns a single video; omit numberOfVideos or set it to 1" }
).refine(
  (data) => data.model !== 'veo-3.1-lite-generate-001' || data.resolution !== '4k',
  { message: "resolution '4k' is not supported by model='veo-3.1-lite-generate-001'" }
);

export type QueryInput = z.infer<typeof QuerySchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FetchInput = z.infer<typeof FetchSchema>;
export type ImageGenerationInput = z.infer<typeof ImageGenerationSchema>;
export type SpeechGenerationInput = z.infer<typeof SpeechGenerationSchema>;
export type MusicGenerationInput = z.infer<typeof MusicGenerationSchema>;
export type VideoGenerationInput = z.infer<typeof VideoGenerationSchema>;

export const CheckVideoSchema = z.object({
  operationId: z.string().describe("Operation ID returned by generate_video"),
});

export type CheckVideoInput = z.infer<typeof CheckVideoSchema>;
