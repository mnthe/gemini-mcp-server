# ADR: Backend-Specific Capability Detection for Generation Tools

## Status

Accepted — 2026-04-28

## Context

The server supports two Google GenAI backends through `@google/genai`:

1. Vertex AI, enabled with `GOOGLE_GENAI_USE_VERTEXAI=true` and `GOOGLE_CLOUD_PROJECT`
2. Gemini Developer API / AI Studio, enabled with `GEMINI_API_KEY` or `GOOGLE_API_KEY`

These backends do not expose identical generation capabilities. A single hard-coded schema can reject valid requests for one backend, or allow requests that the selected backend rejects. The most visible differences are in Veo model IDs, output counts, configurable audio, seed support, and person generation values.

The prior handoff document captured local investigation and proposed boot-time probing. Official documentation review refined that plan: some handoff assumptions should not become schema rejects because current docs describe them as supported.

## Decision

Use backend-specific capability tables and schema construction for generation tools, keyed by `GeminiAIConfig.useVertexAI`.

### Video generation

For Vertex AI:

- Accept Veo 3.1 GA model IDs:
  - `veo-3.1-fast-generate-001`
  - `veo-3.1-generate-001`
  - `veo-3.1-lite-generate-001`
- Default to `veo-3.1-fast-generate-001`.
- Allow `numberOfVideos` from 1 to 4.
- Send Vertex-only request fields such as `generateAudio` and `seed`.

For Gemini Developer API:

- Accept Veo 3.1 preview model IDs:
  - `veo-3.1-fast-generate-preview`
  - `veo-3.1-generate-preview`
  - `veo-3.1-lite-generate-preview`
- Default to `veo-3.1-fast-generate-preview`.
- Restrict `numberOfVideos` to 1.
- Reject `generateAudio` at schema level and omit it from SDK calls, because audio is part of the model output rather than a configurable request option.
- Reject `seed` at schema level and omit it from SDK calls.
- Validate `personGeneration` by input mode:
  - text-to-video and video extension: `allow_all`
  - image/reference-image modes: `allow_adult`

Keep the legacy `VideoGenerationSchema` export as the Vertex default for compatibility, and introduce `buildVideoGenerationSchema(useVertexAI)` for backend-aware validation.

### Image generation

- Restrict `thinkingLevel` for `gemini-3.1-flash-image-preview` to `minimal` and `high`.
- Keep `thinkingLevel` rejected for other image models.
- Limit `gemini-2.5-flash-image` input reference images to at most 3, while keeping Gemini 3 image models at the existing max of 14.

### Tool metadata

Build the `generate_video` MCP tool schema dynamically in `tools/list` so clients see the active backend's model enum, default model, and `numberOfVideos` maximum.

Build the `generate_music` MCP tool schema dynamically for output MIME support: Vertex AI lists `audio/mp3` only, while Gemini Developer API / AI Studio lists `audio/mp3` and `audio/wav` with validation that WAV requires `lyria-3-pro-preview`.

### Non-decisions

Do not add schema rejects for these handoff items based only on local failures:

- Do not globally reject `lyria-3-pro-preview` with `outputMimeType: "audio/wav"`; Gemini API documentation explicitly supports WAV output for Lyria 3 Pro.
- Do not globally reject `gemini-3.1-flash-image-preview` with `imageSize: "0.5K"` and asymmetric aspect ratios; official image documentation lists `0.5K` and the new asymmetric ratios as Nano Banana 2 capabilities.
- Do not infer Gemini Developer API model availability from Vertex-only experiments. Use official docs or direct API-mode validation.

## Rationale

Backend-specific static tables solve the immediate compatibility mismatch without adding network-dependent boot behavior. They make the current schema deterministic, testable, and aligned with official model IDs.

Boot-time `models.list()` probing remains useful for future model catalog drift, but it should not be required to start the MCP server. It also cannot replace static parameter rules because model listing APIs do not necessarily expose all request-field constraints.

## Consequences

### Positive

- Gemini Developer API mode no longer false-rejects current Veo 3.1 preview model IDs.
- Gemini Developer API mode no longer sends `generateAudio` or `seed` fields that `@google/genai` rejects for `generateVideos`.
- Vertex mode keeps existing GA model IDs and multi-video behavior.
- MCP clients see backend-appropriate video tool metadata.
- MCP clients see backend-appropriate Lyria output MIME metadata.
- Image generation validation now matches documented `thinkingLevel` and `gemini-2.5-flash-image` reference-image limits.

### Tradeoffs

- Static capability tables still require maintenance when Google changes model IDs or parameter limits.
- Some constraints remain intentionally conservative, such as mode-specific `personGeneration` in Gemini Developer API mode.
- Boot-time capability probing is deferred, so the server does not automatically discover newly released models.

## Implementation Notes

- `src/schemas/index.ts`
  - Added `ALLOWED_VERTEX_VIDEO_MODELS` and `ALLOWED_GEMINI_API_VIDEO_MODELS`.
  - Added `getAllowedVideoModels(useVertexAI)`.
  - Added `getDefaultVideoModel(useVertexAI)`.
  - Added `buildVideoGenerationSchema(useVertexAI)`.
  - Added `buildMusicGenerationSchema(useVertexAI)` and backend-specific Lyria output MIME validation.
  - Kept `VideoGenerationSchema` as the Vertex default.
  - Tightened image `thinkingLevel` and `gemini-2.5-flash-image` reference-image validation.

- `src/server/GeminiAIMCPServer.ts`
  - Builds `generate_video` tool metadata from the active backend.
  - Builds `generate_music` output MIME metadata from the active backend.
  - Parses `generate_video` calls with `buildVideoGenerationSchema(this.config.useVertexAI)`.
  - Parses `generate_music` calls with `buildMusicGenerationSchema(this.config.useVertexAI)`.

- `src/services/GeminiAIService.ts`
  - Selects the backend-specific default Veo model.
  - Sends `generateAudio` and `seed` only in Vertex mode.

- Tests were updated to cover Vertex defaults, Gemini Developer API preview models, backend-specific video metadata, image limits, and service request parameters.

## Future Work

1. Add a non-blocking `CapabilityProbe` that can call `models.list()` once at startup.
2. Merge probe results with static parameter caps, using static caps as fallback.
3. Add an explicit unknown-model escape hatch only if users need early access to newly launched models.
4. Re-run the backend matrix in a real Gemini Developer API environment with an API key.
5. Record observed backend differences in a maintained capability table rather than handoff notes.

## Verification

Verification run during implementation:

- `npm run build`: PASS
- Local Node schema compatibility check against `build/schemas/index.js`: PASS
- Local Node service request-parameter check against `build/services/GeminiAIService.js`: PASS

Vitest was not run because `vitest` is not installed locally in this checkout. Attempting to download and run it through `npx` required network access and external package execution, which was rejected by the sandbox approval policy.

## References

- Gemini API Veo 3.1 model versions and output limits: https://ai.google.dev/gemini-api/docs/video
- Vertex AI Veo 3.1 model IDs and limits: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate
- Vertex AI Veo request parameters: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
- Gemini image generation thinking levels and reference-image guidance: https://ai.google.dev/gemini-api/docs/image-generation
- Vertex AI Gemini 2.5 Flash Image limits: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
- Gemini API Lyria 3 output format: https://ai.google.dev/gemini-api/docs/music-generation
