/**
 * ModelBehaviorError - Thrown when the model produces unexpected behavior
 * Used for invalid responses, malformed tool calls, etc.
 */

export class ModelBehaviorError extends Error {
  public readonly response: string;

  constructor(response: string, message: string) {
    super(message);

    this.name = 'ModelBehaviorError';
    this.response = response;

    // Maintain proper stack trace for where error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ModelBehaviorError);
    }
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
