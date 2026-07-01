# Video Generation Examples

This example demonstrates the `generate_video` and `check_video` tools.

Image source fields (`imagePath`, `lastFramePath`, `referenceImagePaths`) accept PNG (`.png`), JPEG (`.jpg`, `.jpeg`), and WEBP (`.webp`). `videoPath` is for Veo-generated 720p MP4 (`.mp4`) extension sources. Audio files are not accepted as references; describe dialogue, sound effects, and ambience in the prompt.

## Text to Video

```typescript
{
  name: "generate_video",
  arguments: {
    prompt: "A cinematic tracking shot through a quiet neon-lit robotics lab.",
    model: "veo-3.1-fast-generate-001",
    durationSeconds: "8",
    resolution: "1080p",
    enhancePrompt: true
  }
}
```

## Image to Video

```typescript
{
  name: "generate_video",
  arguments: {
    prompt: "Animate the subject with a slow camera push-in and soft ambient motion.",
    model: "veo-3.1-generate-001",
    imagePath: "/path/to/first-frame.png",
    durationSeconds: "8",
    resolution: "720p"
  }
}
```

## First and Last Frame

```typescript
{
  name: "generate_video",
  arguments: {
    prompt: "Create a smooth transition between these two frames.",
    model: "veo-3.1-generate-001",
    imagePath: "/path/to/start-frame.png",
    lastFramePath: "/path/to/end-frame.png",
    durationSeconds: "8",
    resolution: "720p"
  }
}
```

## Reference Images

`referenceImagePaths` is a separate source mode. Do not combine it with `imagePath`, `lastFramePath`, or `videoPath`.

```typescript
{
  name: "generate_video",
  arguments: {
    prompt: "Generate a product video preserving the character and item details from these references.",
    model: "veo-3.1-generate-001",
    referenceImagePaths: [
      "/path/to/character.png",
      "/path/to/product.png"
    ],
    durationSeconds: "8",
    resolution: "720p",
    personGeneration: "allow_adult"
  }
}
```

## Extend a Veo Video

`videoPath` is for Veo extension. The source video should be a Veo-generated 720p video from a recent generation.

```typescript
{
  name: "generate_video",
  arguments: {
    prompt: "Continue the shot as the subject walks into the hallway and the camera follows.",
    model: "veo-3.1-generate-001",
    videoPath: "/path/to/previous-veo-output.mp4",
    resolution: "720p"
  }
}
```

## Poll for Completion

```typescript
{
  name: "check_video",
  arguments: {
    operationId: "<operation-id-from-generate_video>"
  }
}
```

When completed, `check_video` saves files under the configured video output directory and returns saved file paths.

## Omni Flash: Synchronous Generation and Interactive Editing

`generate_omni_video` uses the non-Veo Gemini Omni Flash model (`gemini-omni-flash-preview`) on the Google AI Studio (Gemini API) backend. Unlike `generate_video`, it is synchronous: a single call returns the finished, saved video, so there is no `operationId` and no `check_video` polling. Output is 720p only, aspect ratio is `16:9` or `9:16`, clips run a few seconds (steer timing within the prompt — there is no duration parameter), and a synced audio track is generated automatically.

Oneshot generation (text-to-video). Add `imagePaths` (max 7, PNG/JPEG/WEBP) for image- or reference-to-video.

```typescript
{
  name: "generate_omni_video",
  arguments: {
    prompt: "A cinematic tracking shot through a quiet neon-lit robotics lab, soft ambient hum.",
    aspectRatio: "16:9"
  }
}
```

The response text includes an `interactionId` and the saved file path. Pass that `interactionId` back as `previousInteractionId` to conversationally edit the same video with a natural-language instruction, with no image re-upload. Chain up to 3 sequential edits.

```typescript
{
  name: "generate_omni_video",
  arguments: {
    prompt: "Add warm sunrise lighting and slow the camera down.",
    previousInteractionId: "<interactionId-from-previous-call>"
  }
}
```
