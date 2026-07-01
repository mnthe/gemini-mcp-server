/**
 * Zod validation schemas for tool inputs
 */

import { z } from "zod";
import { Backend } from "../types/config.js";

export const GEMINI_IMAGE_INPUT_FILE_TYPES = 'PNG (.png), JPEG (.jpg/.jpeg), WEBP (.webp), HEIC (.heic), HEIF (.heif)';
export const VEO_IMAGE_INPUT_FILE_TYPES = 'PNG (.png), JPEG (.jpg/.jpeg), WEBP (.webp)';
export const VEO_EXTENSION_VIDEO_FILE_TYPES = 'MP4 (.mp4) from a previous Veo 720p generation';

const GEMINI_IMAGE_INPUT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif'] as const;
const VEO_IMAGE_INPUT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;
const VEO_EXTENSION_VIDEO_EXTENSIONS = ['.mp4'] as const;

function hasSupportedExtension(filePath: string, extensions: readonly string[]): boolean {
  const normalized = filePath.toLowerCase();
  return extensions.some((extension) => normalized.endsWith(extension));
}

const GeminiImageInputPathSchema = z.string().refine(
  (filePath) => hasSupportedExtension(filePath, GEMINI_IMAGE_INPUT_EXTENSIONS),
  { message: `Unsupported image source file type. Supported file types: ${GEMINI_IMAGE_INPUT_FILE_TYPES}` }
);

const VeoImageInputPathSchema = z.string().refine(
  (filePath) => hasSupportedExtension(filePath, VEO_IMAGE_INPUT_EXTENSIONS),
  { message: `Unsupported Veo image source file type. Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}` }
);

const VeoExtensionVideoPathSchema = z.string().refine(
  (filePath) => hasSupportedExtension(filePath, VEO_EXTENSION_VIDEO_EXTENSIONS),
  { message: `Unsupported video extension source file type. Supported file types: ${VEO_EXTENSION_VIDEO_FILE_TYPES}` }
);

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
  prompt: z.string().describe("The text prompt to send to the model"),
  sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
  model: z.string().optional().describe("Optional model override (e.g., gemini-3.5-flash, gemini-3.1-pro-preview, gemini-3.1-flash-lite, gemini-3.1-pro-preview-customtools)"),
  backend: z.enum(['vertex', 'ai-studio']).optional()
    .describe("Optional backend override ('vertex' | 'ai-studio'); defaults to the server's configured backend"),
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
  'gemini-3-pro-image',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite-image',
  'gemini-2.5-flash-image',
] as const;

const ALLOWED_IMAGE_ASPECT_RATIOS = [
  '1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'
] as const;

const FLASH_IMAGE_ONLY_ASPECT_RATIOS: readonly string[] = ['1:4', '1:8', '4:1', '8:1'];

