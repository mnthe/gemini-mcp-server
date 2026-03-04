# ADR: Veo Video Generation Tool

## Status

Accepted — 2026-03-04

## Context

The project provides multimodal content generation capabilities via MCP tools. Image generation (`gemini_generate_image`) was previously implemented following a standard pattern: Schema → Service → Handler → Utility → Server registration. Users need the ability to generate videos from text prompts, images (image-to-video), and interpolation scenarios using Google's Veo models.

## Decision

Implement a `generate_video` MCP tool following the established image generation pattern with support for:

1. **Text-to-video generation** via text prompts
2. **Image-to-video** animation from input images
3. **Interpolation** between start and end frames (image + lastFrame)
4. **Reference images** for style/asset guidance (max 3, Veo 3.1 only)
5. **Default model**: `veo-3.1-fast-generate-001` (speed-optimized)
6. **Audio generation**: Enabled by default (`generateAudio: true`)
7. **Platform-aware storage**: macOS → `~/Movies/gemini-generated`, others → `~/Videos/gemini-generated`
8. **Async polling**: 10-second interval polling for long-running operations
9. **File path return**: Only file paths (not base64) due to large video sizes (tens of MB)

### Rationale

- **Consistency**: Reuses image generation patterns (Schema→Service→Handler→Utility→Server) to minimize learning curve and maintain code cohesion
- **Scalability**: Async polling with 10s intervals avoids blocking and handles extended generation times
- **Practicality**: File path returns are appropriate for large video files; base64 inline would be infeasible
- **Base64 input**: Image inputs (imagePath, lastFramePath, referenceImagePaths) are read locally and encoded as base64 to match `imagePaths` pattern from image generation
- **Audio**: Veo 3.1 supports audio generation, so enabling by default enhances output value
- **Storage**: Platform-aware paths (`~/Movies` on macOS, `~/Videos` elsewhere) follow OS conventions

## Outcome

**Verification**: PASS
**Iterations**: 1

### Files Changed

- `src/schemas/index.ts` (modified) — Added `VideoGenerationSchema` with validation refines
- `src/services/GeminiAIService.ts` (modified) — Added `generateVideo()` method with async operation polling
- `src/utils/videoSaver.ts` (created) — Video save utilities matching imageSaver pattern
- `src/handlers/VideoGenerationHandler.ts` (created) — Handler for video generation requests
- `src/server/GeminiAIMCPServer.ts` (modified) — Registered `generate_video` tool in ListTools and CallTool
- `src/types/config.ts` (modified) — Added `videoOutputDir?: string` config option
- `src/config/index.ts` (modified) — Added `GEMINI_VIDEO_OUTPUT_DIR` environment variable loading
- `src/handlers/VideoGenerationHandler.test.ts` (created) — Unit tests for handler

### Test Results

- Schema validation: PASS (valid inputs accepted, invalid rejected)
- Zod refines: PASS (resolution/duration constraints, lastFramePath dependency, max 3 reference images)
- Build check: PASS (`npx tsc --noEmit` — no TypeScript errors)
- Vitest suite: PASS (4/4 tests)

### Implementation Details

#### 1. Schema Validation (`src/schemas/index.ts`)

```typescript
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
    .describe("Video duration in seconds (default: 8)"),
  resolution: z.enum(['720p', '1080p', '4k']).optional()
    .describe("Video resolution (1080p/4k requires 8s duration, default: 720p)"),
  generateAudio: z.boolean().optional()
    .describe("Generate audio for the video (default: true)"),
  negativePrompt: z.string().optional()
    .describe("Text describing what to exclude from the video"),
  seed: z.number().optional()
    .describe("Random seed for reproducibility"),
  numberOfVideos: z.number().optional()
    .describe("Number of videos to generate (default: 1)"),
  imagePath: z.string().optional()
    .describe("Local file path of input image for image-to-video generation"),
  lastFramePath: z.string().optional()
    .describe("Local file path of last frame image for interpolation (requires imagePath)"),
  referenceImagePaths: z.array(z.string()).optional()
    .describe("Local file paths of reference images for style/asset guidance (max 3, Veo 3.1 only)"),
}).refine(
  (data) => {
    if ((data.resolution === '1080p' || data.resolution === '4k')) {
      if (!data.durationSeconds || data.durationSeconds !== '8') return false;
    }
    return true;
  },
  { message: "1080p and 4k resolution require durationSeconds to be '8'" }
).refine(
  (data) => {
    if (data.lastFramePath && !data.imagePath) return false;
    return true;
  },
  { message: "lastFramePath requires imagePath to be set (interpolation mode)" }
).refine(
  (data) => {
    if (data.referenceImagePaths && data.referenceImagePaths.length > 3) return false;
    return true;
  },
  { message: "Maximum 3 reference images allowed" }
);
```

