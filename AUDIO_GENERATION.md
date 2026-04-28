# Audio Generation

The server provides two file-based audio generation tools:

- `generate_speech`: Gemini TTS text-to-speech output, saved as WAV
- `generate_music`: Lyria music generation output, saved as MP3 or WAV

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
| `lyria-3-pro-preview` | MP3 or WAV | Full-length songs with more structure; WAV can be requested with `outputMimeType` |

### Clip

```json
{
  "name": "generate_music",
  "arguments": {
    "prompt": "Create a 30-second upbeat acoustic folk loop with guitar and hand percussion."
  }
}
```

### Pro WAV

```json
{
  "name": "generate_music",
  "arguments": {
    "prompt": "An atmospheric ambient track with warm pads, slow piano, and subtle field recordings.",
    "model": "lyria-3-pro-preview",
    "outputMimeType": "audio/wav"
  }
}
```

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
- `generate_music` supports optional `imagePaths` for image-guided Lyria 3 requests, up to 10 images.
- Lyria 3 preview controls exposed by this tool are prompt-level controls: `lyrics`, `instrumental`, `vocalStyle`, `durationSeconds`, `bpm`, and `intensity`.
- Lyria 3 model-side features such as audio watermarking, input filtering, recitation filtering, vocal-likeness filtering, and prompt rewriting run automatically and are not exposed as toggleable parameters.
- `generate_music` does not accept audio or video sources; use `query` for audio/video understanding workflows.
- For very large audio outputs, prefer using the saved file path from the text content block.
