/**
 * ModelBehaviorError - Thrown when the model produces unexpected behavior
 * Used for invalid responses, malformed tool calls, etc.
 */

import { BaseError } from './BaseError.js';

export class ModelBehaviorError extends BaseError {
  public readonly response: string;

  constructor(response: string, message: string) {
    super(message);
    this.response = response;
  }

  /**
   * Get truncated response for logging (first 200 chars)
   */
  getTruncatedResponse(): string {
    if (this.response.length <= 200) {
      return this.response;
    }
    return this.response.substring(0, 200) + '...';
  }
}
