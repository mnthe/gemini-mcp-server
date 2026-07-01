# Generation Tools

The server exposes file-output generation tools for images, speech, music, and video. These tools share a common persistence pattern:

1. Validate tool input with Zod schemas in `src/schemas/index.ts`
2. Generate media through `GeminiAIService`
3. Save generated files under a platform-aware `gemini-generated` directory
4. Return a text content block with saved file paths
5. Return inline MCP media content when practical for the media type

On failures, generation tool calls return MCP error content instead of throwing through the protocol. The text content is JSON with `status: "failed"`, `tool`, `errorType`, `message`, and, for validation failures, an `issues` array with field paths and messages.

## Tools

| Tool | Models | Output | Return Shape |
|------|--------|--------|--------------|
| `generate_image` | Gemini image models | PNG/JPEG/WebP | `text` metadata + `image` content |
| `generate_speech` | Gemini TTS models | WAV | `text` metadata + `audio` content |
| `generate_music` | Lyria 3 models | MP3; WAV only for Gemini API/AI Studio Pro | `text` metadata + `audio` content |
| `generate_video` | Veo 3.1 models | async operation ID | `text` metadata |
| `check_video` | Veo operation polling | MP4 paths when complete | `text` metadata |
| `generate_omni_video` | Gemini Omni Flash | MP4 path (synchronous) | `text` metadata |
| `reference_search` | Gemini + Google Search grounding | synthesized answer + citations (no file) | `text` JSON |

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
| `model` | enum | `gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-2.5-flash-image` |
| `aspectRatio` | enum | Includes standard ratios and 3.1 Flash-only wide/tall ratios. `gemini-3.1-flash-lite-image` supports standard ratios only (not `1:4`/`1:8`/`4:1`/`8:1`) |
| `imageSize` | enum | `0.5K`, `1K`, `2K`, `4K`; `gemini-3.1-flash-lite-image` supports `1K` only; omit for `gemini-2.5-flash-image` |
| `imagePaths` | string[] | Optional local reference images, max 14; `gemini-2.5-flash-image` supports at most 3. Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`), HEIC (`.heic`), HEIF (`.heif`) |
| `systemInstruction` | string | Optional Gemini 3 image system instruction |
| `thinkingLevel` | enum | Optional Gemini 3.1 Flash Image thinking level: `minimal` or `high` (not supported by `gemini-3.1-flash-lite-image`) |
| `mediaResolution` | enum | Optional media resolution for reference image inputs |

Example:

```json
{
  "name": "generate_image",
  "arguments": {
    "prompt": "A cinematic product photo of a matte black espresso machine",
    "model": "gemini-3.1-flash-image",
    "aspectRatio": "16:9",
    "imageSize": "2K"
  }
}
```

`gemini-3.1-flash-lite-image` (Nano Banana 2 Lite) is the fast, low-cost GA tier: 1K output only, standard aspect ratios, no `thinkingLevel`, up to 14 reference images, and editing support. It is the recommended replacement for the legacy `gemini-2.5-flash-image` (still available, retires 2026-10-02).

More examples: [examples/image-generation.md](examples/image-generation.md)

## generate_speech

`generate_speech` generates TTS audio using Gemini TTS models. The model returns PCM audio, and the server wraps it in WAV before saving. Gemini TTS is text-only input; audio, image, and video reference files are not supported by this tool.

Gemini TTS has a 32k-token context limit and does not support streaming in this request-response tool.

| Parameter | Type | Notes |
|-----------|------|-------|
| `prompt` | string | Required text or transcript |
| `model` | enum | `gemini-3.1-flash-tts-preview` (default, both backends). Backend-specific 2.5 tiers: Vertex AI GA `gemini-2.5-flash-tts`/`gemini-2.5-pro-tts`; Google AI Studio preview `gemini-2.5-flash-preview-tts`/`gemini-2.5-pro-preview-tts` |
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
| `outputMimeType` | enum | Vertex AI: `audio/mp3` only. Gemini API/AI Studio: `audio/mp3`, or `audio/wav` with `lyria-3-pro-preview` |
| `imagePaths` | string[] | Optional image-guided Lyria inputs, max 10. Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`), HEIC (`.heic`), HEIF (`.heif`) |
| `lyrics` | string | Optional user-provided lyrics |
| `instrumental` | boolean | Requests instrumental-only output; cannot be combined with lyrics/vocals |
| `vocalStyle` | string | Optional vocal direction |
| `language` | enum | Optional output language direction: English, German, Spanish, French, Hindi, Japanese, Korean, Portuguese |
| `durationSeconds` | number | Optional target duration; requires `lyria-3-pro-preview`; max 184 seconds |
| `bpm` | number | Optional tempo direction |
| `intensity` | enum | `low`, `medium`, `high` |

