# Audio Generation

The server provides two file-based audio generation tools:

- `generate_speech`: Gemini TTS text-to-speech output, saved as WAV
- `generate_music`: Lyria music generation output, saved as MP3; Gemini API/AI Studio mode can request WAV for `lyria-3-pro-preview`

Both tools save generated files to disk and return MCP `audio` content blocks with base64-encoded audio data.

## Output Directories

Default output directories follow the same generated-file convention as image and video generation:

| Tool | macOS | Windows | Linux |
|------|-------|---------|-------|
| `generate_speech` | `~/Music/gemini-generated/speech` | `%USERPROFILE%\Music\gemini-generated\speech` | `~/Music/gemini-generated/speech` |
| `generate_music` | `~/Music/gemini-generated/music` | `%USERPROFILE%\Music\gemini-generated\music` | `~/Music/gemini-generated/music` |

Override these with environment variables:

```bash
export GEMINI_SPEECH_OUTPUT_DIR="/path/to/speech"
export GEMINI_MUSIC_OUTPUT_DIR="/path/to/music"
```

## generate_speech

Use `generate_speech` for exact text recitation, narration, short dialogue, podcast-style snippets, and audiobook-style audio.

Gemini TTS accepts text-only input, returns audio-only output, has a 32k-token context limit, and does not support streaming in this file-output tool.

### Models

| Model | Notes |
|-------|-------|
| `gemini-3.1-flash-tts-preview` | Default, low-latency Gemini TTS |
| `gemini-2.5-flash-preview-tts` | Fast, cost-efficient Gemini TTS |
| `gemini-2.5-pro-preview-tts` | Higher-quality Gemini TTS for longer narration |

### Single Speaker

```json
{
  "name": "generate_speech",
  "arguments": {
    "prompt": "Say warmly: Welcome to the weekly product review.",
    "voiceName": "Kore"
  }
}
```

### Two Speakers

The `speakers` array must contain exactly two entries. Each `speaker` value should match the speaker labels used in the prompt.

```json
{
  "name": "generate_speech",
  "arguments": {
    "prompt": "Host: Welcome back.\nGuest: Thanks for having me.",
    "speakers": [
      { "speaker": "Host", "voiceName": "Kore" },
      { "speaker": "Guest", "voiceName": "Puck" }
    ]
  }
}
```

### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"speech\":[{\"filePath\":\"/Users/me/Music/gemini-generated/speech/speech-20260428143000-001.wav\",\"mimeType\":\"audio/wav\",\"sourceMimeType\":\"audio/pcm\"}]}"
    },
    {
      "type": "audio",
      "data": "<base64-encoded wav data>",
      "mimeType": "audio/wav"
    }
  ]
}
```

The Gemini TTS API returns PCM audio. The server wraps it in a WAV container before saving and returning it.

## generate_music

Use `generate_music` for Lyria music generation.

### Models

| Model | Output | Notes |
|-------|--------|-------|
| `lyria-3-clip-preview` | MP3 | Default. Short 30-second clips, loops, and previews |
| `lyria-3-pro-preview` | MP3; WAV in Gemini API/AI Studio mode | Full-length songs with more structure; Vertex AI mode supports MP3 only |

### Clip

```json
{
  "name": "generate_music",
  "arguments": {
    "prompt": "Create a 30-second upbeat acoustic folk loop with guitar and hand percussion."
  }
}
```

### Pro Full Song

```json
{
  "name": "generate_music",
  "arguments": {
    "prompt": "An atmospheric ambient track with warm pads, slow piano, and subtle field recordings.",
    "model": "lyria-3-pro-preview",
    "outputMimeType": "audio/mp3",
    "durationSeconds": 120
  }
}
```

In Gemini API/AI Studio mode, `lyria-3-pro-preview` can also request `"outputMimeType": "audio/wav"`. In Vertex AI mode, Lyria 3 model card support is `audio/mp3` only.

### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"music\":[{\"filePath\":\"/Users/me/Music/gemini-generated/music/music-20260428143000-001.mp3\",\"mimeType\":\"audio/mp3\"}],\"text\":\"<lyrics or song structure>\"}"
    },
    {
      "type": "audio",
      "data": "<base64-encoded audio data>",
      "mimeType": "audio/mp3"
    }
  ]
}
```

Lyria responses can include both audio and text parts. The server iterates over all response parts and does not assume that lyrics, song structure, or audio appears first.

## Notes

- These tools are file-output generation tools. They do not use the Gemini Live API or Lyria RealTime.
- `generate_speech` is text-only input and audio-only output at the model layer.
- Gemini TTS returns PCM audio; the server saves and returns it as WAV.
- `generate_music` supports optional `imagePaths` for image-guided Lyria 3 requests, up to 10 images. Supported file types are PNG (`.png`), JPEG (`.jpg`, `.jpeg`), WEBP (`.webp`), HEIC (`.heic`), and HEIF (`.heif`).
- Lyria 3 Clip is fixed at 30 seconds. Lyria 3 Pro supports target durations up to 184 seconds; Lyria supports one clip per prompt, 44.1 kHz output, and MP3 at 192 kbps in Vertex AI mode.
- Supported Lyria 3 language directions are English, German, Spanish, French, Hindi, Japanese, Korean, and Portuguese.
- Lyria 3 preview controls exposed by this tool are prompt-level controls: `lyrics`, `instrumental`, `vocalStyle`, `language`, `durationSeconds`, `bpm`, and `intensity`.
- Lyria 3 model-side features such as audio watermarking, input filtering, recitation filtering, vocal-likeness filtering, and prompt rewriting run automatically and are not exposed as toggleable parameters.
- Lyria 3 negative prompting is not supported.
- Lyria 3 accepts text prompts and optional image references only. `generate_music` does not accept audio or video source files; use `query` for audio/video understanding workflows, then pass the extracted style or structure as text to `generate_music`.
- For very large audio outputs, prefer using the saved file path from the text content block.
