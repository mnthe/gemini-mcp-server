/**
 * URL Security Utilities
 * Shared security validation for URLs used in web fetching and multimodal content
 */

import * as dns from 'dns/promises';
import { SecurityError } from '../errors/index.js';

// Dangerous URL schemes that should be blocked
const BLOCKED_SCHEMES = ['file:', 'ftp:', 'ftps:', 'data:', 'javascript:', 'vbscript:', 'about:', 'blob:', 'gopher:', 'dict:', 'tftp:'];

// Cloud metadata endpoints that must be blocked to prevent SSRF
const BLOCKED_METADATA_HOSTS = [
  '169.254.169.254',      // AWS, Azure, GCP metadata
  'metadata.google.internal', // GCP metadata
  '100.100.100.200',      // Alibaba Cloud metadata
  'fd00:ec2::254',        // AWS IPv6 metadata
  'metadata',             // Generic metadata hostname
  'metadata.azure.com',   // Azure metadata
];

/**
 * Validate URL for security concerns
 * - Must be HTTPS only
 * - Must not use dangerous schemes
 * - Must not resolve to private IP addresses or cloud metadata endpoints
 * - Must not be in link-local range
 */
export async function validateSecureUrl(url: string): Promise<void> {
  // Security check 1: Block dangerous URL schemes
  const lowerUrl = url.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      throw new SecurityError(`Blocked URL scheme: ${scheme}`);
    }
  }

  // Security check 2: HTTPS only (case-insensitive)
  if (!lowerUrl.startsWith('https://')) {
    throw new SecurityError('Only HTTPS URLs are allowed');
  }

  // Security check 3: Block cloud metadata endpoints and private IPs
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Check against blocked metadata hosts
  for (const blockedHost of BLOCKED_METADATA_HOSTS) {
    if (hostname === blockedHost || hostname.endsWith('.' + blockedHost)) {
      throw new SecurityError(`Blocked cloud metadata endpoint: ${hostname}`);
    }
  }
  
  await checkPrivateIP(hostname);
}

/**
 * Validate redirect URL to prevent SSRF via redirects
 * - Must pass all security checks
 * - Must not change domain from original URL
 */
export async function validateRedirectUrl(originalUrl: string, redirectUrl: string): Promise<void> {
  // First validate the redirect URL itself
  await validateSecureUrl(redirectUrl);
  
  // Check that domain hasn't changed
  const originalHostname = new URL(originalUrl).hostname.toLowerCase();
  const redirectHostname = new URL(redirectUrl).hostname.toLowerCase();
  
  if (originalHostname !== redirectHostname) {
    throw new SecurityError(
      `Cross-domain redirect blocked: ${originalHostname} -> ${redirectHostname}`
    );
  }
}

/**
 * Check if hostname resolves to private IP
 */
async function checkPrivateIP(hostname: string): Promise<void> {
  // Skip check for well-known public domains
  if (isPublicDomain(hostname)) {
    return;
  }

  // Check if hostname is already an IP address
  if (isIPAddress(hostname)) {
    if (isPrivateIPAddress(hostname)) {
      throw new SecurityError(
        `Private IP addresses are not allowed: ${hostname}`
      );
    }
    return;
  }

  try {
    const addresses = await dns.resolve4(hostname);

    for (const ip of addresses) {
      if (isPrivateIPAddress(ip)) {
        throw new SecurityError(
          `Private IP addresses are not allowed: ${ip}`
        );
      }
    }
  } catch (error) {
    if (error instanceof SecurityError) {
      throw error;
    }
    // DNS resolution failed - could be IPv6 only, or invalid domain
    // Allow the fetch to proceed and let it fail naturally
  }
}

/**
 * Check if string is an IP address
 */
function isIPAddress(hostname: string): boolean {
  // Simple regex to check if it looks like an IPv4 address
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4Pattern.test(hostname);
}

/**
 * Check if IP address is in private CIDR ranges
 */
function isPrivateIPAddress(ip: string): boolean {
  const parts = ip.split('.').map(Number);

  // 10.0.0.0/8
  if (parts[0] === 10) {
    return true;
  }

  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }

  // 127.0.0.0/8 (localhost)
  if (parts[0] === 127) {
    return true;
  }

  // 169.254.0.0/16 (link-local/APIPA)
  if (parts[0] === 169 && parts[1] === 254) {
    return true;
  }

  return false;
}

/**
 * Check if domain is known public domain (skip IP check)
 */
function isPublicDomain(hostname: string): boolean {
  const publicDomains = [
    'google.com',
    'github.com',
    'stackoverflow.com',
    'wikipedia.org',
    'medium.com',
    'arxiv.org',
  ];

  return publicDomains.some((domain) => hostname.endsWith(domain));
}