export const ImageGenerationSchema = z.object({
  prompt: z.string().describe("Image generation prompt"),
  model: z.enum(ALLOWED_IMAGE_MODELS).optional()
    .describe("Image model (default: gemini-3-pro-image)"),
  backend: z.enum(['vertex', 'ai-studio']).optional()
    .describe("Optional backend override ('vertex' | 'ai-studio'); defaults to the server's configured backend"),
  aspectRatio: z.enum(ALLOWED_IMAGE_ASPECT_RATIOS).optional()
    .describe("Aspect ratio (default: 1:1; 1:4, 1:8, 4:1, and 8:1 require gemini-3.1-flash-image)"),
  imageSize: z.enum(['0.5K', '1K', '2K', '4K']).optional()
    .describe("Resolution (0.5K requires gemini-3.1-flash-image; gemini-3.1-flash-lite-image supports 1K only; default: 1K)"),
  imagePaths: z.array(GeminiImageInputPathSchema).max(14).optional()
    .describe(`Local file paths of reference images to include as input (max 14; e.g., for image editing or style transfer). Supported file types: ${GEMINI_IMAGE_INPUT_FILE_TYPES}. Audio/video files are not accepted.`),
  systemInstruction: z.string().optional()
    .describe("Optional system instruction for Gemini 3 image models"),
  thinkingLevel: z.enum(['minimal', 'high', 'MINIMAL', 'HIGH']).optional()
    .describe("Optional thinking level; only supported by gemini-3.1-flash-image"),
  mediaResolution: z.enum(['low', 'medium', 'high', 'LOW', 'MEDIUM', 'HIGH']).optional()
    .describe("Optional media resolution for reference image inputs"),
}).strict().refine(
  (data) => {
    if (!data.aspectRatio) {
      return true;
    }
    return data.model === 'gemini-3.1-flash-image' ||
      !FLASH_IMAGE_ONLY_ASPECT_RATIOS.includes(data.aspectRatio);
  },
  { message: "aspectRatio 1:4, 1:8, 4:1, and 8:1 require model='gemini-3.1-flash-image'" }
).refine(
  (data) => {
    return data.imageSize !== '0.5K' || data.model === 'gemini-3.1-flash-image';
  },
  { message: "imageSize '0.5K' requires model='gemini-3.1-flash-image'" }
).refine(
  (data) => {
    return data.model !== 'gemini-2.5-flash-image' || data.imageSize === undefined;
  },
  { message: "imageSize is not supported by model='gemini-2.5-flash-image'; omit imageSize for its 1K output" }
).refine(
  (data) => {
    return !data.thinkingLevel || data.model === 'gemini-3.1-flash-image';
  },
  { message: "thinkingLevel is only supported by model='gemini-3.1-flash-image'" }
).refine(
  (data) => {
    return data.model !== 'gemini-2.5-flash-image' || !data.imagePaths || data.imagePaths.length <= 3;
  },
  { message: "gemini-2.5-flash-image supports at most 3 reference images" }
).refine(
  (data) => {
    return data.model !== 'gemini-3.1-flash-lite-image' || data.imageSize === undefined || data.imageSize === '1K';
  },
  { message: "gemini-3.1-flash-lite-image supports imageSize='1K' only; omit imageSize for its default 1K output" }
);

const ALLOWED_VERTEX_VIDEO_MODELS = [
  'veo-3.1-fast-generate-001',
  'veo-3.1-generate-001',
  'veo-3.1-lite-generate-001',
] as const;

const ALLOWED_GEMINI_API_VIDEO_MODELS = [
  'veo-3.1-fast-generate-preview',
  'veo-3.1-generate-preview',
  'veo-3.1-lite-generate-preview',
] as const;

export function getAllowedVideoModels(useVertexAI: boolean): readonly string[] {
  return useVertexAI ? ALLOWED_VERTEX_VIDEO_MODELS : ALLOWED_GEMINI_API_VIDEO_MODELS;
}

export function getDefaultVideoModel(useVertexAI: boolean): string {
  return useVertexAI ? ALLOWED_VERTEX_VIDEO_MODELS[0] : ALLOWED_GEMINI_API_VIDEO_MODELS[0];
}

// gemini-3.1-flash-tts-preview uses the SAME id on both backends. The 2.5 TTS
// tiers differ by backend: Google AI Studio exposes '-preview-tts' preview ids,
// Vertex AI / Cloud Text-to-Speech exposes GA '-tts' ids.
const ALLOWED_VERTEX_SPEECH_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-tts',
  'gemini-2.5-pro-tts',
] as const;

const ALLOWED_GEMINI_API_SPEECH_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
] as const;

export function getAllowedSpeechModels(useVertexAI: boolean): readonly string[] {
  return useVertexAI ? ALLOWED_VERTEX_SPEECH_MODELS : ALLOWED_GEMINI_API_SPEECH_MODELS;
}

const SpeechSpeakerSchema = z.object({
  speaker: z.string().min(1).describe("Speaker name exactly as it appears in the prompt"),
  voiceName: z.string().min(1).describe("Prebuilt voice name for this speaker"),
}).strict();

