/**
 * Integration test for multimodal schema validation
 * Tests that the Zod schemas properly validate multimodal inputs
 * Run with: npx tsx test/schema-validation-test.ts
 */

import { QuerySchema } from '../src/schemas/index.js';

console.log('=== Schema Validation Tests ===\n');

// Test 1: Simple text query (backward compatible)
console.log('Test 1: Simple text query');
try {
  const result = QuerySchema.parse({
    prompt: "What is the capital of France?",
  });
  console.log('✓ PASS: Simple text query validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 2: Query with session ID
console.log('\nTest 2: Query with session ID');
try {
  const result = QuerySchema.parse({
    prompt: "Continue our conversation",
    sessionId: "session-123",
  });
  console.log('✓ PASS: Query with session ID validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 3: Query with inline image data
console.log('\nTest 3: Query with inline image data');
try {
  const result = QuerySchema.parse({
    prompt: "What's in this image?",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: "base64EncodedImageData...",
        },
      },
    ],
  });
  console.log('✓ PASS: Query with inline image validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 4: Query with Cloud Storage file URI
console.log('\nTest 4: Query with Cloud Storage file URI');
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
  console.log('✓ PASS: Query with file URI validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 5: Query with multiple multimodal parts
console.log('\nTest 5: Query with multiple multimodal parts');
try {
  const result = QuerySchema.parse({
    prompt: "Compare these images",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: "base64Image1...",
        },
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: "base64Image2...",
        },
      },
    ],
  });
  console.log('✓ PASS: Query with multiple parts validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 6: Query with text in parts
console.log('\nTest 6: Query with text in parts');
try {
  const result = QuerySchema.parse({
    prompt: "Main prompt",
    parts: [
      {
        text: "Additional context in parts",
      },
    ],
  });
  console.log('✓ PASS: Query with text in parts validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 7: Query with mixed content types
console.log('\nTest 7: Query with mixed content types');
try {
  const result = QuerySchema.parse({
    prompt: "Analyze this presentation",
    sessionId: "session-456",
    parts: [
      {
        text: "Context: Company quarterly review",
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: "base64Slide1...",
        },
      },
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: "gs://bucket/presentation.mp4",
        },
      },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: "base64PDF...",
        },
      },
    ],
  });
  console.log('✓ PASS: Query with mixed content validated');
  console.log('  Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 8: Invalid query (missing prompt)
console.log('\nTest 8: Invalid query (missing prompt) - Should FAIL');
try {
  const result = QuerySchema.parse({
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: "base64...",
        },
      },
    ],
  });
  console.log('✗ UNEXPECTED PASS: Should have failed validation');
} catch (error) {
  console.log('✓ EXPECTED FAIL: Properly rejected missing prompt');
  if (error instanceof Error) {
    console.log('  Error:', error.message.split('\n')[0]);
  }
}

// Test 9: Invalid query (malformed inline data)
console.log('\nTest 9: Invalid query (malformed inline data) - Should FAIL');
try {
  const result = QuerySchema.parse({
    prompt: "Test",
    parts: [
      {
        inlineData: {
          mimeType: "image/jpeg",
          // missing 'data' field
        },
      },
    ],
  });
  console.log('✗ UNEXPECTED PASS: Should have failed validation');
} catch (error) {
  console.log('✓ EXPECTED FAIL: Properly rejected malformed inline data');
  if (error instanceof Error) {
    console.log('  Error:', error.message.split('\n')[0]);
  }
}

// Test 10: Invalid query (malformed file data)
console.log('\nTest 10: Invalid query (malformed file data) - Should FAIL');
try {
  const result = QuerySchema.parse({
    prompt: "Test",
    parts: [
      {
        fileData: {
          mimeType: "video/mp4",
          // missing 'fileUri' field
        },
      },
    ],
  });
  console.log('✗ UNEXPECTED PASS: Should have failed validation');
} catch (error) {
  console.log('✓ EXPECTED FAIL: Properly rejected malformed file data');
  if (error instanceof Error) {
    console.log('  Error:', error.message.split('\n')[0]);
  }
}

console.log('\n=== Schema Validation Tests Complete ===\n');
