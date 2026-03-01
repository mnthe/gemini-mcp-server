/**
 * Error Utilities
 * Common helper functions for error handling
 */

/**
 * Extract error message from unknown error type
 * Handles Error instances and other thrown values
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