Three validation refines enforce:
- **Resolution/duration constraint**: 1080p and 4K require exactly 8 seconds
- **Interpolation dependency**: `lastFramePath` without `imagePath` is rejected
- **Reference image limit**: Maximum 3 reference images (Veo 3.1 limit)

#### 2. Service Implementation (`src/services/GeminiAIService.ts`)

The `generateVideo()` method:
1. Builds API request parameters from options
2. Reads image files (imagePath, lastFramePath, referenceImagePaths) and encodes as base64
3. Calls `client.models.generateVideos()` to initiate async operation
4. Polls `client.operations.getVideosOperation()` every 10 seconds until `operation.done === true`
5. Extracts video data from response (handles both inline base64 and downloadable URIs)
6. Returns array of `GeneratedVideo` objects with buffer data and MIME type

#### 3. Video Saver (`src/utils/videoSaver.ts`)

Utility functions matching imageSaver pattern:
- `getDefaultVideoDir()`: Platform-aware paths (macOS: `~/Movies/gemini-generated`, others: `~/Videos/gemini-generated`)
- `saveVideo(data: Buffer, outputDir: string, filename: string)`: Writes video to disk
- `generateVideoFilename(index: number)`: Creates timestamped filenames (`vid-YYYYMMDDHHMMSS-NNN.mp4`)

#### 4. Handler (`src/handlers/VideoGenerationHandler.ts`)

Orchestrates the video generation flow:
- Validates input via schema
- Calls `GeminiAIService.generateVideo()`
- Saves each generated video via `videoSaver`
- Returns JSON with file paths and MIME types

#### 5. Server Registration (`src/server/GeminiAIMCPServer.ts`)

- Imported VideoGenerationHandler and VideoGenerationSchema
- Added `generate_video` tool definition to ListTools (with all 11 parameters)
- Added `generate_video` case to CallTool switch statement

#### 6. Configuration (`src/types/config.ts`, `src/config/index.ts`)

- Added `videoOutputDir?: string` to GeminiAIConfig type
- Added `GEMINI_VIDEO_OUTPUT_DIR` environment variable loading in config initialization

## Execution Summary

| ID | Task | Status | Key Evidence |
|----|------|--------|--------------|
| 1  | Schema + Config + VideoSaver | resolved | videoSaver utility created; schema with 3 refines; config integration |
| 2  | GeminiAIService.generateVideo() | resolved | Async operation polling (10s interval); image base64 reading; response extraction |
| 3  | VideoGenerationHandler + Server registration | resolved | Handler orchestration; ListTools + CallTool registration; test file created |
| verify | Full build + integration | resolved | TypeScript build pass; vitest 4/4; no compilation errors |

## Delta from Plan

**Implementation matched plan**. No deviations:
- All 6 design decisions upheld (existing pattern, async polling, file path return, base64 input, audio default, platform paths)
- All 11 schema parameters implemented with correct validation
- All 7 files modified/created as specified
- All test scenarios covered (schema, service, handler, build verification)
- Default models, aspect ratios, durations, and resolutions match design

## Integration Notes

The `generate_video` tool integrates seamlessly with the existing architecture:
- Uses same Schema→Service→Handler→Utility pattern as image generation
- Polling mechanism offloads to separate thread with status checks
- File storage follows platform conventions (Movies vs Videos)
- Configuration compatible with environment-based setup (GEMINI_VIDEO_OUTPUT_DIR)

Users can now generate videos via:
```
generate_video(
  prompt="Dancing robot in cyberpunk city",
  model="veo-3.1-fast-generate-001",
  aspectRatio="16:9",
  durationSeconds="8",
  resolution="1080p",
  generateAudio=true
)
```

And with image inputs:
```
generate_video(
  prompt="Animate this image",
  imagePath="/path/to/image.jpg",
  lastFramePath="/path/to/end_frame.jpg"  // interpolation
)
```
