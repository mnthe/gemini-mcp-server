/**
 * BaseError - Base class for all custom errors
 * Provides common error handling functionality including stack trace capture
 */

export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    
    // Maintain proper stack trace for where error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
