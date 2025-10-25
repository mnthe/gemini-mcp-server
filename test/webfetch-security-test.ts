/**
 * Test for WebFetch tool content tagging and redirect validation
 * Run with: npx tsx test/webfetch-security-test.ts
 */

import { WebFetchTool } from '../src/tools/WebFetchTool.js';
import { SecurityError } from '../src/errors/index.js';

console.log('=== WebFetch Security Tests ===\n');

const tool = new WebFetchTool();
const context = { logger: { info: () => {}, error: () => {} } } as any;

// Test 1: Check external content tagging (using a mock successful fetch scenario)
console.log('Test 1: External content tagging structure');
// Note: This test would require actual network access or mocking
// For now, we'll verify the tool structure and description
if (tool.description.includes('External content is tagged for security')) {
  console.log('✓ PASS: Tool description mentions security tagging');
} else {
  console.log('✗ FAIL: Tool description does not mention security tagging');
}

// Test 2: Verify tool has correct parameters
console.log('\nTest 2: Tool parameters validation');
if (tool.parameters.required?.includes('url') && 
    tool.parameters.properties?.url?.description.includes('HTTPS')) {
  console.log('✓ PASS: Tool parameters properly configured');
} else {
  console.log('✗ FAIL: Tool parameters not properly configured');
}

// Test 3: Test that blocked URLs are rejected (metadata endpoint)
console.log('\nTest 3: Metadata endpoint rejection');
try {
  await tool.execute({ url: 'https://169.254.169.254/metadata' }, context);
  console.log('✗ FAIL: Metadata endpoint should have been rejected');
} catch (error) {
  if (error instanceof SecurityError && error.message.includes('metadata')) {
    console.log('✓ PASS: Metadata endpoint properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type or message:', error);
  }
}

// Test 4: Test that dangerous schemes are rejected
console.log('\nTest 4: file:// scheme rejection');
try {
  await tool.execute({ url: 'file:///etc/passwd' }, context);
  console.log('✗ FAIL: file:// scheme should have been rejected');
} catch (error) {
  if (error instanceof SecurityError && error.message.includes('Blocked URL scheme')) {
    console.log('✓ PASS: file:// scheme properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type or message:', error);
  }
}

// Test 5: Test private IP rejection
console.log('\nTest 5: Private IP rejection');
try {
  await tool.execute({ url: 'https://192.168.1.1/api' }, context);
  console.log('✗ FAIL: Private IP should have been rejected');
} catch (error) {
  if (error instanceof SecurityError && error.message.includes('Private IP')) {
    console.log('✓ PASS: Private IP properly rejected');
    console.log('  Error:', error.message);
  } else {
    console.log('✗ FAIL: Wrong error type or message:', error);
  }
}

console.log('\n=== All WebFetch Security Tests Complete ===\n');
console.log('Note: Full redirect and content tagging tests require network access or mocking.');
console.log('The manual redirect validation is implemented in the fetchWithRedirectValidation method.\n');
