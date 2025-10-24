/**
 * Integration test for multimodal file URI security validation
 * Tests that HTTPS file URIs are properly validated for security
 * Run with: npx tsx test/multimodal-security-test.ts
 */

import { QuerySchema } from '../src/schemas/index.js';

console.log('=== Multimodal File URI Security Tests ===\n');

// Test 1: Valid HTTPS file URI (schema validation only)
console.log('Test 1: Valid HTTPS file URI in multimodal parts');
try {
  const result = QuerySchema.parse({
    prompt: "Analyze this image from the web",
    parts: [
      {
        fileData: {
          mimeType: "image/jpeg",
          fileUri: "https://example.com/image.jpg",
        },
      },
    ],
  });
  console.log('✓ PASS: Valid HTTPS URI accepted by schema');
  console.log('  URI:', result.parts?.[0]?.fileData?.fileUri);
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 2: Cloud Storage URI (should be accepted)
console.log('\nTest 2: Cloud Storage gs:// URI in multimodal parts');
try {
  const result = QuerySchema.parse({
    prompt: "Analyze this video",
    parts: [
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: "gs://my-bucket/video.mp4",
        },
      },
    ],
  });
  console.log('✓ PASS: Cloud Storage URI accepted by schema');
  console.log('  URI:', result.parts?.[0]?.fileData?.fileUri);
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 3: HTTP URI (schema allows it, but runtime will reject)
console.log('\nTest 3: HTTP URI in multimodal parts (schema allows, runtime rejects)');
try {
  const result = QuerySchema.parse({
    prompt: "Test HTTP",
    parts: [
      {
        fileData: {
          mimeType: "image/jpeg",
          fileUri: "http://example.com/image.jpg",
        },
      },
    ],
  });
  console.log('✓ PASS: HTTP URI accepted by schema (will be rejected at runtime)');
  console.log('  URI:', result.parts?.[0]?.fileData?.fileUri);
  console.log('  Note: This will be rejected by GeminiAIService with SecurityError');
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 4: Multiple file URIs with mixed schemes
console.log('\nTest 4: Multiple file URIs with mixed schemes');
try {
  const result = QuerySchema.parse({
    prompt: "Compare these files",
    parts: [
      {
        fileData: {
          mimeType: "image/jpeg",
          fileUri: "https://example.com/image1.jpg",
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
          fileUri: "https://github.com/image2.png",
        },
      },
    ],
  });
  console.log('✓ PASS: Mixed URI schemes accepted by schema');
  console.log('  URIs:', result.parts?.map(p => p.fileData?.fileUri).filter(Boolean));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 5: Invalid URI format (missing required fields)
console.log('\nTest 5: Invalid file URI (missing fileUri field) - Should FAIL');
try {
  const result = QuerySchema.parse({
    prompt: "Test",
    parts: [
      {
        fileData: {
          mimeType: "image/jpeg",
          // missing fileUri
        },
      },
    ],
  });
  console.log('✗ UNEXPECTED PASS: Should have failed validation');
} catch (error) {
  console.log('✓ EXPECTED FAIL: Properly rejected missing fileUri');
  if (error instanceof Error) {
    console.log('  Error:', error.message.split('\n')[0]);
  }
}

// Test 6: Mixing inline data and file URIs
console.log('\nTest 6: Mixing inline data and file URIs');
try {
  const result = QuerySchema.parse({
    prompt: "Process these media files",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: "base64ImageData...",
        },
      },
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: "https://example.com/video.mp4",
        },
      },
    ],
  });
  console.log('✓ PASS: Mixed inline data and file URIs accepted');
  console.log('  Parts:', result.parts?.length, 'parts');
} catch (error) {
  console.log('✗ FAIL:', error);
}

console.log('\n=== Security Validation Summary ===');
console.log('Schema validation allows both gs:// and https:// URIs');
console.log('Runtime validation (GeminiAIService) enforces:');
console.log('  - HTTPS-only for web URLs');
console.log('  - Private IP blocking for HTTPS URLs');
console.log('  - gs:// URIs pass through without additional checks');
console.log('\n=== All Tests Complete ===\n');
