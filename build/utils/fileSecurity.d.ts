/**
 * File Security Validator for Multimodal Content
 * Validates local file paths and URIs for security before use in multimodal content
 */
/**
 * Configuration for file security validation
 */
export interface FileSecurityConfig {
    /**
     * Additional safe directories to allow (beyond defaults)
     */
    additionalSafeDirectories?: string[];
    /**
     * Whether to allow all directories (dangerous, for testing only)
     */
    allowAllDirectories?: boolean;
}
/**
 * Validate a MIME type is in the known safe list
 */
export declare function validateMimeType(mimeType: string): void;
/**
 * Validate a file extension is not executable
 */
export declare function validateFileExtension(filePath: string): void;
/**
 * Resolve and validate a file path for security
 * - Prevents path traversal attacks
 * - Converts to absolute path
 * - Validates against directory whitelist
 * - Checks for executable extensions
 */
export declare function validateFilePath(filePath: string, config?: FileSecurityConfig): string;
/**
 * Validate a file URI (gs://, https://, or file://)
 * - gs:// URIs are allowed (Cloud Storage)
 * - https:// URIs are validated separately by urlSecurity.ts
 * - file:// URIs are converted to local paths and validated
 */
export declare function validateFileUri(fileUri: string, config?: FileSecurityConfig): string;
/**
 * Check if a file exists and is readable
 * This is optional validation that can be used before sending to Gemini
 */
export declare function checkFileExists(filePath: string): boolean;
/**
 * Validate multimodal file data before use
 * Main entry point for validating fileData in multimodal parts
 */
export declare function validateMultimodalFile(mimeType: string, fileUri: string, config?: FileSecurityConfig): {
    mimeType: string;
    fileUri: string;
};
//# sourceMappingURL=fileSecurity.d.ts.map