export function buildSpeechGenerationSchema(
  useVertexAI: boolean = true,
  availableBackends: Backend[] = [useVertexAI ? 'vertex' : 'ai-studio'],
) {
  const defaultBackend: Backend = useVertexAI ? 'vertex' : 'ai-studio';
  const dual = availableBackends.length > 1;
  const allowedSpeechModels = (dual
    ? Array.from(new Set([...ALLOWED_VERTEX_SPEECH_MODELS, ...ALLOWED_GEMINI_API_SPEECH_MODELS]))
    : (useVertexAI ? ALLOWED_VERTEX_SPEECH_MODELS : ALLOWED_GEMINI_API_SPEECH_MODELS)
  ) as [string, ...string[]];
  const effBackend = (data: { backend?: Backend }): Backend => data.backend ?? defaultBackend;
  const modelsForBackend = (b: Backend): readonly string[] =>
    b === 'vertex' ? ALLOWED_VERTEX_SPEECH_MODELS : ALLOWED_GEMINI_API_SPEECH_MODELS;

  return z.object({
    prompt: z.string().describe("Text or transcript to synthesize as speech. Gemini TTS is text-only input; audio/image/video reference files are not accepted."),
    model: z.enum(allowedSpeechModels).optional()
      .describe("Speech model (default: gemini-3.1-flash-tts-preview, valid on both backends). The 2.5 tiers differ by backend: Vertex AI uses gemini-2.5-flash-tts/gemini-2.5-pro-tts; Google AI Studio uses gemini-2.5-flash-preview-tts/gemini-2.5-pro-preview-tts."),
    backend: z.enum(availableBackends as [Backend, ...Backend[]]).optional()
      .describe(`Backend for this request (default: ${defaultBackend}; available: ${availableBackends.join(', ')}). gemini-3.1-flash-tts-preview works on both; the 2.5 TTS ids differ per backend.`),
    voiceName: z.string().min(1).optional()
      .describe("Prebuilt voice name for single-speaker TTS (default: Kore)"),
    languageCode: z.string().min(2).optional()
      .describe("Optional BCP-47 language code for speech synthesis"),
    speakers: z.array(SpeechSpeakerSchema).length(2).optional()
      .describe("Exactly two speaker voice configs for multi-speaker TTS"),
  }).strict().refine(
    (data) => !data.model || modelsForBackend(effBackend(data)).includes(data.model),
    { message: "speech model does not match the selected backend; Vertex AI uses gemini-2.5-flash-tts/gemini-2.5-pro-tts, Google AI Studio uses gemini-2.5-flash-preview-tts/gemini-2.5-pro-preview-tts (gemini-3.1-flash-tts-preview works on both)" }
  ).refine(
    (data) => !data.voiceName || !data.speakers,
    { message: "voiceName cannot be used with speakers; set voiceName per speaker instead" }
  );
}

export const SpeechGenerationSchema = buildSpeechGenerationSchema(true);

const ALLOWED_MUSIC_MODELS = [
  'lyria-3-clip-preview',
  'lyria-3-pro-preview',
] as const;

export const ALLOWED_LYRIA_LANGUAGES = [
  'English',
  'German',
  'Spanish',
  'French',
  'Hindi',
  'Japanese',
  'Korean',
  'Portuguese',
] as const;

export function getAllowedMusicOutputMimeTypes(useVertexAI: boolean = true): readonly string[] {
  return useVertexAI ? ['audio/mp3'] : ['audio/mp3', 'audio/wav'];
}

