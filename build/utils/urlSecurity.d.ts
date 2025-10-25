/**
 * URL Security Utilities
 * Shared security validation for URLs used in web fetching and multimodal content
 */
/**
 * Validate URL for security concerns
 * - Must be HTTPS only
 * - Must not use dangerous schemes
 * - Must not resolve to private IP addresses or cloud metadata endpoints
 * - Must not be in link-local range
 */
export declare function validateSecureUrl(url: string): Promise<void>;
/**
 * Validate redirect URL to prevent SSRF via redirects
 * - Must pass all security checks
 * - Must not change domain from original URL
 */
export declare function validateRedirectUrl(originalUrl: string, redirectUrl: string): Promise<void>;
//# sourceMappingURL=urlSecurity.d.ts.map