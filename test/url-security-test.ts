/**
 * Test for URL security validation in multimodal file URIs
 * Run with: npx tsx test/url-security-test.ts
 */

import { validateSecureUrl, validateRedirectUrl } from '../src/utils/urlSecurity.js';
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

// Test 8: AWS metadata endpoint (should fail)
console.log('\nTest 8: AWS metadata endpoint 169.254.169.254 (should be rejected)');
try {
  await validateSecureUrl('https://169.254.169.254/latest/meta-data/');
  console.log('✗ FAIL: Metadata endpoint should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Metadata endpoint properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 9: GCP metadata endpoint (should fail)
console.log('\nTest 9: GCP metadata endpoint metadata.google.internal (should be rejected)');
try {
  await validateSecureUrl('https://metadata.google.internal/computeMetadata/v1/');
  console.log('✗ FAIL: Metadata endpoint should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Metadata endpoint properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 10: Alibaba Cloud metadata endpoint (should fail)
console.log('\nTest 10: Alibaba Cloud metadata endpoint 100.100.100.200 (should be rejected)');
try {
  await validateSecureUrl('https://100.100.100.200/latest/meta-data/');
  console.log('✗ FAIL: Metadata endpoint should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Metadata endpoint properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 11: Link-local IP (should fail)
console.log('\nTest 11: Link-local IP 169.254.1.1 (should be rejected)');
try {
  await validateSecureUrl('https://169.254.1.1/file.jpg');
  console.log('✗ FAIL: Link-local IP should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Link-local IP properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 12: file:// scheme (should fail)
console.log('\nTest 12: file:// scheme (should be rejected)');
try {
  await validateSecureUrl('file:///etc/passwd');
  console.log('✗ FAIL: file:// scheme should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: file:// scheme properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 13: ftp:// scheme (should fail)
console.log('\nTest 13: ftp:// scheme (should be rejected)');
try {
  await validateSecureUrl('ftp://example.com/file.txt');
  console.log('✗ FAIL: ftp:// scheme should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: ftp:// scheme properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 14: data:// scheme (should fail)
console.log('\nTest 14: data:// scheme (should be rejected)');
try {
  await validateSecureUrl('data:text/html,<script>alert(1)</script>');
  console.log('✗ FAIL: data:// scheme should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: data:// scheme properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 15: Valid redirect (same domain)
console.log('\nTest 15: Valid redirect (same domain)');
try {
  await validateRedirectUrl('https://example.com/page1', 'https://example.com/page2');
  console.log('✓ PASS: Same-domain redirect accepted');
} catch (error) {
  console.log('✗ FAIL:', error);
}

// Test 16: Cross-domain redirect (should fail)
console.log('\nTest 16: Cross-domain redirect (should be rejected)');
try {
  await validateRedirectUrl('https://example.com/page1', 'https://evil.com/page2');
  console.log('✗ FAIL: Cross-domain redirect should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Cross-domain redirect properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 17: Redirect to metadata endpoint (should fail)
console.log('\nTest 17: Redirect to metadata endpoint (should be rejected)');
try {
  await validateRedirectUrl('https://example.com/page1', 'https://169.254.169.254/metadata');
  console.log('✗ FAIL: Redirect to metadata should have been rejected');
} catch (error) {
  if (error instanceof SecurityError) {
    console.log('✓ PASS: Redirect to metadata properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type:', error);
  }
}

// Test 18: Case-insensitive HTTPS check (should pass)
console.log('\nTest 18: Case-insensitive HTTPS URL (should be accepted)');
try {
  await validateSecureUrl('HTTPS://example.com/image.jpg');
  console.log('✓ PASS: Case-insensitive HTTPS URL accepted');
} catch (error) {
  console.log('✗ FAIL:', error);
}

console.log('\n=== All Security Tests Complete ===\n');
