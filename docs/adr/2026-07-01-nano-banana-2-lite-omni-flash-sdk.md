# ADR: Nano Banana 2 Lite Image, Gemini Omni Flash Video, Backend-Aware TTS, and SDK Bump

## Status

Accepted — 2026-07-01

## Context

Google's mid-2026 model releases add capabilities that do not fit cleanly into the existing generation tools:

1. **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`) went GA as a lower-cost image tier. It is more constrained than the other Nano Banana image models: 1K output only, standard aspect ratios only, no `thinkingLevel`, and up to 14 reference images.
2. **Gemini Omni Flash** (`gemini-omni-flash-preview`) is a new video model that is **not** part of the Veo family. It is invoked through the `@google/genai` Interactions API (`client.interactions.create`) rather than the Veo `generateVideos` long-running-operation pipeline, and it supports stateful conversational editing.
3. The legacy `gemini-2.5-flash-image` model is scheduled to retire on 2026-10-02, so it must remain available with a documented retirement date rather than being removed immediately.
4. The TTS model ids diverged by backend: Vertex AI exposes GA `-tts` ids while Google AI Studio exposes `-preview-tts` preview ids. A single static speech model enum can false-reject valid requests for one backend.

These changes require a newer `@google/genai` and `@modelcontextprotocol/sdk`, and they must be reconciled against the existing generation tool set without regressing the Veo pipeline, the backend-aware video/music schemas ([2026-04-28 backend capability detection](2026-04-28-backend-capability-detection.md)), or the speech/music tools ([2026-04-28 speech and music generation](2026-04-28-speech-and-music-generation.md)).

## Decision

### SDK bump

Bump `@google/genai` from `^2.8.0` to `^2.10.0` and `@modelcontextprotocol/sdk` from `^1.26.0` to `^1.29.0`.

The only breaking change in the `@google/genai` 2.x line was 2.0.0, and it was scoped to the Interactions API surface. The generation calls this server relies on — `models.generateContent` (query, image, speech, music), `models.generateVideos` / `operations.getVideosOperation` (Veo), and now `interactions.create` (Omni Flash) — are unchanged from 2.8.0 through 2.10.0. The MCP SDK 1.26 → 1.29 range is additive for the tool/list and call handlers this server implements. The bump is therefore non-breaking for this repo.

### Nano Banana 2 Lite image model

Add `gemini-3.1-flash-lite-image` to `ALLOWED_IMAGE_MODELS` and keep `gemini-2.5-flash-image` (legacy, retires 2026-10-02). The new model order is:

1. `gemini-3-pro-image` (default)
2. `gemini-3.1-flash-image`
3. `gemini-3.1-flash-lite-image`
4. `gemini-2.5-flash-image`

Capability refines for `gemini-3.1-flash-lite-image`:

- Gate `imageSize` to `1K` only (reject `0.5K`/`2K`/`4K`; omit for its default 1K output).
- It is not eligible for the flash-image-only asymmetric aspect ratios (`1:4`, `1:8`, `4:1`, `8:1`), which remain restricted to `gemini-3.1-flash-image`.
- It is not eligible for `thinkingLevel`, which remains restricted to `gemini-3.1-flash-image`.
- Reference-image cap stays at 14 (only `gemini-2.5-flash-image` is limited to 3).

### Gemini Omni Flash as a separate tool

Add a new `generate_omni_video` tool (model `gemini-omni-flash-preview`) with its own `OmniVideoGenerationSchema`, `GeminiAIService.generateOmniVideo()`, and `OmniVideoHandler`, wired into `GeminiAIMCPServer`.

- **Interactions API, synchronous**: `client.interactions.create` returns the finished video in a single call. There is no `operationId` and no `check_video` follow-up.
- **Dual path**:
  - *Oneshot*: text-to-video, image-to-video, or reference-to-video (`imagePaths` max 7).
  - *Interactive editing*: `previousInteractionId` chains up to 3 sequential edits, reusing the prior video without re-uploading source media.
- **Constraints**: 720p only, `16:9`/`9:16`, duration 3-10s, audio auto-generated.
- **Backend**: Google AI Studio (Gemini API).
- **Output**: saved to the same video output directory as `generate_video` (`config.videoOutputDir` / `getDefaultVideoDir()`), via the existing `videoSaver`.

### Backend-aware TTS split

Split the single speech model enum into per-backend lists and introduce `buildSpeechGenerationSchema(useVertexAI, availableBackends)`, mirroring `buildVideoGenerationSchema` / `buildMusicGenerationSchema`:

- Vertex AI GA: `gemini-2.5-flash-tts`, `gemini-2.5-pro-tts`
- Google AI Studio preview: `gemini-2.5-flash-preview-tts`, `gemini-2.5-pro-preview-tts`
- Both backends: `gemini-3.1-flash-tts-preview` (default)

A refine rejects a model that does not match the selected (or default) backend. `SpeechGenerationSchema` is kept as the Vertex default export.

### Availability audit (non-decisions)

The text, Lyria music, and Veo video model id lists were audited against official documentation as of 2026-07 and are all current. No id changes were made to those tools in this ADR.

## Rationale

### Why Omni Flash could not fold into `generate_video`

The Veo `generate_video` schema and pipeline are structurally incompatible with Omni Flash:

- **Different SDK surface**: Veo uses `models.generateVideos` returning a long-running operation polled with `operations.getVideosOperation`; the tool contract exposes this as `generate_video` → `{ operationId }` → `check_video`. Omni Flash uses `interactions.create` and returns the video synchronously. Folding it in would force one of the two models into the wrong async contract.
- **Different parameter surface**: `VideoGenerationSchema` carries Veo-specific fields (`seed`, `numberOfVideos`, `enhancePrompt`, `personGeneration`, `compressionQuality`, `resizeMode`, `lastFramePath`, `videoPath`, `referenceImagePaths` max 3, resolutions up to `4k`, backend-specific `-001`/`-preview` id enums). Omni Flash accepts none of these; it adds `previousInteractionId` and a different `imagePaths` cap (7) and constraint set (720p only, duration 3-10s as a number). Overloading one schema would require mutually exclusive branches gated on the model, degrading validation clarity.
- **Different state model**: Omni Flash's `previousInteractionId` editing has no Veo analogue. Expressing a stateful edit chain inside a stateless one-shot Veo schema would be misleading.

A separate tool keeps each schema deterministic and each pipeline honest about its async/state behavior, consistent with the existing "separate tools for distinct model families" principle used for speech vs music.

### Why the lite refines are 1K-only and keep 2.5-flash-image

`gemini-3.1-flash-lite-image` documents 1K-only, standard-ratio output with no thinking, so schema refines reject the higher/lower `imageSize` values and the asymmetric ratios instead of silently forwarding requests the model will reject. `gemini-2.5-flash-image` is kept because it is still GA until 2026-10-02; removing it now would break callers pinned to it before its retirement.

### Why the per-backend TTS split

The prior single enum mixed Vertex GA and AI Studio preview ids, so it could accept an id the active backend rejects. Keying the model enum and a match refine to the resolved backend makes speech validation deterministic per backend, matching the pattern already used for Veo video and Lyria music.

## Consequences

### Positive

- Callers can select the cheaper Nano Banana 2 Lite image tier with schema-level guardrails for its constraints.
- `generate_omni_video` exposes synchronous, editable video generation without disturbing the Veo `generate_video`/`check_video` contract.
- Omni videos land in the same output directory as Veo videos, so downstream file handling is unchanged.
- Speech validation no longer false-rejects backend-appropriate 2.5 TTS ids.
- The SDK bump picks up upstream fixes with no code changes required for this repo's call patterns.

### Tradeoffs

- The image, video, and speech capability tables grow and still require maintenance when Google changes model ids or limits.
- `gemini-2.5-flash-image` remains in the enum until its 2026-10-02 retirement and will need a follow-up removal.
- Omni Flash is preview and Google AI Studio-only for now; Vertex AI availability is deferred until it rolls out.
- A second, structurally different video tool increases the tool surface clients must understand (synchronous vs long-running).

## Implementation Notes

- `package.json`
  - `@google/genai` `^2.8.0` → `^2.10.0`.
  - `@modelcontextprotocol/sdk` `^1.26.0` → `^1.29.0`.

- `src/schemas/index.ts`
  - Added `gemini-3.1-flash-lite-image` to `ALLOWED_IMAGE_MODELS` (new order: 3-pro-image, 3.1-flash-image, 3.1-flash-lite-image, 2.5-flash-image).
  - Added an image refine gating `gemini-3.1-flash-lite-image` to `imageSize: '1K'` only.
  - Added `ALLOWED_OMNI_VIDEO_MODELS`, `OMNI_VIDEO_INPUT_FILE_TYPES`, `OmniVideoGenerationSchema`, and `OmniVideoGenerationInput`.
  - Split speech models into `ALLOWED_VERTEX_SPEECH_MODELS` / `ALLOWED_GEMINI_API_SPEECH_MODELS`, added `getAllowedSpeechModels(useVertexAI)` and `buildSpeechGenerationSchema(useVertexAI, availableBackends)` with a backend-match refine; kept `SpeechGenerationSchema` as the Vertex default.

- `src/services/GeminiAIService.ts`
  - Added `generateOmniVideo(prompt, options)` using `client.interactions.create` with `store: true`, optional `previous_interaction_id`, and inline reference images for image/reference-to-video.

- `src/handlers/OmniVideoHandler.ts`
  - New handler; saves the synchronous video via `videoSaver` to `config.videoOutputDir` and returns `{ status, interactionId, video, text?, hint }`.

- `src/server/GeminiAIMCPServer.ts`
  - Registered `generate_omni_video` in `tools/list` and its call handler.
  - Parses `generate_speech` calls with `buildSpeechGenerationSchema(this.config.useVertexAI, this.config.availableBackends)`.

- Documentation
  - `ARCHITECTURE.md`: added the `OmniVideoHandler` component, `OmniVideoGenerationSchema` section, Omni video generation flow, backend-aware speech schema notes, and the lite image model/refines.
  - `.env.example`: noted that `generate_omni_video` shares the video output directory.

## Availability Audit

Audited against official documentation as of 2026-07. No id changes were required for:

- **Text** query models (`gemini-3.5-flash` default and the 3.1 pro/flash-lite variants).
- **Lyria music** models (`lyria-3-clip-preview`, `lyria-3-pro-preview`).
- **Veo video** models (Vertex `-001` GA ids and Gemini Developer API `-preview` ids).

## References

- Gemini image generation (Nano Banana models, sizes, ratios, thinking levels): https://ai.google.dev/gemini-api/docs/image-generation
- Gemini API video generation (Veo model versions and output limits): https://ai.google.dev/gemini-api/docs/video
- Gemini API speech generation (TTS models): https://ai.google.dev/gemini-api/docs/speech-generation
- Gemini API music generation (Lyria 3): https://ai.google.dev/gemini-api/docs/music-generation
- `@google/genai` release docs: https://googleapis.github.io/js-genai/release_docs/index.html
