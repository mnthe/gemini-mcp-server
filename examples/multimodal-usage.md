# Multimodal Usage Example

This example demonstrates how to use the multimodal input feature with the Gemini MCP Server.

## Example: Image Analysis with Base64 Encoding

```typescript
import * as fs from 'fs';

// Read an image file
const imageBuffer = fs.readFileSync('./path/to/image.jpg');

// Convert to base64
const base64Image = imageBuffer.toString('base64');

// Create MCP tool call request
const request = {
  name: "query",
  arguments: {
    prompt: "What objects do you see in this image? Provide a detailed description.",
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

// Send via MCP client
const response = await mcpClient.callTool(request);
console.log(response);
```

## Example: Video Analysis with Cloud Storage

```typescript
const request = {
  name: "query",
  arguments: {
    prompt: "Summarize the key points from this presentation video.",
    parts: [
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: "gs://my-bucket/presentation-2024.mp4"
        }
      }
    ]
  }
};

const response = await mcpClient.callTool(request);
console.log(response);
```

## Example: Code Review

```typescript
const codeToReview = `
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

def main():
    result = calculate_fibonacci(10)
    print(f"Fibonacci(10) = {result}")

if __name__ == "__main__":
    main()
`;

const base64Code = Buffer.from(codeToReview).toString('base64');

const request = {
  name: "query",
  arguments: {
    prompt: "Review this Python code and suggest improvements for performance and best practices.",
    parts: [
      {
        inlineData: {
          mimeType: "text/x-python",
          data: base64Code
        }
      }
    ]
  }
};

const response = await mcpClient.callTool(request);
console.log(response);
```

## Example: Audio Transcription

```typescript
const audioBuffer = fs.readFileSync('./meeting-recording.mp3');
const base64Audio = audioBuffer.toString('base64');

const request = {
  name: "query",
  arguments: {
    prompt: "Transcribe this audio recording and provide a summary of the main discussion points.",
    parts: [
      {
        inlineData: {
          mimeType: "audio/mp3",
          data: base64Audio
        }
      }
    ]
  }
};

const response = await mcpClient.callTool(request);
console.log(response);
```

## Example: Compare Multiple Images

```typescript
const image1 = fs.readFileSync('./before.jpg').toString('base64');
const image2 = fs.readFileSync('./after.jpg').toString('base64');

const request = {
  name: "query",
  arguments: {
    prompt: "Compare these two images and describe the differences between them.",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image1
        }
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image2
        }
      }
    ]
  }
};

const response = await mcpClient.callTool(request);
console.log(response);
```

## Example: Mixed Content (Document + Images)

```typescript
const pdfDoc = fs.readFileSync('./report.pdf').toString('base64');
const chart1 = fs.readFileSync('./chart1.png').toString('base64');
const chart2 = fs.readFileSync('./chart2.png').toString('base64');

const request = {
  name: "query",
  arguments: {
    prompt: "Analyze this business report along with the accompanying charts. Provide insights on the trends shown.",
    parts: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfDoc
        }
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: chart1
        }
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: chart2
        }
      }
    ]
  }
};

const response = await mcpClient.callTool(request);
console.log(response);
```

## Example: Using with MCP Inspector

If you're testing with the MCP Inspector, you can send multimodal content like this:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "prompt": "What's in this image?",
      "parts": [
        {
          "inlineData": {
            "mimeType": "image/jpeg",
            "data": "/9j/4AAQSkZJRgABAQEAYABgAAD..."
          }
        }
      ]
    }
  }
}
```

## Tips for Using Multimodal Content

1. **File Size Optimization**
   - For images, resize to reasonable dimensions (e.g., 1024x1024) before encoding
   - Use appropriate compression (JPEG for photos, PNG for graphics)
   - Consider Cloud Storage URIs for files > 5MB

2. **MIME Type Accuracy**
   - Always use the correct MIME type for your file
   - The API may reject requests with incorrect MIME types

3. **Base64 Encoding**
   ```typescript
   // Node.js
   const base64 = Buffer.from(fileBuffer).toString('base64');
   
   // Browser
   const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
   ```

4. **Cloud Storage Setup**
   - Upload large files to Google Cloud Storage
   - Ensure your Vertex AI service account has read access
   - Use `gs://bucket-name/path/to/file` format

5. **Error Handling**
   ```typescript
   try {
     const response = await mcpClient.callTool(request);
     console.log(response);
   } catch (error) {
     console.error('Multimodal query failed:', error);
     // Check: MIME type, file size, encoding, model support
   }
   ```

## Model Recommendations

For best multimodal performance, use:
- `gemini-2.0-flash-exp` - Latest with best multimodal support
- `gemini-2.5-pro` - Production-ready with strong multimodal
- `gemini-1.5-pro` - Stable with good multimodal support

Set in your environment:
```bash
export GEMINI_MODEL="gemini-2.0-flash-exp"
```
