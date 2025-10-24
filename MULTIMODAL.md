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

### Parts Array Structure for Agents

The `query` tool accepts an optional `parts` array parameter that enables multimodal content. This section provides detailed information for MCP clients and agents on how to properly construct multimodal requests.

#### Parts Array Overview

The `parts` parameter is an **optional array** of multimodal content parts. Each part in the array represents one piece of content (text, image, audio, video, or document).

**Key Points:**
- The `parts` array is **optional** - text-only queries don't need it
- Each part is an **object** with one of three possible structures: `text`, `inlineData`, or `fileData`
- You can mix multiple types of content in a single query
- Parts are processed in order and combined with the main `prompt`

#### Part Object Structure

Each part object in the `parts` array must have **exactly one** of these fields:

1. **`text`** (string, optional): Additional text content
   ```json
   {
     "text": "Additional context or instructions"
   }
   ```

2. **`inlineData`** (object, optional): Base64-encoded file content
   ```json
   {
     "inlineData": {
       "mimeType": "image/jpeg",  // Required: MIME type string
       "data": "base64string..."   // Required: Base64-encoded file data
     }
   }
   ```

3. **`fileData`** (object, optional): Cloud Storage or public URL reference
   ```json
   {
     "fileData": {
       "mimeType": "video/mp4",              // Required: MIME type string
       "fileUri": "gs://bucket/file.mp4"     // Required: URI string (gs:// or https://)
     }
   }
   ```

#### Field Requirements

**For `inlineData`:**
- `mimeType` (string, required): Must be a valid MIME type from the supported list
- `data` (string, required): Base64-encoded binary data of the file

**For `fileData`:**
- `mimeType` (string, required): Must be a valid MIME type from the supported list
- `fileUri` (string, required): 
  - Cloud Storage: `gs://bucket-name/path/to/file`
  - Public HTTPS: `https://example.com/path/to/file` (subject to security validation)
  
**Security for HTTPS URLs:**
When using HTTPS URLs in `fileUri`, the following security checks are applied:
- Only HTTPS URLs are allowed (HTTP is rejected)
- Private IP addresses are blocked (10.x, 172.16.x, 192.168.x, 127.x)
- DNS validation prevents SSRF attacks

#### Complete Request Schema

```json
{
  "name": "query",
  "arguments": {
    "prompt": "string (required): The main text prompt",
    "sessionId": "string (optional): Session ID for conversation continuity",
    "parts": [
      // Optional array of part objects
      {
        // Include ONE of: text, inlineData, or fileData
        "text": "string (optional)",
        "inlineData": {
          "mimeType": "string (required)",
          "data": "string (required, base64)"
        },
        "fileData": {
          "mimeType": "string (required)",
          "fileUri": "string (required, gs:// or https://)"
        }
      }
    ]
  }
}
```

### Basic Structure

Example of a simple multimodal query with an image:

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

**Security for HTTPS URLs:**

When using HTTPS URLs (e.g., `https://example.com/image.jpg`) instead of Cloud Storage URIs (`gs://`), the server applies the same security validation as the WebFetch tool:

- **HTTPS Only**: Only HTTPS URLs are accepted. HTTP URLs are rejected with a SecurityError.
- **Private IP Blocking**: URLs that resolve to private IP addresses (10.x.x.x, 172.16.x.x, 192.168.x.x, 127.x.x.x) are blocked to prevent SSRF attacks.
- **DNS Validation**: The server performs DNS resolution to check if the hostname resolves to a private IP address.

Cloud Storage URIs (`gs://`) are not subject to these additional security checks as they are managed by Google Cloud Platform.

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

7. **Use HTTPS for Web Resources**: When using HTTPS URLs for `fileUri`, ensure they are publicly accessible and not behind authentication. The server enforces HTTPS-only and blocks private IP addresses for security.

## For Agent/Client Developers

This section provides implementation guidance for developers building MCP clients or agents that need to use multimodal functionality.

### Constructing Parts Arrays

When building a multimodal request, construct the `parts` array as follows:

