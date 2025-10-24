/**
 * URL Security Utilities
 * Shared security validation for URLs used in web fetching and multimodal content
 */
import * as dns from 'dns/promises';
import { SecurityError } from '../errors/index.js';
/**
 * Validate URL for security concerns
 * - Must be HTTPS only
 * - Must not resolve to private IP addresses
 */
export async function validateSecureUrl(url) {
    // Security check 1: HTTPS only
    if (!url.startsWith('https://')) {
        throw new SecurityError('Only HTTPS URLs are allowed');
    }
    // Security check 2: Private IP blocking
    const hostname = new URL(url).hostname;
    await checkPrivateIP(hostname);
}
/**
 * Check if hostname resolves to private IP
 */
async function checkPrivateIP(hostname) {
    // Skip check for well-known public domains
    if (isPublicDomain(hostname)) {
        return;
    }
    // Check if hostname is already an IP address
    if (isIPAddress(hostname)) {
        if (isPrivateIPAddress(hostname)) {
            throw new SecurityError(`Private IP addresses are not allowed: ${hostname}`);
        }
        return;
    }
    try {
        const addresses = await dns.resolve4(hostname);
        for (const ip of addresses) {
            if (isPrivateIPAddress(ip)) {
                throw new SecurityError(`Private IP addresses are not allowed: ${ip}`);
            }
        }
    }
    catch (error) {
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
function isIPAddress(hostname) {
    // Simple regex to check if it looks like an IPv4 address
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Pattern.test(hostname);
}
/**
 * Check if IP address is in private CIDR ranges
 */
function isPrivateIPAddress(ip) {
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
    return false;
}
/**
 * Check if domain is known public domain (skip IP check)
 */
function isPublicDomain(hostname) {
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
//# sourceMappingURL=urlSecurity.js.map