export function buildMusicGenerationSchema(
  useVertexAI: boolean = true,
  availableBackends: Backend[] = [useVertexAI ? 'vertex' : 'ai-studio'],
) {
  const defaultBackend: Backend = useVertexAI ? 'vertex' : 'ai-studio';
  const isVertex = (data: { backend?: Backend }): boolean => (data.backend ?? defaultBackend) === 'vertex';
  return z.object({
    prompt: z.string().describe("Music generation prompt"),
    backend: z.enum(availableBackends as [Backend, ...Backend[]]).optional()
      .describe(`Backend for this request (default: ${defaultBackend}; available: ${availableBackends.join(', ')}). Vertex AI supports audio/mp3 only; Google AI Studio adds audio/wav for lyria-3-pro-preview.`),
    model: z.enum(ALLOWED_MUSIC_MODELS).optional()
      .describe("Music model (default: lyria-3-clip-preview)"),
    outputMimeType: z.enum(['audio/mp3', 'audio/wav']).optional()
      .describe("Optional output MIME type. Vertex AI supports audio/mp3 only; Google AI Studio supports audio/wav for lyria-3-pro-preview."),
    imagePaths: z.array(GeminiImageInputPathSchema).max(10).optional()
      .describe(`Optional local image paths to use as multimodal Lyria music generation inputs (max 10). Supported Gemini image input file types: ${GEMINI_IMAGE_INPUT_FILE_TYPES}. Audio/video reference files are not accepted by Lyria 3.`),
    lyrics: z.string().optional()
      .describe("Optional user-provided lyrics to include in the Lyria prompt"),
    instrumental: z.boolean().optional()
      .describe("Whether to explicitly request instrumental-only output"),
    vocalStyle: z.string().optional()
      .describe("Optional vocal generation direction, such as vocal tone, language, or delivery style"),
    language: z.enum(ALLOWED_LYRIA_LANGUAGES).optional()
      .describe("Optional output language direction. Vertex AI model card languages: English, German, Spanish, French, Hindi, Japanese, Korean, Portuguese"),
    durationSeconds: z.number().int().min(1).max(184).optional()
      .describe("Optional target duration in seconds; requires lyria-3-pro-preview; maximum 184 seconds per Vertex AI model card. lyria-3-clip-preview is fixed at 30 seconds and does not support duration controls"),
    bpm: z.number().int().min(40).max(240).optional()
      .describe("Optional tempo direction in beats per minute"),
    intensity: z.enum(['low', 'medium', 'high', 'LOW', 'MEDIUM', 'HIGH']).optional()
      .describe("Optional musical intensity direction"),
  }).strict().refine(
    (data) => data.durationSeconds === undefined || data.model === 'lyria-3-pro-preview',
    { message: "durationSeconds requires model='lyria-3-pro-preview'" }
  ).refine(
    (data) => !data.instrumental || (!data.lyrics && !data.vocalStyle),
    { message: "instrumental cannot be combined with lyrics or vocalStyle" }
  ).refine(
    (data) => !isVertex(data) || data.outputMimeType === undefined || data.outputMimeType === 'audio/mp3',
    { message: "the Vertex AI backend supports outputMimeType='audio/mp3' only for Lyria 3" }
  ).refine(
    (data) => isVertex(data) || data.outputMimeType !== 'audio/wav' || data.model === 'lyria-3-pro-preview',
    { message: "outputMimeType='audio/wav' requires model='lyria-3-pro-preview' on the Google AI Studio backend" }
  );
}

export const MusicGenerationSchema = buildMusicGenerationSchema(true);

