/**
 * SecurityError - Thrown when a security violation is detected
 * Used for URL validation, IP filtering, etc.
 */
export class SecurityError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecurityError';
        // Maintain proper stack trace for where error was thrown (only available in V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SecurityError);
        }
    }
}
//# sourceMappingURL=SecurityError.js.map