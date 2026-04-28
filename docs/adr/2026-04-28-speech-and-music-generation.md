# ADR: Speech and Music Generation Tools

## Status

Accepted — 2026-04-28

## Context

The server already supports file-based image and video generation through MCP tools. Users also need file-based audio generation that follows the same interaction pattern: validate input, call Gemini or Lyria, save generated media to disk, and return useful MCP content blocks.

There are two distinct audio generation use cases:

1. Text-to-speech narration and dialogue through Gemini TTS
2. Music generation through Lyria

The Gemini Live API and Lyria RealTime support real-time streaming workflows, but those require session and stream lifecycle management that does not fit the current stdio MCP tool pattern.

## Decision

Implement two synchronous file-output MCP tools:

1. `generate_speech`
   - Uses Gemini TTS models through `models.generateContent`
   - Default model: `gemini-3.1-flash-tts-preview`
   - Supports single-speaker `voiceName`
   - Supports exactly two speakers through `{ speaker, voiceName }[]`
   - Converts PCM output into WAV before saving and returning

2. `generate_music`
   - Uses Lyria 3 models through `models.generateContent`
   - Default model: `lyria-3-clip-preview`
   - Supports `lyria-3-pro-preview` for longer structured music
   - Supports `outputMimeType: audio/mp3` in Vertex AI mode, and `audio/wav` only with `lyria-3-pro-preview` in Gemini Developer API / AI Studio mode
   - Supports image-guided music inputs through `imagePaths` with a maximum of 10 images
   - Supports prompt-level controls for user-provided lyrics, vocal direction, language, instrumental mode, target duration, BPM, and intensity
   - Preserves any lyrics or song-structure text returned by Lyria

3. Shared generated-file utilities
   - Introduce `generatedFileSaver` for default output directories, directory creation, buffer/base64 saving, MIME extension mapping, and timestamped filenames
   - Refactor image and video savers to use the shared utility
   - Add `audioSaver` for speech/music filenames and PCM-to-WAV wrapping

4. Platform-aware default directories
   - Images: `~/Pictures/gemini-generated`
   - Videos: `~/Movies/gemini-generated` on macOS, `~/Videos/gemini-generated` on Windows/Linux
   - Speech: `~/Music/gemini-generated/speech`
   - Music: `~/Music/gemini-generated/music`

5. Backend mode
   - Use the same `GeminiAIService` client as the other tools
   - Support both Vertex AI and Google AI Studio / Gemini Developer API modes

## Rationale

- **Tool separation**: Speech and music have different model families, inputs, output formats, and user expectations. Separate tools avoid overloading a generic `generate_audio` tool.
- **File-output consistency**: Generated audio follows the same durable-output pattern as image and video generation.
- **MCP compatibility**: MCP supports `audio` content blocks, so the tools return both saved file paths and inline audio content.
- **Streaming avoided**: Live API and Lyria RealTime are intentionally excluded because they need long-lived sessions and streaming controls outside the current request-response tool model.
- **Shared persistence**: A common file saver avoids duplicating platform directory logic across image, video, speech, and music generation.

## Consequences

### Positive

- Users can generate speech and music without leaving the MCP file-output workflow.
- Windows, macOS, and Linux all get explicit generated-media defaults.
- Existing image/video persistence now shares the same base save helpers.
- The implementation can later add additional audio models without changing the server flow.

### Tradeoffs

- Large Lyria Pro outputs are returned as MCP audio content as well as saved files, which can increase response size.
- TTS output is normalized to WAV, so the saved MIME type differs from raw PCM returned by the model.
- Audio and video source files are intentionally not accepted by `generate_speech` or `generate_music`; use `query` for audio/video understanding.
- Lyria RealTime and Gemini Live API remain unsupported by these tools.

## Implementation Notes

- `SpeechGenerationSchema` validates supported Gemini TTS models and rejects `voiceName` when multi-speaker config is used.
- `buildMusicGenerationSchema(useVertexAI)` validates Lyria 3 models, limits image inputs to 10, uses backend-specific output MIME rules, and rejects incompatible prompt-level controls.
- Vertex AI mode accepts `audio/mp3` only per the Lyria 3 model card; Gemini Developer API / AI Studio mode accepts `audio/wav` only with `lyria-3-pro-preview`.
- Lyria 3 Clip is fixed at 30 seconds. Lyria 3 Pro target duration is capped at 184 seconds. Lyria 3 supports one clip per prompt, 44.1 kHz output, MP3 at 192 kbps in Vertex AI mode, and language directions for English, German, Spanish, French, Hindi, Japanese, Korean, and Portuguese.
- Lyria 3 watermarking, input filtering, recitation filtering, vocal-likeness filtering, and prompt rewriting are model-side features; negative prompting is unsupported; the tool documents model-side features but does not expose toggles.
- Lyria response parsing iterates over all parts and does not assume text or audio ordering.
- `GEMINI_SPEECH_OUTPUT_DIR` and `GEMINI_MUSIC_OUTPUT_DIR` override the default output directories.

## Verification

Verification run:

- `npm run build`: PASS
- `node --input-type=module -e "<schema smoke test>"`: PASS for Vertex/Gemini API music output MIME rules and Veo source file type rules
- `npm ls vitest`: no local `vitest` install in this workspace, so unit tests were not run in the current checkout
