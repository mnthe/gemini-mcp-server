/**
 * ToolExecutionError - Thrown when a tool execution fails
 * Includes retry attempt information for debugging
 */

import { BaseError } from './BaseError.js';

export class ToolExecutionError extends BaseError {
  public readonly toolName: string;
  public readonly originalError: Error;
  public readonly attempt: number;

  constructor(toolName: string, originalError: Error, attempt: number) {
    const message = `Tool '${toolName}' failed on attempt ${attempt}: ${originalError.message}`;
    super(message);

    this.toolName = toolName;
    this.originalError = originalError;
    this.attempt = attempt;
  }

  /**
   * Get full error details including original error stack
   */
  getFullDetails(): string {
    return `${this.message}\n\nOriginal Error:\n${this.originalError.stack}`;
  }
}
