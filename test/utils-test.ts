/**
 * Test suite for utility functions
 * Tests errorUtils and responseFormatter
 * Run with: npx tsx test/utils-test.ts
 */

import { getErrorMessage } from '../src/utils/errorUtils.js';
import { createTextResponse, createJsonResponse, createErrorResponse } from '../src/utils/responseFormatter.js';

console.log('=== Utility Functions Tests ===\n');

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

function assertEqual(actual: any, expected: any, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
  }
}

// ===== Error Utils Tests =====
console.log('=== Error Utils Tests ===\n');

test('getErrorMessage with Error instance', () => {
  const error = new Error('Test error message');
  const result = getErrorMessage(error);
  assertEqual(result, 'Test error message');
});

test('getErrorMessage with string', () => {
  const result = getErrorMessage('String error');
  assertEqual(result, 'String error');
});

test('getErrorMessage with number', () => {
  const result = getErrorMessage(42);
  assertEqual(result, '42');
});

test('getErrorMessage with object', () => {
  const result = getErrorMessage({ code: 'ERR_001' });
  assertEqual(result, '[object Object]');
});

// ===== Response Formatter Tests =====
console.log('\n=== Response Formatter Tests ===\n');

test('createTextResponse creates correct structure', () => {
  const result = createTextResponse('Hello, world!');
  assertEqual(result, {
    content: [
      {
        type: 'text',
        text: 'Hello, world!',
      },
    ],
  });
});

test('createJsonResponse serializes data correctly', () => {
  const data = { status: 'success', count: 42 };
  const result = createJsonResponse(data);
  assertEqual(result, {
    content: [
      {
        type: 'text',
        text: '{"status":"success","count":42}',
      },
    ],
  });
});

test('createErrorResponse formats error correctly', () => {
  const result = createErrorResponse('Something went wrong');
  assertEqual(result, {
    content: [
      {
        type: 'text',
        text: '{"error":"Something went wrong"}',
      },
    ],
  });
});

test('createTextResponse with empty string', () => {
  const result = createTextResponse('');
  assertEqual(result, {
    content: [
      {
        type: 'text',
        text: '',
      },
    ],
  });
});

test('createJsonResponse with array', () => {
  const data = [1, 2, 3];
  const result = createJsonResponse(data);
  assertEqual(result, {
    content: [
      {
        type: 'text',
        text: '[1,2,3]',
      },
    ],
  });
});

test('createJsonResponse with nested object', () => {
  const data = {
    user: {
      name: 'John',
      age: 30,
    },
  };
  const result = createJsonResponse(data);
  assertEqual(result, {
    content: [
      {
        type: 'text',
        text: '{"user":{"name":"John","age":30}}',
      },
    ],
  });
});

// ===== Summary =====
console.log('\n=== Test Summary ===');
console.log(`Total: ${passCount + failCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failCount} test(s) failed`);
  process.exit(1);
}
