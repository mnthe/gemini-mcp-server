/**
 * File Security Validator for Multimodal Content
 * Validates local file paths and URIs for security before use in multimodal content
 */

import * as path from 'path';
import * as fs from 'fs';
import { SecurityError } from '../errors/index.js';
import { 
  SUPPORTED_IMAGE_TYPES, 
  SUPPORTED_VIDEO_TYPES, 
  SUPPORTED_AUDIO_TYPES, 
  SUPPORTED_DOCUMENT_TYPES 
} from '../types/multimodal.js';

/**
 * Known safe MIME types for multimodal content
 */
const SAFE_MIME_TYPES = new Set<string>([
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
]);

/**
 * Executable file extensions that should be rejected
 */
const EXECUTABLE_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.app', '.dmg', '.pkg',
  '.deb', '.rpm', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1',
  '.dll', '.so', '.dylib', '.jar', '.apk', '.ipa', '.vbs', '.wsf',
  '.scr', '.pif', '.gadget', '.msp', '.cpl', '.lnk', '.run',
]);

/**
 * Get default safe directories for file access
 */
function getDefaultSafeDirectories(): string[] {
  const dirs: string[] = [
    process.cwd(), // Current working directory
  ];

  // Add user home directory if available
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    // Add common user directories
    dirs.push(
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Downloads'),
      path.join(homeDir, 'Desktop'),
    );
  }

  return dirs;
}

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
export function validateMimeType(mimeType: string): void {
  if (!SAFE_MIME_TYPES.has(mimeType)) {
    throw new SecurityError(
      `Unsupported or unsafe MIME type: ${mimeType}. Only images, videos, audio, and documents are allowed.`
    );
  }
}

/**
 * Validate a file extension is not executable
 */
export function validateFileExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (EXECUTABLE_EXTENSIONS.has(ext)) {
    throw new SecurityError(
      `Executable file type not allowed: ${ext}. Only media and document files are permitted.`
    );
  }
}

/**
 * Resolve and validate a file path for security
 * - Prevents path traversal attacks
 * - Converts to absolute path
 * - Validates against directory whitelist
 * - Checks for executable extensions
 */
export function validateFilePath(
  filePath: string,
  config: FileSecurityConfig = {}
): string {
  // Convert to absolute path to prevent path traversal
  const absolutePath = path.resolve(filePath);
  
  // Check for executable extensions
  validateFileExtension(absolutePath);
  
  // If allowAllDirectories is true (testing only), skip directory check
  if (config.allowAllDirectories) {
    return absolutePath;
  }
  
  // Build list of safe directories
  const safeDirectories = [
    ...getDefaultSafeDirectories(),
    ...(config.additionalSafeDirectories || []),
  ].map(dir => path.resolve(dir)); // Normalize all to absolute paths
  
  // Check if the file is within any safe directory
  const isInSafeDirectory = safeDirectories.some(safeDir => {
    // Check if the absolute path starts with the safe directory
    return absolutePath.startsWith(safeDir + path.sep) || absolutePath === safeDir;
  });
  
  if (!isInSafeDirectory) {
    throw new SecurityError(
      `File path is outside allowed directories. File: ${absolutePath}. ` +
      `Allowed directories: ${safeDirectories.join(', ')}`
    );
  }
  
  return absolutePath;
}

/**
 * Validate a file URI (gs://, https://, or file://)
 * - gs:// URIs are allowed (Cloud Storage)
 * - https:// URIs are validated separately by urlSecurity.ts
 * - file:// URIs are converted to local paths and validated
 */
export function validateFileUri(
  fileUri: string,
  config: FileSecurityConfig = {}
): string {
  // Cloud Storage URIs are always allowed
  if (fileUri.startsWith('gs://')) {
    return fileUri;
  }
  
  // HTTPS URIs should be validated by urlSecurity.ts
  // We just check the scheme here
  if (fileUri.startsWith('https://')) {
    // Basic validation - detailed validation happens in GeminiAIService
    return fileUri;
  }
  
  // HTTP is not allowed
  if (fileUri.startsWith('http://')) {
    throw new SecurityError(
      'HTTP URIs are not allowed. Use HTTPS for web resources or gs:// for Cloud Storage.'
    );
  }
  
  // file:// URIs need special handling
  if (fileUri.startsWith('file://')) {
    // Convert file:// URI to local path
    let localPath: string;
    try {
      // Remove file:// prefix and decode URL encoding
      const pathPart = fileUri.substring(7); // Remove 'file://'
      localPath = decodeURIComponent(pathPart);
      
      // On Windows, file:///C:/path becomes C:/path
      // On Unix, file:///path becomes /path
      if (process.platform === 'win32' && localPath.startsWith('/')) {
        localPath = localPath.substring(1);
      }
    } catch (error) {
      throw new SecurityError(`Invalid file:// URI: ${fileUri}`);
    }
    
    // Validate the local path
    return validateFilePath(localPath, config);
  }
  
  // Other schemes are not allowed
  throw new SecurityError(
    `Unsupported URI scheme in: ${fileUri}. Only gs://, https://, and file:// are allowed.`
  );
}

/**
 * Check if a file exists and is readable
 * This is optional validation that can be used before sending to Gemini
 */
export function checkFileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate multimodal file data before use
 * Main entry point for validating fileData in multimodal parts
 */
export function validateMultimodalFile(
  mimeType: string,
  fileUri: string,
  config: FileSecurityConfig = {}
): { mimeType: string; fileUri: string } {
  // Validate MIME type
  validateMimeType(mimeType);
  
  // Validate and normalize file URI
  const validatedUri = validateFileUri(fileUri, config);
  
  return {
    mimeType,
    fileUri: validatedUri,
  };
}
