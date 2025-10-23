/**
 * ModelBehaviorError - Thrown when the model produces unexpected behavior
 * Used for invalid responses, malformed tool calls, etc.
 */
export declare class ModelBehaviorError extends Error {
    readonly response: string;
    constructor(response: string, message: string);
    /**
     * Get truncated response for logging (first 200 chars)
     */
    getTruncatedResponse(): string;
}
//# sourceMappingURL=ModelBehaviorError.d.ts.map