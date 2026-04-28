# Generation Tools

The server exposes file-output generation tools for images, speech, music, and video. These tools share a common persistence pattern:

1. Validate tool input with Zod schemas in `src/schemas/index.ts`
2. Generate media through `GeminiAIService`
3. Save generated files under a platform-aware `gemini-generated` directory
4. Return a text content block with saved file paths
5. Return inline MCP media content when practical for the media type

## Tools

| Tool | Models | Output | Return Shape |
|------|--------|--------|--------------|
| `generate_image` | Gemini image models | PNG/JPEG/WebP | `text` metadata + `image` content |
| `generate_speech` | Gemini TTS models | WAV | `text` metadata + `audio` content |
| `generate_music` | Lyria 3 models | MP3/WAV | `text` metadata + `audio` content |
| `generate_video` | Veo 3.1 models | async operation ID | `text` metadata |
| `check_video` | Veo operation polling | MP4 paths when complete | `text` metadata |

## Default Output Directories

| Media | macOS | Windows | Linux |
|-------|-------|---------|-------|
| Images | `~/Pictures/gemini-generated` | `%USERPROFILE%\Pictures\gemini-generated` | `~/Pictures/gemini-generated` |
| Videos | `~/Movies/gemini-generated` | `%USERPROFILE%\Videos\gemini-generated` | `~/Videos/gemini-generated` |
| Speech | `~/Music/gemini-generated/speech` | `%USERPROFILE%\Music\gemini-generated\speech` | `~/Music/gemini-generated/speech` |
| Music | `~/Music/gemini-generated/music` | `%USERPROFILE%\Music\gemini-generated\music` | `~/Music/gemini-generated/music` |

Override directories with:

```bash
export GEMINI_IMAGE_OUTPUT_DIR="/path/to/images"
export GEMINI_VIDEO_OUTPUT_DIR="/path/to/videos"
export GEMINI_SPEECH_OUTPUT_DIR="/path/to/speech"
export GEMINI_MUSIC_OUTPUT_DIR="/path/to/music"
```

## generate_image

`generate_image` generates images using Gemini native image generation models.

| Parameter | Type | Notes |
|-----------|------|-------|
| `prompt` | string | Required |
| `model` | enum | `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`, `gemini-2.5-flash-image` |
| `aspectRatio` | enum | Includes standard ratios and 3.1 Flash-only wide/tall ratios |
| `imageSize` | enum | `0.5K`, `1K`, `2K`, `4K`; omit for `gemini-2.5-flash-image` |
| `imagePaths` | string[] | Optional local reference images |

Example:

```json
{
  "name": "generate_image",
  "arguments": {
    "prompt": "A cinematic product photo of a matte black espresso machine",
    "model": "gemini-3.1-flash-image-preview",
    "aspectRatio": "16:9",
    "imageSize": "2K"
  }
}
```

More examples: [examples/image-generation.md](examples/image-generation.md)

## generate_speech

`generate_speech` generates TTS audio using Gemini TTS models. The model returns PCM audio, and the server wraps it in WAV before saving.

| Parameter | Type | Notes |
|-----------|------|-------|
| `prompt` | string | Required text or transcript |
| `model` | enum | `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts` |
| `voiceName` | string | Single-speaker prebuilt voice, default `Kore` |
| `languageCode` | string | Optional BCP-47 language code |
| `speakers` | object[] | Exactly two `{ speaker, voiceName }` entries |

Example:

```json
{
  "name": "generate_speech",
  "arguments": {
    "prompt": "Say warmly: Welcome to the product update.",
    "voiceName": "Kore"
  }
}
```

Detailed guide: [AUDIO_GENERATION.md](AUDIO_GENERATION.md)

## generate_music

`generate_music` generates music using Lyria 3 models.

| Parameter | Type | Notes |
|-----------|------|-------|
| `prompt` | string | Required |
| `model` | enum | `lyria-3-clip-preview`, `lyria-3-pro-preview` |
| `outputMimeType` | enum | `audio/mp3` or `audio/wav`; WAV requires `lyria-3-pro-preview` |
| `imagePaths` | string[] | Optional image-guided Lyria inputs |

Example:

```json
{
  "name": "generate_music",
  "arguments": {
    "prompt": "A 30-second lo-fi instrumental loop with soft keys and vinyl texture.",
    "model": "lyria-3-clip-preview"
  }
}
```

Detailed guide: [AUDIO_GENERATION.md](AUDIO_GENERATION.md)

## generate_video and check_video

`generate_video` starts a Veo generation operation and returns immediately with an `operationId`. Use `check_video` to poll and save completed videos.

| Parameter | Type | Notes |
|-----------|------|-------|
| `prompt` | string | Required |
| `model` | enum | `veo-3.1-fast-generate-001`, `veo-3.1-generate-001`, `veo-3.1-lite-generate-001` |
| `aspectRatio` | enum | `16:9`, `9:16` |
| `durationSeconds` | enum | `4`, `6`, `8` |
| `resolution` | enum | `720p`, `1080p`, `4k`; 1080p/4k require 8 seconds |
| `generateAudio` | boolean | Defaults to true |
| `negativePrompt` | string | Optional exclusions |
| `seed` | number | 0-4294967295 |
| `numberOfVideos` | number | 1-4 |
| `imagePath` | string | Optional first frame for image-to-video |
| `lastFramePath` | string | Optional last frame, requires `imagePath` |
| `referenceImagePaths` | string[] | Optional references, max 3 |

Example:

```json
{
  "name": "generate_video",
  "arguments": {
    "prompt": "A slow dolly shot through a neon-lit robotics lab",
    "model": "veo-3.1-fast-generate-001",
    "durationSeconds": "8",
    "resolution": "1080p"
  }
}
```

Poll:

```json
{
  "name": "check_video",
  "arguments": {
    "operationId": "<operation-id-from-generate-video>"
  }
}
```

## Authentication Mode Notes

Generation tools use the same SDK client as `query`.

- Vertex AI mode uses `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, and Google Cloud credentials.
- Google AI Studio / Gemini Developer API mode uses `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
- Set `GOOGLE_GENAI_USE_VERTEXAI=true|false` to force a mode.

Some model availability can differ between Vertex AI and the Gemini Developer API. If a model is unavailable in one mode, select the other mode or choose a model available in that backend.
