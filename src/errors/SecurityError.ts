/**
 * SecurityError - Thrown when a security violation is detected
 * Used for URL validation, IP filtering, etc.
 */

import { BaseError } from './BaseError.js';

export class SecurityError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}
