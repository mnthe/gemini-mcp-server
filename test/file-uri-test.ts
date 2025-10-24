/**
 * Test for file:// URI support in multimodal content
 * Run with: npx tsx test/file-uri-test.ts
 */

import { QuerySchema } from '../src/schemas/index.js';

console.log('=== File URI Support Tests ===\n');

// Test 1: file:// URI in schema validation (should pass)
console.log('Test 1: file:// URI in schema validation');
try {
  const result = QuerySchema.parse({
    prompt: "Analyze this local file",
    parts: [
      {
        fileData: {
          mimeType: "image/jpeg",
          fileUri: "file:///workspace/image.jpg",
        },
      },
    ],
  });
  console.log('✓ PASS: file:// URI accepted by schema');
  console.log('  URI:', result.parts?.[0]?.fileData?.fileUri);
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 2: Mixed URIs with file://
console.log('\nTest 2: Mixed URIs including file://');
try {
  const result = QuerySchema.parse({
    prompt: "Process these files",
    parts: [
      {
        fileData: {
          mimeType: "image/jpeg",
          fileUri: "file:///workspace/local-image.jpg",
        },
      },
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: "gs://bucket/video.mp4",
        },
      },
      {
        fileData: {
          mimeType: "image/png",
          fileUri: "https://example.com/image.png",
        },
      },
    ],
  });
  console.log('✓ PASS: Mixed URI schemes accepted by schema');
  console.log('  URIs:', result.parts?.map(p => p.fileData?.fileUri).filter(Boolean));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 3: Relative file:// path
console.log('\nTest 3: Relative file:// path');
try {
  const result = QuerySchema.parse({
    prompt: "Analyze this",
    parts: [
      {
        fileData: {
          mimeType: "text/plain",
          fileUri: "file://./data/file.txt",
        },
      },
    ],
  });
  console.log('✓ PASS: Relative file:// path accepted by schema');
  console.log('  URI:', result.parts?.[0]?.fileData?.fileUri);
} catch (error) {
  console.log('✗ FAIL:', error);
}

console.log('\n=== Configuration Note ===');
console.log('Schema validation allows file:// URIs.');
console.log('Runtime validation (GeminiAIService) enforces:');
console.log('  - file:// URIs are DISABLED by default');
console.log('  - Set GEMINI_ALLOW_FILE_URIS=true to enable');
console.log('  - Only use in CLI environments (not desktop apps)');
console.log('\n=== All Tests Complete ===\n');