export function buildVideoGenerationSchema(
  useVertexAI: boolean = true,
  availableBackends: Backend[] = [useVertexAI ? 'vertex' : 'ai-studio'],
) {
  const defaultBackend: Backend = useVertexAI ? 'vertex' : 'ai-studio';
  const dual = availableBackends.length > 1;
  const allowedVideoModels = (dual
    ? [...ALLOWED_VERTEX_VIDEO_MODELS, ...ALLOWED_GEMINI_API_VIDEO_MODELS]
    : (useVertexAI ? ALLOWED_VERTEX_VIDEO_MODELS : ALLOWED_GEMINI_API_VIDEO_MODELS)
  ) as [string, ...string[]];
  const maxVideoCount = dual ? 4 : (useVertexAI ? 4 : 1);
  const effBackend = (data: { backend?: Backend }): Backend => data.backend ?? defaultBackend;
  const isVertex = (data: { backend?: Backend }): boolean => effBackend(data) === 'vertex';
  const modelsForBackend = (b: Backend): readonly string[] =>
    b === 'vertex' ? ALLOWED_VERTEX_VIDEO_MODELS : ALLOWED_GEMINI_API_VIDEO_MODELS;

  return z.object({
    prompt: z.string().describe("Video generation prompt"),
    backend: z.enum(availableBackends as [Backend, ...Backend[]]).optional()
      .describe(`Backend for this request (default: ${defaultBackend}; available: ${availableBackends.join(', ')}). Vertex AI uses '-001' model IDs and Vertex-only controls (seed, generateAudio, numberOfVideos>1, compressionQuality, resizeMode); Google AI Studio uses '-preview' IDs.`),
    model: z.enum(allowedVideoModels).optional()
      .describe(`Video model (default: ${getDefaultVideoModel(useVertexAI)})`),
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
    personGeneration: z.enum(['allow_all', 'allow_adult', 'dont_allow']).optional()
      .describe("Optional person generation control"),
    negativePrompt: z.string().optional()
      .describe("Negative prompt for generation"),
    seed: z.number().int().min(0).max(4294967295).optional()
      .describe("Random seed for reproducibility (0-4294967295)"),
    numberOfVideos: z.number().int().min(1).max(maxVideoCount).optional()
      .describe(`Number of videos to generate (1-${maxVideoCount})`),
    imagePath: VeoImageInputPathSchema.optional()
      .describe(`Local file path of reference image (first frame). Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}`),
    lastFramePath: VeoImageInputPathSchema.optional()
      .describe(`Local file path of reference image (last frame, requires imagePath). Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}`),
    referenceImagePaths: z.array(VeoImageInputPathSchema).optional()
      .describe(`Local file paths of reference images (max 3). Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}`),
    videoPath: VeoExtensionVideoPathSchema.optional()
      .describe(`Local file path of a Veo-generated 720p video to extend. Supported file types: ${VEO_EXTENSION_VIDEO_FILE_TYPES}`),
    compressionQuality: z.enum(['optimized', 'lossless']).optional()
      .describe("Output video compression quality (Vertex AI only): 'optimized' (smaller file, default) or 'lossless' (larger, highest quality)"),
    resizeMode: z.enum(['crop', 'pad']).optional()
      .describe("How the input image is fit to the target aspect ratio for image-to-video (Vertex AI only; requires imagePath): 'crop' or 'pad' (default pad)"),
  }).strict().refine(
    (data) => !data.model || modelsForBackend(effBackend(data)).includes(data.model),
    { message: "model does not match the selected backend; Vertex AI uses '-001' model IDs and Google AI Studio uses '-preview' model IDs" }
  ).refine(
    (data) => {
      if (data.resolution === '1080p' || data.resolution === '4k') {
        return data.durationSeconds === undefined || data.durationSeconds === '8';
      }
      return true;
    },
    { message: "resolution '1080p' or '4k' requires durationSeconds='8'" }
  ).refine(
    (data) => {
      if (!data.referenceImagePaths?.length) {
        return true;
      }
      return data.durationSeconds === undefined || data.durationSeconds === '8';
    },
    { message: "referenceImagePaths require durationSeconds='8'" }
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
  ).refine(
    (data) => data.model !== 'veo-3.1-lite-generate-preview' || data.resolution !== '4k',
    { message: "resolution '4k' is not supported by model='veo-3.1-lite-generate-preview'" }
  ).refine(
    (data) => isVertex(data) || data.generateAudio === undefined,
    { message: "generateAudio is always on and cannot be configured for the Google AI Studio backend" }
  ).refine(
    (data) => isVertex(data) || data.seed === undefined,
    { message: "seed is not supported by @google/genai generateVideos for the Google AI Studio backend" }
  ).refine(
    (data) => isVertex(data) || data.numberOfVideos === undefined || data.numberOfVideos === 1,
    { message: "Google AI Studio Veo 3.1 returns a single video; omit numberOfVideos or set it to 1" }
  ).refine(
    (data) => {
      if (isVertex(data) || !data.personGeneration) {
        return true;
      }
      const usesImageMode = !!data.imagePath || !!data.lastFramePath || !!data.referenceImagePaths?.length;
      if (usesImageMode) {
        return data.personGeneration === 'allow_adult';
      }
      return data.personGeneration === 'allow_all';
    },
    { message: "Gemini Developer API Veo 3.1 uses personGeneration='allow_all' for text/video extension and 'allow_adult' for image/reference modes" }
  ).refine(
    (data) => isVertex(data) || data.compressionQuality === undefined,
    { message: "compressionQuality is only supported by the Vertex AI backend" }
  ).refine(
    (data) => isVertex(data) || data.resizeMode === undefined,
    { message: "resizeMode is only supported by the Vertex AI backend" }
  ).refine(
    (data) => !data.resizeMode || !!data.imagePath,
    { message: "resizeMode requires imagePath (image-to-video mode)" }
  ).refine(
    (data) => !data.resizeMode || !data.referenceImagePaths?.length,
    { message: "resizeMode cannot be used with referenceImagePaths" }
  );
}

