/**
 * ToolExecutionError - Thrown when a tool execution fails
 * Includes retry attempt information for debugging
 */
export declare class ToolExecutionError extends Error {
    readonly toolName: string;
    readonly originalError: Error;
    readonly attempt: number;
    constructor(toolName: string, originalError: Error, attempt: number);
    /**
     * Get full error details including original error stack
     */
    getFullDetails(): string;
}
//# sourceMappingURL=ToolExecutionError.d.ts.map