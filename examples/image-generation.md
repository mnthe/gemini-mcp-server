# Image Generation Example

This example demonstrates how to use the `generate_image` tool with the Gemini MCP Server.

## Basic Usage

```typescript
const request = {
  name: "generate_image",
  arguments: {
    prompt: "A serene mountain landscape at golden hour with snow-capped peaks reflecting in a calm lake"
  }
};

const response = await mcpClient.callTool(request);
console.log(response);
```

The response contains:
- A `text` content block with a JSON object listing saved file paths and MIME types
- One or more `image` content blocks with base64-encoded image data

## Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"images\":[{\"filePath\":\"/tmp/gemini-images/gemini-image-1-20260221T120000Z.png\",\"mimeType\":\"image/png\"}],\"text\":null}"
    },
    {
      "type": "image",
      "data": "<base64-encoded image data>",
      "mimeType": "image/png"
    }
  ]
}
```

## Model Selection

Three image generation models are available:

| Model | Description |
|-------|-------------|
| `gemini-3-pro-image-preview` | Default. Professional asset production, supports up to 4K resolution |
| `gemini-3.1-flash-image-preview` | High-efficiency with 0.5K-4K, reference images, and new aspect ratios |
| `gemini-2.5-flash-image` | Fast 1K image generation and editing |

```typescript
const request = {
  name: "generate_image",
  arguments: {
    prompt: "A photorealistic portrait of a red fox in a forest",
    model: "gemini-3.1-flash-image-preview"
  }
};
```

## Aspect Ratio

Control the image dimensions with the `aspectRatio` parameter. Defaults to `1:1`.

| Value | Use Case |
|-------|----------|
| `1:1` | Square (default), social media posts |
| `1:4` | Tall banner (requires `gemini-3.1-flash-image-preview`) |
| `1:8` | Extra-tall strip (requires `gemini-3.1-flash-image-preview`) |
| `2:3` | Portrait, mobile wallpaper |
| `3:2` | Landscape, photography standard |
| `3:4` | Portrait, tablet screen |
| `4:1` | Wide banner (requires `gemini-3.1-flash-image-preview`) |
| `4:3` | Landscape, classic photo |
| `4:5` | Portrait, Instagram |
| `5:4` | Landscape |
| `8:1` | Extra-wide strip (requires `gemini-3.1-flash-image-preview`) |
| `9:16` | Portrait, mobile/story |
| `16:9` | Widescreen, desktop wallpaper |
| `21:9` | Ultrawide, cinematic |

```typescript
const request = {
  name: "generate_image",
  arguments: {
    prompt: "A cinematic wide shot of a futuristic city skyline at night",
    aspectRatio: "16:9"
  }
};
```

## Image Size (Resolution)

The `imageSize` parameter sets the output resolution. Defaults to `1K`.

| Value | Resolution | Supported Models |
|-------|------------|-----------------|
| `0.5K` | ~512px | `gemini-3.1-flash-image-preview` |
| `1K` | ~1024px (default) | `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`; omit `imageSize` for `gemini-2.5-flash-image` |
| `2K` | ~2048px | `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview` |
| `4K` | ~4096px | `gemini-3-pro-image-preview` or `gemini-3.1-flash-image-preview` |

```typescript
const request = {
  name: "generate_image",
  arguments: {
    prompt: "Ultra-detailed macro photograph of a butterfly wing",
    model: "gemini-3.1-flash-image-preview",
    imageSize: "4K"
  }
};
```

## Full Example with All Parameters

```typescript
const request = {
  name: "generate_image",
  arguments: {
    prompt: "A dramatic oil painting of a Viking longship on stormy seas, massive waves, lightning in the background, cinematic composition",
    model: "gemini-3-pro-image-preview",
    aspectRatio: "21:9",
    imageSize: "4K"
  }
};

const response = await mcpClient.callTool(request);

// Parse saved file info
const textContent = response.content.find(c => c.type === 'text');
const info = JSON.parse(textContent.text);
console.log('Saved to:', info.images[0].filePath);
```

## Using with MCP Inspector

If testing via the MCP Inspector:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_image",
    "arguments": {
      "prompt": "A cozy Japanese tea house surrounded by cherry blossoms in spring",
      "aspectRatio": "4:3",
      "imageSize": "2K"
    }
  }
}
```

## Image Output Location

Generated images are automatically saved to disk. The default output directory is:

- Linux/macOS: `~/Pictures/gemini-generated`
- Windows: `%USERPROFILE%\Pictures\gemini-generated`
- Configurable via `GEMINI_IMAGE_OUTPUT_DIR` environment variable

```bash
export GEMINI_IMAGE_OUTPUT_DIR="/path/to/output/directory"
```

## Prompting Tips

1. **Be specific** - Include style, lighting, mood, and composition details
2. **Use artistic references** - "in the style of impressionism", "cinematic lighting", "golden hour"
3. **Specify what to avoid** - Some models support negative prompts in the main prompt field
4. **For 4K results** - Use `gemini-3-pro-image-preview` or `gemini-3.1-flash-image-preview` with `imageSize: "4K"`; prompts with fine detail benefit most from higher resolution
