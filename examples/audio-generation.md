# Audio Generation Examples

This example demonstrates how to use the `generate_speech` and `generate_music` tools with the Gemini MCP Server.

## Speech: Single Speaker

```typescript
const request = {
  name: "generate_speech",
  arguments: {
    prompt: "Say with a calm narrator voice: The deployment completed successfully.",
    voiceName: "Kore"
  }
};

const response = await mcpClient.callTool(request);
const info = JSON.parse(response.content.find(c => c.type === "text").text);
console.log("Saved speech:", info.speech[0].filePath);
```

## Speech: Two Speakers

```typescript
const request = {
  name: "generate_speech",
  arguments: {
    prompt: `Host: Today we are reviewing the new release.
Guest: The biggest improvement is lower latency for multimodal requests.`,
    model: "gemini-3.1-flash-tts-preview",
    speakers: [
      { speaker: "Host", voiceName: "Kore" },
      { speaker: "Guest", voiceName: "Puck" }
    ]
  }
};
```

## Music: Lyria Clip

```typescript
const request = {
  name: "generate_music",
  arguments: {
    prompt: "Create a 30-second bright synthwave loop with pulsing bass and airy pads.",
    model: "lyria-3-clip-preview"
  }
};

const response = await mcpClient.callTool(request);
const info = JSON.parse(response.content.find(c => c.type === "text").text);
console.log("Saved music:", info.music[0].filePath);
```

## Music: Lyria Pro WAV

```typescript
const request = {
  name: "generate_music",
  arguments: {
    prompt: "A two-minute cinematic orchestral cue with a quiet piano opening, rising strings, and a warm brass finale.",
    model: "lyria-3-pro-preview",
    outputMimeType: "audio/wav"
  }
};
```

## Using with MCP Inspector

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_speech",
    "arguments": {
      "prompt": "Say cheerfully: Build and tests passed.",
      "voiceName": "Kore"
    }
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "generate_music",
    "arguments": {
      "prompt": "A calm lo-fi instrumental loop with soft keys and vinyl texture."
    }
  }
}
```

## Output Locations

Default output directories:

- Speech: `~/Music/gemini-generated/speech`
- Music: `~/Music/gemini-generated/music`
- Windows speech: `%USERPROFILE%\Music\gemini-generated\speech`
- Windows music: `%USERPROFILE%\Music\gemini-generated\music`

Override them with:

```bash
export GEMINI_SPEECH_OUTPUT_DIR="/path/to/speech"
export GEMINI_MUSIC_OUTPUT_DIR="/path/to/music"
```

## Response Format

Speech returns a saved WAV file and an MCP audio content block:

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

Music returns saved audio paths, MCP audio content, and any Lyria text parts:

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
