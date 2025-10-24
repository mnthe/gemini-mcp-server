# Multimodal Parts Quick Reference for Agents

This is a quick reference guide for MCP client and agent developers who need to construct multimodal requests.

## TL;DR - Parts Array Structure

```json
{
  "name": "query",
  "arguments": {
    "prompt": "Your question (required)",
    "parts": [  // Optional array
      {
        // ONE of these three options per part:
        "text": "Additional text",
        // OR
        "inlineData": {
          "mimeType": "image/jpeg",     // required
          "data": "base64string..."      // required
        },
        // OR
        "fileData": {
          "mimeType": "video/mp4",       // required
          "fileUri": "gs://bucket/file"  // required (gs:// or https://)
        }
      }
    ]
  }
}
```

## Quick Examples

### Single Image
```json
{
  "name": "query",
  "arguments": {
    "prompt": "What's in this image?",
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "/9j/4AAQSkZJRg..."
        }
      }
    ]
  }
}
```

### Video from Cloud Storage
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
```json
{
  "name": "query",
  "arguments": {
    "prompt": "Compare these images",
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "base64image1..."
        }
      },
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "base64image2..."
        }
      }
    ]
  }
}
```

### Mixed Content
```json
{
  "name": "query",
  "arguments": {
    "prompt": "Analyze this presentation",
    "parts": [
      {
        "text": "Context: Q4 2024 results"
      },
      {
        "inlineData": {
          "mimeType": "image/png",
          "data": "base64chart..."
        }
      },
      {
        "fileData": {
          "mimeType": "video/mp4",
          "fileUri": "gs://bucket/demo.mp4"
        }
      }
    ]
  }
}
```

## Validation Checklist

Before sending, ensure:
- [ ] `prompt` is present (required)
- [ ] `parts` is an array or omitted
- [ ] Each part has exactly ONE of: `text`, `inlineData`, or `fileData`
- [ ] `inlineData.mimeType` and `inlineData.data` are both present
- [ ] `fileData.mimeType` and `fileData.fileUri` are both present
- [ ] MIME types are from supported list
- [ ] Base64 data is properly encoded
- [ ] File URIs start with `gs://` or `https://`

## Common MIME Types

**Images:** `image/jpeg`, `image/png`, `image/webp`  
**Videos:** `video/mp4`, `video/mov`, `video/webm`  
**Audio:** `audio/mp3`, `audio/wav`, `audio/aac`  
**Documents:** `application/pdf`, `text/plain`, `text/markdown`  
**Code:** `text/x-python`, `text/javascript`, `application/json`

See [MULTIMODAL.md](../MULTIMODAL.md) for the complete list.

## Error Prevention

### ❌ Don't Do This
```json
// Missing required field
{"inlineData": {"mimeType": "image/jpeg"}}

// Multiple content types in one part
{"inlineData": {...}, "fileData": {...}}

// Invalid URI format
{"fileData": {"fileUri": "file:///local/path"}}

// Not base64 encoded
{"inlineData": {"data": "raw binary data"}}
```

### ✅ Do This
```json
// Complete inlineData
{"inlineData": {"mimeType": "image/jpeg", "data": "base64..."}}

// Separate parts for different content
[{"inlineData": {...}}, {"fileData": {...}}]

// Valid URI
{"fileData": {"fileUri": "gs://bucket/file"}}

// Properly base64 encoded
{"inlineData": {"data": "base64EncodedString..."}}
```

## Code Snippets

### JavaScript/TypeScript
```javascript
// Encode file to base64
const fs = require('fs');
const imageBuffer = fs.readFileSync('./image.jpg');
const base64Image = imageBuffer.toString('base64');

// Construct request
const request = {
  name: "query",
  arguments: {
    prompt: "Analyze this image",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]
  }
};
```

### Python
```python
import base64

# Encode file to base64
with open('image.jpg', 'rb') as f:
    base64_image = base64.b64encode(f.read()).decode('utf-8')

# Construct request
request = {
    "name": "query",
    "arguments": {
        "prompt": "Analyze this image",
        "parts": [
            {
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": base64_image
                }
            }
        ]
    }
}
```

### Go
```go
import (
    "encoding/base64"
    "os"
)

// Encode file to base64
data, _ := os.ReadFile("image.jpg")
base64Image := base64.StdEncoding.EncodeToString(data)

// Construct request
request := map[string]interface{}{
    "name": "query",
    "arguments": map[string]interface{}{
        "prompt": "Analyze this image",
        "parts": []map[string]interface{}{
            {
                "inlineData": map[string]string{
                    "mimeType": "image/jpeg",
                    "data":     base64Image,
                },
            },
        },
    },
}
```

## Testing

Use MCP Inspector to test:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Need More Details?

See the full documentation:
- [MULTIMODAL.md](../MULTIMODAL.md) - Complete guide with all details
- [multimodal-usage.md](./multimodal-usage.md) - More code examples
- [README.md](../README.md) - General server documentation