export const VideoGenerationSchema = buildVideoGenerationSchema(true);

// Gemini Omni Flash is a NON-Veo video model invoked through the Interactions API
// (client.interactions.create), not the Veo generateVideos long-running-operation
// pipeline. It returns the finished video synchronously (no check_video polling)
// and supports stateful conversational editing via previousInteractionId.
const ALLOWED_OMNI_VIDEO_MODELS = [
  'gemini-omni-flash-preview',
] as const;

export const OMNI_VIDEO_INPUT_FILE_TYPES = VEO_IMAGE_INPUT_FILE_TYPES;

export const OmniVideoGenerationSchema = z.object({
  prompt: z.string().describe(
    "Video prompt for a new generation (oneshot), or a natural-language edit instruction when previousInteractionId is set (interactive editing). Describe dialogue/SFX/ambience as text; audio reference files are not accepted."
  ),
  model: z.enum(ALLOWED_OMNI_VIDEO_MODELS).optional()
    .describe("Omni video model (default: gemini-omni-flash-preview)"),
  backend: z.enum(['vertex', 'ai-studio']).optional()
    .describe("Optional backend override. Gemini Omni Flash runs on the Google AI Studio (Gemini API) backend and defaults to it; Vertex AI is not supported yet (availability rolling out)."),
  aspectRatio: z.enum(['16:9', '9:16']).optional()
    .describe("Aspect ratio (default: 16:9). Omni Flash supports 16:9 and 9:16 only. Output is 720p only; clips run a few seconds — steer timing within the prompt."),
  imagePaths: z.array(VeoImageInputPathSchema).max(7).optional()
    .describe(`Local file paths of source/reference images for image-to-video or reference-to-video (max 7). Supported file types: ${VEO_IMAGE_INPUT_FILE_TYPES}. Omit for interactive edits — previousInteractionId reuses the prior video without re-uploading.`),
  previousInteractionId: z.string().min(1).optional()
    .describe("Interaction ID returned by a prior generate_omni_video call. When set, conversationally edits that video (no image re-upload) instead of generating a new one. Chain up to 3 sequential edits."),
}).strict();

// AI-assisted reference search. Composes an answer from live web sources via
// Gemini's Google Search grounding (config.tools = [{ googleSearch }]) and
// returns organized citations from response groundingMetadata. Search-scope
// tuning is backend-asymmetric per the @google/genai GoogleSearch tool:
//   - excludeDomains / blockingConfidence: Vertex AI only
//   - timeRange (timeRangeFilter): Google AI Studio (Gemini API) only
const ALLOWED_BLOCKING_CONFIDENCE = ['low', 'medium', 'high'] as const;

