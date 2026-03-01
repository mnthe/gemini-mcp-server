/**
 * Test suite for custom error classes
 * Tests BaseError and its subclasses
 * Run with: npx tsx test/error-classes-test.ts
 */

import { BaseError, SecurityError, ModelBehaviorError, ToolExecutionError } from '../src/errors/index.js';

console.log('=== Error Classes Tests ===\n');

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// ===== BaseError Tests =====
console.log('=== BaseError Tests ===\n');

test('BaseError has correct name', () => {
  const error = new BaseError('Test error');
  assert(error.name === 'BaseError', `Expected name 'BaseError', got '${error.name}'`);
});

test('BaseError has correct message', () => {
  const error = new BaseError('Test message');
  assert(error.message === 'Test message', `Expected message 'Test message', got '${error.message}'`);
});

test('BaseError is instance of Error', () => {
  const error = new BaseError('Test');
  assert(error instanceof Error, 'BaseError should be instanceof Error');
});

test('BaseError is instance of BaseError', () => {
  const error = new BaseError('Test');
  assert(error instanceof BaseError, 'BaseError should be instanceof BaseError');
});

test('BaseError has stack trace', () => {
  const error = new BaseError('Test');
  assert(error.stack !== undefined, 'BaseError should have stack trace');
  assert(error.stack!.includes('BaseError'), 'Stack trace should include BaseError');
});

// ===== SecurityError Tests =====
console.log('\n=== SecurityError Tests ===\n');

test('SecurityError has correct name', () => {
  const error = new SecurityError('Security violation');
  assert(error.name === 'SecurityError', `Expected name 'SecurityError', got '${error.name}'`);
});

test('SecurityError has correct message', () => {
  const error = new SecurityError('Blocked URL');
  assert(error.message === 'Blocked URL', `Expected message 'Blocked URL', got '${error.message}'`);
});

test('SecurityError is instance of Error', () => {
  const error = new SecurityError('Test');
  assert(error instanceof Error, 'SecurityError should be instanceof Error');
});

test('SecurityError is instance of BaseError', () => {
  const error = new SecurityError('Test');
  assert(error instanceof BaseError, 'SecurityError should be instanceof BaseError');
});

test('SecurityError is instance of SecurityError', () => {
  const error = new SecurityError('Test');
  assert(error instanceof SecurityError, 'SecurityError should be instanceof SecurityError');
});

// ===== ModelBehaviorError Tests =====
console.log('\n=== ModelBehaviorError Tests ===\n');

test('ModelBehaviorError has correct name', () => {
  const error = new ModelBehaviorError('response text', 'Invalid response');
  assert(error.name === 'ModelBehaviorError', `Expected name 'ModelBehaviorError', got '${error.name}'`);
});

test('ModelBehaviorError has correct message', () => {
  const error = new ModelBehaviorError('response', 'Bad format');
  assert(error.message === 'Bad format', `Expected message 'Bad format', got '${error.message}'`);
});

test('ModelBehaviorError stores response', () => {
  const response = 'Model output text';
  const error = new ModelBehaviorError(response, 'Test');
  assert(error.response === response, `Expected response '${response}', got '${error.response}'`);
});

test('ModelBehaviorError getTruncatedResponse returns full short response', () => {
  const response = 'Short response';
  const error = new ModelBehaviorError(response, 'Test');
  assert(error.getTruncatedResponse() === response, 'Should return full short response');
});

test('ModelBehaviorError getTruncatedResponse truncates long response', () => {
  const response = 'A'.repeat(300);
  const error = new ModelBehaviorError(response, 'Test');
  const truncated = error.getTruncatedResponse();
  const expectedLength = 200 + '...'.length; // 200 chars + ellipsis
  assert(truncated.length === expectedLength, `Expected length ${expectedLength}, got ${truncated.length}`);
  assert(truncated.endsWith('...'), 'Truncated response should end with ...');
});

test('ModelBehaviorError is instance of BaseError', () => {
  const error = new ModelBehaviorError('response', 'Test');
  assert(error instanceof BaseError, 'ModelBehaviorError should be instanceof BaseError');
});

// ===== ToolExecutionError Tests =====
console.log('\n=== ToolExecutionError Tests ===\n');

test('ToolExecutionError has correct name', () => {
  const originalError = new Error('Original');
  const error = new ToolExecutionError('testTool', originalError, 1);
  assert(error.name === 'ToolExecutionError', `Expected name 'ToolExecutionError', got '${error.name}'`);
});

test('ToolExecutionError has correct message format', () => {
  const originalError = new Error('Connection failed');
  const error = new ToolExecutionError('webFetch', originalError, 2);
  assert(
    error.message.includes('webFetch') && error.message.includes('attempt 2') && error.message.includes('Connection failed'),
    `Expected message to contain tool name, attempt, and original error. Got: '${error.message}'`
  );
});

test('ToolExecutionError stores toolName', () => {
  const originalError = new Error('Test');
  const error = new ToolExecutionError('myTool', originalError, 1);
  assert(error.toolName === 'myTool', `Expected toolName 'myTool', got '${error.toolName}'`);
});

test('ToolExecutionError stores originalError', () => {
  const originalError = new Error('Original error message');
  const error = new ToolExecutionError('tool', originalError, 1);
  assert(error.originalError === originalError, 'Should store original error');
  assert(error.originalError.message === 'Original error message', 'Original error message should be preserved');
});

test('ToolExecutionError stores attempt number', () => {
  const originalError = new Error('Test');
  const error = new ToolExecutionError('tool', originalError, 3);
  assert(error.attempt === 3, `Expected attempt 3, got ${error.attempt}`);
});

test('ToolExecutionError getFullDetails includes original stack', () => {
  const originalError = new Error('Original');
  const error = new ToolExecutionError('tool', originalError, 1);
  const details = error.getFullDetails();
  assert(details.includes(error.message), 'Full details should include error message');
  assert(details.includes('Original Error:'), 'Full details should include "Original Error:" label');
});

test('ToolExecutionError is instance of BaseError', () => {
  const originalError = new Error('Test');
  const error = new ToolExecutionError('tool', originalError, 1);
  assert(error instanceof BaseError, 'ToolExecutionError should be instanceof BaseError');
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
