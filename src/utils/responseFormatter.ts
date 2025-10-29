/**
 * Response Formatting Utilities
 * Common helper functions for formatting MCP tool responses
 */

/**
 * Create a standard text response
 */
export function createTextResponse(text: string): { content: Array<{ type: string; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

/**
 * Create a JSON response (serializes the data)
 */
export function createJsonResponse(data: any): { content: Array<{ type: string; text: string }> } {
  return createTextResponse(JSON.stringify(data));
}

/**
 * Create an error response
 */
export function createErrorResponse(errorMessage: string): { content: Array<{ type: string; text: string }> } {
  return createJsonResponse({
    error: errorMessage,
  });
}