```typescript
// Example: TypeScript/JavaScript client
interface MultimodalPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;  // base64
  };
  fileData?: {
    mimeType: string;
    fileUri: string;  // gs:// or https://
  };
}

// Build parts array
const parts: MultimodalPart[] = [];

// Add image
parts.push({
  inlineData: {
    mimeType: "image/jpeg",
    data: base64ImageString
  }
});

// Add text context
parts.push({
  text: "This is additional context"
});

// Add video from Cloud Storage
parts.push({
  fileData: {
    mimeType: "video/mp4",
    fileUri: "gs://my-bucket/video.mp4"
  }
});

// Make the request
const request = {
  name: "query",
  arguments: {
    prompt: "Analyze these materials",
    parts: parts
  }
};
```

### Python Client Example

```python
import base64
import json

# Read and encode file
with open("image.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

# Construct request
request = {
    "name": "query",
    "arguments": {
        "prompt": "What's in this image?",
        "parts": [
            {
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": image_data
                }
            }
        ]
    }
}

# Send via MCP client
response = mcp_client.call_tool(request)
```

### Validation Checklist for Agents

Before sending a multimodal request, validate:

1. **Parts Array Structure**
   - ✓ `parts` is an array (or omitted entirely)
   - ✓ Each part is an object
   - ✓ Each part has exactly ONE of: `text`, `inlineData`, or `fileData`

2. **InlineData Validation**
   - ✓ `mimeType` is a non-empty string
   - ✓ `data` is a valid base64-encoded string
   - ✓ `mimeType` matches the actual file type

3. **FileData Validation**
   - ✓ `mimeType` is a non-empty string
   - ✓ `fileUri` starts with `gs://` or `https://`
   - ✓ URI is accessible from the Vertex AI project

4. **General Validation**
   - ✓ `prompt` is always provided (required field)
   - ✓ MIME types are from the supported list
   - ✓ Total request size is reasonable (consider base64 overhead)

### Common Mistakes to Avoid

1. **Missing Required Fields**
   ```json
   // ❌ WRONG: Missing 'data' field
   {
     "inlineData": {
       "mimeType": "image/jpeg"
     }
   }
   
   // ✅ CORRECT
   {
     "inlineData": {
       "mimeType": "image/jpeg",
       "data": "base64string..."
     }
   }
   ```

2. **Multiple Content Types in One Part**
   ```json
   // ❌ WRONG: Can't have both inlineData and fileData
   {
     "inlineData": {...},
     "fileData": {...}
   }
   
   // ✅ CORRECT: Use separate parts
   [
     { "inlineData": {...} },
     { "fileData": {...} }
   ]
   ```

3. **Incorrect Base64 Encoding**
   ```python
   # ❌ WRONG: Not base64 encoded
   data = file.read()
   
   # ✅ CORRECT: Properly base64 encoded
   data = base64.b64encode(file.read()).decode('utf-8')
   ```

4. **Wrong MIME Type**
   ```json
   // ❌ WRONG: Generic or incorrect MIME type
   {
     "inlineData": {
       "mimeType": "application/octet-stream",
       "data": "..."
     }
   }
   
   // ✅ CORRECT: Specific, supported MIME type
   {
     "inlineData": {
       "mimeType": "image/jpeg",
       "data": "..."
     }
   }
   ```

### Testing Multimodal Requests

Use the MCP Inspector to test multimodal functionality:

```bash
# Start MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

Then send a test request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "prompt": "Test multimodal",
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
}
```

### Response Handling

The server will return responses in the standard MCP format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Response from Gemini about the multimodal content..."
    }
  ]
}
```

Errors will be returned in the standard error format. Common multimodal-related errors:
- Invalid MIME type
- Malformed base64 data
- Inaccessible file URI
- File too large
- Model doesn't support multimodal

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

**Security Errors:**

If using HTTPS URLs in `fileData.fileUri`, you may encounter security errors:
- `SecurityError: Only HTTPS URLs are allowed` - The URL must use HTTPS, not HTTP
- `SecurityError: Private IP addresses are not allowed` - The URL resolves to a private IP address and is blocked for security reasons

These security measures protect against Server-Side Request Forgery (SSRF) attacks and follow the same security policy as the WebFetch tool.

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
