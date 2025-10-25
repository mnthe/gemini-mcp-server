/**
 * Test suite for file security validator
 * Tests MIME types, path traversal prevention, directory whitelist, and executable rejection
 * Run with: npx tsx test/file-security-test.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  validateMimeType,
  validateFileExtension,
  validateFilePath,
  validateFileUri,
  validateMultimodalFile,
  checkFileExists,
} from '../src/utils/fileSecurity.js';

console.log('=== File Security Validator Tests ===\n');

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passCount++;
  } catch (error) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${error}`);
    failCount++;
  }
}

// Test 1: Known safe MIME types
console.log('=== MIME Type Validation ===\n');

test('Accept image/jpeg', () => {
  validateMimeType('image/jpeg');
});

test('Accept image/png', () => {
  validateMimeType('image/png');
});

test('Accept video/mp4', () => {
  validateMimeType('video/mp4');
});

test('Accept audio/mp3', () => {
  validateMimeType('audio/mp3');
});

test('Accept application/pdf', () => {
  validateMimeType('application/pdf');
});

test('Reject unknown MIME type', () => {
  try {
    validateMimeType('application/x-executable');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Reject application/octet-stream', () => {
  try {
    validateMimeType('application/octet-stream');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

// Test 2: File extension validation
console.log('\n=== File Extension Validation ===\n');

test('Accept .jpg extension', () => {
  validateFileExtension('/path/to/image.jpg');
});

test('Accept .mp4 extension', () => {
  validateFileExtension('/path/to/video.mp4');
});

test('Accept .pdf extension', () => {
  validateFileExtension('/path/to/document.pdf');
});

test('Reject .exe extension', () => {
  try {
    validateFileExtension('/path/to/malware.exe');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Reject .sh extension', () => {
  try {
    validateFileExtension('/path/to/script.sh');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Reject .dll extension', () => {
  try {
    validateFileExtension('/path/to/library.dll');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

// Test 3: Path traversal prevention
console.log('\n=== Path Traversal Prevention ===\n');

test('Convert relative path to absolute', () => {
  const result = validateFilePath('./test.jpg', { allowAllDirectories: true });
  if (!path.isAbsolute(result)) {
    throw new Error('Path should be absolute');
  }
});

test('Resolve .. in path', () => {
  const result = validateFilePath('../test.jpg', { allowAllDirectories: true });
  if (!path.isAbsolute(result)) {
    throw new Error('Path should be absolute');
  }
});

test('Block path traversal outside safe directories', () => {
  try {
    // Try to access /etc/passwd (outside safe directories)
    validateFilePath('/etc/passwd');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

// Test 4: Directory whitelist
console.log('\n=== Directory Whitelist Validation ===\n');

test('Accept file in current working directory', () => {
  const cwd = process.cwd();
  const testFile = path.join(cwd, 'test.jpg');
  const result = validateFilePath(testFile);
  if (result !== testFile) {
    throw new Error('Path should match');
  }
});

test('Accept file in Documents directory', () => {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    const docsDir = path.join(homeDir, 'Documents');
    const testFile = path.join(docsDir, 'test.jpg');
    const result = validateFilePath(testFile);
    if (result !== testFile) {
      throw new Error('Path should match');
    }
  }
});

test('Accept file in Downloads directory', () => {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    const downloadsDir = path.join(homeDir, 'Downloads');
    const testFile = path.join(downloadsDir, 'test.jpg');
    const result = validateFilePath(testFile);
    if (result !== testFile) {
      throw new Error('Path should match');
    }
  }
});

test('Accept file in additional safe directory', () => {
  const customDir = '/tmp/custom';
  const testFile = path.join(customDir, 'test.jpg');
  const result = validateFilePath(testFile, {
    additionalSafeDirectories: [customDir],
  });
  if (result !== testFile) {
    throw new Error('Path should match');
  }
});

test('Reject file outside safe directories', () => {
  try {
    validateFilePath('/tmp/unsafe/test.jpg');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

// Test 5: URI validation
console.log('\n=== URI Validation ===\n');

test('Accept gs:// URI', () => {
  const result = validateFileUri('gs://my-bucket/video.mp4');
  if (result !== 'gs://my-bucket/video.mp4') {
    throw new Error('URI should be unchanged');
  }
});

test('Accept https:// URI', () => {
  const result = validateFileUri('https://example.com/image.jpg');
  if (result !== 'https://example.com/image.jpg') {
    throw new Error('URI should be unchanged');
  }
});

test('Reject http:// URI', () => {
  try {
    validateFileUri('http://example.com/image.jpg');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Accept file:// URI in safe directory', () => {
  const cwd = process.cwd();
  const testFile = path.join(cwd, 'test.jpg');
  const fileUri = `file://${testFile}`;
  const result = validateFileUri(fileUri);
  // Should return absolute path
  if (!path.isAbsolute(result)) {
    throw new Error('Should return absolute path');
  }
});

test('Reject file:// URI outside safe directories', () => {
  try {
    validateFileUri('file:///etc/passwd');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Reject ftp:// URI', () => {
  try {
    validateFileUri('ftp://example.com/file.jpg');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Reject data:// URI', () => {
  try {
    validateFileUri('data:image/jpeg;base64,/9j/4AAQ...');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

// Test 6: Multimodal file validation
console.log('\n=== Multimodal File Validation ===\n');

test('Validate multimodal file with gs:// URI', () => {
  const result = validateMultimodalFile('image/jpeg', 'gs://bucket/image.jpg');
  if (result.mimeType !== 'image/jpeg' || result.fileUri !== 'gs://bucket/image.jpg') {
    throw new Error('Should return validated data');
  }
});

test('Validate multimodal file with https:// URI', () => {
  const result = validateMultimodalFile('video/mp4', 'https://example.com/video.mp4');
  if (result.mimeType !== 'video/mp4' || result.fileUri !== 'https://example.com/video.mp4') {
    throw new Error('Should return validated data');
  }
});

test('Reject multimodal file with unsafe MIME type', () => {
  try {
    validateMultimodalFile('application/x-executable', 'gs://bucket/malware.exe');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

test('Reject multimodal file with http:// URI', () => {
  try {
    validateMultimodalFile('image/jpeg', 'http://example.com/image.jpg');
    throw new Error('Should have thrown SecurityError');
  } catch (error: any) {
    if (error.name !== 'SecurityError') {
      throw error;
    }
  }
});

// Test 7: File existence check
console.log('\n=== File Existence Check ===\n');

test('Check existing file', () => {
  // Use this test file itself
  const thisFile = path.join(process.cwd(), 'test/file-security-test.ts');
  if (fs.existsSync(thisFile)) {
    const exists = checkFileExists(thisFile);
    if (!exists) {
      throw new Error('File should exist');
    }
  }
});

test('Check non-existing file', () => {
  const nonExistentFile = '/tmp/this-file-does-not-exist-12345.jpg';
  const exists = checkFileExists(nonExistentFile);
  if (exists) {
    throw new Error('File should not exist');
  }
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
}