const ReferenceTimeRangeSchema = z.object({
  startTime: z.string().min(1)
    .describe("Inclusive RFC 3339 start timestamp, e.g. '2026-01-01T00:00:00Z'"),
  endTime: z.string().min(1)
    .describe("Exclusive RFC 3339 end timestamp, e.g. '2026-07-01T00:00:00Z'"),
}).strict();

export function buildReferenceSearchSchema(
  useVertexAI: boolean = true,
  availableBackends: Backend[] = [useVertexAI ? 'vertex' : 'ai-studio'],
) {
  const defaultBackend: Backend = useVertexAI ? 'vertex' : 'ai-studio';
  const isVertex = (data: { backend?: Backend }): boolean => (data.backend ?? defaultBackend) === 'vertex';
  return z.object({
    prompt: z.string().describe("Research question or topic to answer from live web sources."),
    backend: z.enum(availableBackends as [Backend, ...Backend[]]).optional()
      .describe(`Backend for this request (default: ${defaultBackend}; available: ${availableBackends.join(', ')}). Search-scope tuning differs: Vertex AI supports excludeDomains/blockingConfidence; Google AI Studio supports timeRange.`),
    model: z.string().optional()
      .describe("Optional Gemini model override; must support Google Search grounding (default: server model)."),
    excludeDomains: z.array(z.string().min(1)).max(2000).optional()
      .describe("Domains to exclude from search results, e.g. ['reddit.com','pinterest.com'] (search-scope tuning; max 2000). Vertex AI backend only."),
    blockingConfidence: z.enum(ALLOWED_BLOCKING_CONFIDENCE).optional()
      .describe("Block risky/low-quality sites at or above this confidence ('low' is the most aggressive). Vertex AI backend only."),
    timeRange: ReferenceTimeRangeSchema.optional()
      .describe("Restrict results to a publish-time window for recency tuning; startTime and endTime are both required. Google AI Studio backend only."),
    includeImages: z.boolean().optional()
      .describe("Also enable image-search grounding in addition to web search."),
    urls: z.array(z.string().min(1)).max(20).optional()
      .describe("Specific http(s) URLs to ground the answer on via URL context (max 20; both backends)."),
    systemInstruction: z.string().optional()
      .describe("Optional system instruction to steer the tone, depth, or scope of the composed answer."),
    thinkingLevel: z.enum(['minimal', 'low', 'medium', 'high', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH']).optional()
      .describe("Optional Gemini 3 thinking level override for the reasoning depth of the answer."),
  }).strict().refine(
    (data) => isVertex(data) || (!data.excludeDomains && !data.blockingConfidence),
    { message: "excludeDomains and blockingConfidence are supported by the Vertex AI backend only" }
  ).refine(
    (data) => !isVertex(data) || data.timeRange === undefined,
    { message: "timeRange is supported by the Google AI Studio backend only" }
  );
}

export const ReferenceSearchSchema = buildReferenceSearchSchema(true);

export type QueryInput = z.infer<typeof QuerySchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FetchInput = z.infer<typeof FetchSchema>;
export type ImageGenerationInput = z.infer<typeof ImageGenerationSchema>;
export type SpeechGenerationInput = z.infer<typeof SpeechGenerationSchema>;
export type MusicGenerationInput = z.infer<ReturnType<typeof buildMusicGenerationSchema>>;
export type VideoGenerationInput = z.infer<typeof VideoGenerationSchema>;
export type OmniVideoGenerationInput = z.infer<typeof OmniVideoGenerationSchema>;
export type ReferenceSearchInput = z.infer<ReturnType<typeof buildReferenceSearchSchema>>;

export const CheckVideoSchema = z.object({
  operationId: z.string().describe("Operation ID returned by generate_video"),
});

export type CheckVideoInput = z.infer<typeof CheckVideoSchema>;
