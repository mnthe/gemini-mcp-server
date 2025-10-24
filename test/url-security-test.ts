/**
 * Test for URL security validation in multimodal file URIs
 * Run with: npx tsx test/url-security-test.ts
 */

import { validateSecureUrl } from '../src/utils/urlSecurity.js';
import { SecurityError } from '../src/errors/index.js';

console.log('=== URL Security Validation Tests ===\n');

// Test 1: Valid HTTPS URL
console.log('Test 1: Valid HTTPS URL');
try {
  await validateSecureUrl('https://example.com/image.jpg');
  console.log('✓ PASS: Valid HTTPS URL accepted');
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 2: HTTP URL (should fail)
console.log('\nTest 2: HTTP URL (should be rejected)');
try {
  await validateSecureUrl('http://example.com/image.jpg');
  console.log('✗ FAIL: HTTP URL should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: HTTP URL properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 3: Private IP address (should fail)
console.log('\nTest 3: Private IP address 192.168.1.1 (should be rejected)');
try {
  await validateSecureUrl('https://192.168.1.1/image.jpg');
  console.log('✗ FAIL: Private IP should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Private IP properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 4: Private IP address 10.0.0.1 (should fail)
console.log('\nTest 4: Private IP address 10.0.0.1 (should be rejected)');
try {
  await validateSecureUrl('https://10.0.0.1/image.jpg');
  console.log('✗ FAIL: Private IP should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Private IP properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 5: Localhost (should fail)
console.log('\nTest 5: Localhost 127.0.0.1 (should be rejected)');
try {
  await validateSecureUrl('https://127.0.0.1/image.jpg');
  console.log('✗ FAIL: Localhost should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Localhost properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 6: Public domain (should pass)
console.log('\nTest 6: Public domain github.com (should be accepted)');
try {
  await validateSecureUrl('https://github.com/file.jpg');
  console.log('✓ PASS: Public domain accepted');
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 7: Cloud Storage URI format (not validated by this function)
console.log('\nTest 7: gs:// URI (should fail - not HTTPS)');
try {
  await validateSecureUrl('gs://bucket/file.jpg');
  console.log('✗ FAIL: gs:// URI should have been rejected by HTTPS check');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: gs:// URI properly rejected by HTTPS-only check');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

console.log('\n=== All Security Tests Complete ===\n');
