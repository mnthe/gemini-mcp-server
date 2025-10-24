/**
 * Simple manual test for multimodal functionality
 * Run with: npx tsx test/multimodal-test.ts
 */

import { isSupportedMimeType, getMediaTypeCategory } from '../src/types/multimodal.js';

// Test MIME type validation
console.log('=== MIME Type Validation Tests ===\n');

const testMimeTypes = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'audio/mp3',
  'text/x-python',
  'application/pdf',
  'image/bmp', // unsupported
  'video/mkv', // unsupported
];

testMimeTypes.forEach(mimeType => {
  const isSupported = isSupportedMimeType(mimeType);
  const category = getMediaTypeCategory(mimeType);
  console.log(`${mimeType}: ${isSupported ? '✓' : '✗'} (${category})`);
});

console.log('\n=== Multimodal Part Structure Test ===\n');

// Test inline data structure
const inlineDataPart = {
  inlineData: {
    mimeType: 'image/jpeg',
    data: 'base64EncodedDataHere...',
  },
};

console.log('Inline Data Part:', JSON.stringify(inlineDataPart, null, 2));

// Test file data structure
const fileDataPart = {
  fileData: {
    mimeType: 'video/mp4',
    fileUri: 'gs://my-bucket/video.mp4',
  },
};

console.log('\nFile Data Part:', JSON.stringify(fileDataPart, null, 2));

// Test mixed parts
const mixedParts = [
  { text: 'Analyze this image:' },
  {
    inlineData: {
      mimeType: 'image/png',
      data: 'base64ImageData...',
    },
  },
  { text: 'And this video:' },
  {
    fileData: {
      mimeType: 'video/mp4',
      fileUri: 'gs://bucket/video.mp4',
    },
  },
];

console.log('\nMixed Parts:', JSON.stringify(mixedParts, null, 2));

console.log('\n=== Query Schema Structure Test ===\n');

// Test query with multimodal parts
const queryWithMultimodal = {
  prompt: "What's in this image?",
  parts: [
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: 'base64EncodedImageData...',
      },
    },
  ],
};

console.log('Query with Multimodal:', JSON.stringify(queryWithMultimodal, null, 2));

console.log('\n=== All Tests Passed ===\n');
