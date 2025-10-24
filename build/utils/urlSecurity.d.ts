/**
 * URL Security Utilities
 * Shared security validation for URLs used in web fetching and multimodal content
 */
/**
 * Validate URL for security concerns
 * - Must be HTTPS only
 * - Must not resolve to private IP addresses
 */
export declare function validateSecureUrl(url: string): Promise<void>;
//# sourceMappingURL=urlSecurity.d.ts.map