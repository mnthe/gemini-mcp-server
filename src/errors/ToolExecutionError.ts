/**
 * ToolExecutionError - Thrown when a tool execution fails
 * Includes retry attempt information for debugging
 */

export class ToolExecutionError extends Error {
  public readonly toolName: string;
  public readonly originalError: Error;
  public readonly attempt: number;

  constructor(toolName: string, originalError: Error, attempt: number) {
    const message = `Tool '${toolName}' failed on attempt ${attempt}: ${originalError.message}`;
    super(message);

    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.originalError = originalError;
    this.attempt = attempt;

    // Maintain proper stack trace for where error was thrown (only available in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ToolExecutionError);
    }
  }

  /**
   * Get full error details including original error stack
   */
  getFullDetails(): string {
    return `${this.message}\n\nOriginal Error:\n${this.originalError.stack}`;
  }
}
