# Multimodal Input Support

The Gemini MCP Server now supports multimodal inputs, allowing you to send images, audio, video, and code files alongside text prompts to Gemini models.

## Supported Media Types

### Images
- `image/jpeg`, `image/jpg`
- `image/png`
- `image/webp`
- `image/heic`, `image/heif`

### Videos
- `video/mp4`
- `video/mpeg`, `video/mpg`
- `video/mov`
- `video/avi`
- `video/x-flv`
- `video/webm`
- `video/wmv`
- `video/3gpp`

### Audio
- `audio/wav`
- `audio/mp3`
- `audio/aiff`
- `audio/aac`
- `audio/ogg`
- `audio/flac`

### Documents/Code
- `application/pdf`
- `text/plain`
- `text/html`, `text/css`, `text/javascript`
- `text/x-typescript`, `application/x-typescript`
- `text/csv`
- `text/markdown`
- `text/x-python`, `application/x-python-code`
- `application/json`
- `text/xml`
- `application/rtf`

## Usage

### Basic Structure

The `query` tool now accepts an optional `parts` array that can contain multimodal content:

```json
{
  "name": "query",
  "arguments": {
    "prompt": "What's in this image?",
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "<base64-encoded-image-data>"
        }
      }
    ]
  }
}
```

### Inline Data (Base64 Encoded)

For small files, you can send them as base64-encoded inline data:

```json
{
  "name": "query",
  "arguments": {
    "prompt": "Analyze this code",
    "parts": [
      {
        "inlineData": {
          "mimeType": "text/x-python",
          "data": "ZGVmIGhlbGxvKCk6CiAgICBwcmludCgiSGVsbG8sIFdvcmxkISIp"
        }
      }
    ]
  }
}
```

### File URIs (Cloud Storage)

For large files, use Cloud Storage URIs:

```json
{
  "name": "query",
  "arguments": {
    "prompt": "Summarize this video",
    "parts": [
      {
        "fileData": {
          "mimeType": "video/mp4",
          "fileUri": "gs://my-bucket/video.mp4"
        }
      }
    ]
  }
}
```

### Multiple Files

You can include multiple files in a single query:

```json
{
  "name": "query",
  "arguments": {
    "prompt": "Compare these two images",
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "<base64-image-1>"
        }
      },
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "<base64-image-2>"
        }
      }
    ]
  }
}
```

### Mixed Content

You can mix different types of media:

```json
{
  "name": "query",
  "arguments": {
    "prompt": "Create a presentation based on this audio transcript and these images",
    "parts": [
      {
        "inlineData": {
          "mimeType": "audio/mp3",
          "data": "<base64-audio>"
        }
      },
      {
        "inlineData": {
          "mimeType": "image/png",
          "data": "<base64-image>"
        }
      }
    ]
  }
}
```

## Examples

### Example 1: Image Analysis

```javascript
const base64Image = Buffer.from(imageBuffer).toString('base64');

const response = await client.callTool({
  name: "query",
  arguments: {
    prompt: "What objects do you see in this image?",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]
  }
});
```

### Example 2: Code Review

```javascript
const codeContent = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
`;

const base64Code = Buffer.from(codeContent).toString('base64');

const response = await client.callTool({
  name: "query",
  arguments: {
    prompt: "Review this code and suggest improvements",
    parts: [
      {
        inlineData: {
          mimeType: "text/x-python",
          data: base64Code
        }
      }
    ]
  }
});
```

### Example 3: Video Analysis with Cloud Storage

```javascript
const response = await client.callTool({
  name: "query",
  arguments: {
    prompt: "Describe the key scenes in this video",
    parts: [
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: "gs://my-bucket/presentation.mp4"
        }
      }
    ]
  }
});
```

### Example 4: Audio Transcription

```javascript
const audioBuffer = fs.readFileSync('audio.mp3');
const base64Audio = audioBuffer.toString('base64');

const response = await client.callTool({
  name: "query",
  arguments: {
    prompt: "Transcribe this audio and provide a summary",
    parts: [
      {
        inlineData: {
          mimeType: "audio/mp3",
          data: base64Audio
        }
      }
    ]
  }
});
```

## Model Compatibility

Multimodal support requires using a Gemini model that supports multimodal inputs. Recommended models:

- `gemini-2.0-flash-exp` (Experimental, best multimodal support)
- `gemini-2.5-pro` (Production-ready, strong multimodal)
- `gemini-1.5-pro` (Stable, good multimodal)
- `gemini-1.5-flash` (Fast, multimodal capable)

Set your model in the environment:

```bash
export GEMINI_MODEL="gemini-2.0-flash-exp"
```

## File Size Limits

### Inline Data (Base64)
- **Images**: Up to 20MB (base64 encoded)
- **Audio**: Up to 20MB
- **Video**: Recommended to use Cloud Storage URIs for videos
- **Documents**: Up to 20MB

### Cloud Storage URIs
- No practical size limit
- Files must be accessible from your Vertex AI project
- Use `gs://` URIs for Google Cloud Storage
- Public `https://` URLs may also work for some file types

## Best Practices

1. **Use Cloud Storage for Large Files**: For videos and large files, upload them to Cloud Storage and use `fileUri` instead of `inlineData`

2. **Optimize Image Size**: Resize images to reasonable dimensions before encoding to base64

3. **Batch Related Queries**: Send multiple related files in one query rather than separate queries

4. **Choose the Right Model**: Use models with multimodal capabilities (e.g., `gemini-2.0-flash-exp`, `gemini-2.5-pro`)

5. **Validate MIME Types**: Ensure you're using supported MIME types from the list above

6. **Consider Context Length**: Large multimodal inputs consume more of the model's context window

## Limitations

- Multimodal parts are only included in the **first turn** of an agentic loop
- Subsequent turns in multi-turn conversations use text-only context
- Some models may have specific limitations on multimodal content
- File URIs must be accessible from your Vertex AI project

## Error Handling

If an unsupported MIME type is provided, a warning will be logged, but the request will still be sent to Gemini (the API may reject it):

```
WARN: Unsupported MIME type: image/bmp. Including anyway.
```

For API errors related to multimodal content, check:
- File is properly base64 encoded
- MIME type matches the actual file type
- File size is within limits
- Model supports multimodal inputs
- Cloud Storage URIs are accessible

## Migration from Text-Only

Existing text-only queries continue to work without changes:

```json
{
  "name": "query",
  "arguments": {
    "prompt": "What is the capital of France?"
  }
}
```

The `parts` parameter is optional and backward compatible.