Example:

```json
{
  "name": "generate_music",
  "arguments": {
    "prompt": "A 30-second lo-fi instrumental loop with soft keys and vinyl texture.",
    "model": "lyria-3-clip-preview",
    "bpm": 82,
    "intensity": "low"
  }
}
```

Lyria 3 Clip is fixed at 30 seconds. Lyria 3 Pro supports longer structured music up to 184 seconds, one clip per prompt, 44.1 kHz output, and 192 kbps MP3 in Vertex AI. In Gemini API/AI Studio mode, Pro can also request WAV output.

For Lyria 3, watermarking, input filtering, output recitation filtering, vocal-likeness filtering, and prompt rewriting are model-side features. Negative prompting is not supported. The tool exposes controllable prompt-level inputs for lyrics, vocals, language, instrumental mode, duration, BPM, and intensity.

Lyria 3 accepts text prompts and optional image references only. It does not accept audio or video reference files for generation. To use an existing audio file as inspiration, first analyze it with `query` and an audio part, then pass the extracted style/structure as text to `generate_music`.

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
| `enhancePrompt` | boolean | Optional Veo prompt rewriting/enhancement |
| `personGeneration` | enum | `allow_adult`, `dont_allow` |
| `negativePrompt` | string | Optional exclusions |
| `seed` | number | 0-4294967295 |
| `numberOfVideos` | number | 1-4 |
| `imagePath` | string | Optional first frame for image-to-video. Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`) |
| `lastFramePath` | string | Optional last frame, requires `imagePath`. Same supported image file types as `imagePath` |
| `referenceImagePaths` | string[] | Optional references, max 3. Same supported image file types as `imagePath` |
| `videoPath` | string | Optional Veo-generated 720p MP4 (`.mp4`) video to extend |

Source modes are mutually exclusive:

- Text-only: omit source path fields.
- Image-to-video/interpolation: use `imagePath`, optionally with `lastFramePath`.
- Reference-image generation: use `referenceImagePaths` only.
- Video extension: use `videoPath` only. Veo extension requires a Veo-generated 720p input video and returns one extended video.
- Audio file references are not supported by Veo generation. Put dialogue, sound effects, and ambience in `prompt` as text audio cues.

Veo 3.1 standard and fast support reference asset images; Lite does not. Lite also does not support `4k` output.

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

Video extension:

```json
{
  "name": "generate_video",
  "arguments": {
    "prompt": "Track the subject as the camera follows them into the next room.",
    "model": "veo-3.1-generate-001",
    "videoPath": "/path/to/previous-veo-output.mp4",
    "resolution": "720p"
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

More examples: [examples/video-generation.md](examples/video-generation.md)

## generate_omni_video

`generate_omni_video` generates or conversationally edits short videos with Gemini Omni Flash (`gemini-omni-flash-preview`). This is a NON-Veo model on the Google AI Studio (Gemini API) backend and does not use `generate_video`/`check_video`: it returns the finished, saved video synchronously in one call, with no `operationId` and no `check_video` polling.

| Parameter | Type | Notes |
|-----------|------|-------|
| `prompt` | string | Required. Generation prompt (oneshot) or a natural-language edit instruction when `previousInteractionId` is set |
| `model` | enum | `gemini-omni-flash-preview` |
| `aspectRatio` | enum | `16:9`, `9:16` |
| `imagePaths` | string[] | Optional source/reference images for image-to-video or reference-to-video, max 7. Supported file types: PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`) |
| `previousInteractionId` | string | `interactionId` from a prior call; conversationally edits that video with no image re-upload; chain up to 3 edits |

Two paths:

- Oneshot: text-to-video, or image/reference-to-video with `imagePaths`. Omit `previousInteractionId`.
- Interactive editing: set `previousInteractionId` to an id returned by a prior call to edit that video with a natural-language instruction. No image re-upload; chain up to 3 sequential edits.

Output is 720p only and clips run a few seconds; Omni Flash has no structured duration parameter, so steer pacing/timing within `prompt`. A synced audio track is generated automatically; audio reference inputs are not accepted, so describe dialogue, sound effects, and ambience in `prompt` as text. The response text includes `interactionId` (pass it back as `previousInteractionId` to edit) and the saved file path.

Oneshot:

```json
{
  "name": "generate_omni_video",
  "arguments": {
    "prompt": "A cinematic tracking shot through a quiet neon-lit robotics lab.",
    "aspectRatio": "16:9"
  }
}
```

Interactive edit:

```json
{
  "name": "generate_omni_video",
  "arguments": {
    "prompt": "Add warm sunrise lighting and slow the camera down.",
    "previousInteractionId": "<interaction-id-from-previous-call>"
  }
}
```

More examples: [examples/video-generation.md](examples/video-generation.md)

## reference_search

`reference_search` answers a question from live web sources using Gemini's Google Search grounding, returning a synthesized answer plus organized citations in one call. It does not write a file — the result is a JSON `text` block. Unlike the OpenAI-spec `search`/`fetch` connector tools, it composes the answer AND returns the source links plus claim→source supports together.

Search-scope tuning is backend-asymmetric per the `@google/genai` GoogleSearch tool, and invalid combinations are rejected at validation:

| Tuning field | Vertex AI | Google AI Studio |
|--------------|-----------|------------------|
| `excludeDomains` (skip up to 2000 domains) | ✅ | ❌ |
| `blockingConfidence` (block risky/low-quality sites) | ✅ | ❌ |
| `timeRange` (restrict to a publish-time window) | ❌ | ✅ |
| `urls` (URL context) | ❌ | ✅ |
| `includeImages` | ✅ | ✅ |

Return shape (JSON in the `text` block):

- `answer`: synthesized text grounded in the sources
- `citations`: deduped `{ index, title, uri, domain }` sources
- `supports`: answer segments mapped to citation indices with confidence scores
- `searchQueries`: the queries the model actually ran
- `searchSuggestionsHtml`: Google's required Search Suggestions markup (present when the API returns it) to display alongside the answer

Recency-tuned research on Google AI Studio:

```json
{
  "name": "reference_search",
  "arguments": {
    "prompt": "What changed in the latest Gemini API pricing?",
    "backend": "ai-studio",
    "timeRange": { "startTime": "2026-06-01T00:00:00Z", "endTime": "2026-07-01T00:00:00Z" }
  }
}
```

Curated web research on Vertex AI:

```json
{
  "name": "reference_search",
  "arguments": {
    "prompt": "Production best practices for MCP servers",
    "excludeDomains": ["reddit.com", "pinterest.com"],
    "blockingConfidence": "medium"
  }
}
```

## Authentication Mode Notes

Generation tools use the same SDK client as `query`.

- Vertex AI mode uses `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, and Google Cloud credentials.
- Google AI Studio / Gemini Developer API mode uses `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
- Set `GOOGLE_GENAI_USE_VERTEXAI=true|false` to force a mode.

Some model availability can differ between Vertex AI and the Gemini Developer API. If a model is unavailable in one mode, select the other mode or choose a model available in that backend.
