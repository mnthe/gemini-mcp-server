/**
 * WebFetchTool - Fetch content from URLs with security guards
 * HTTPS only, private IP blocking, smart content extraction
 */
import { BaseTool } from '../agentic/Tool.js';
import { SecurityError } from '../errors/index.js';
import * as dns from 'dns/promises';
export class WebFetchTool extends BaseTool {
    name = 'web_fetch';
    description = 'Fetch content from a URL and optionally extract main content';
    parameters = {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'HTTPS URL to fetch (HTTP not allowed for security)',
            },
            extract: {
                type: 'boolean',
                description: 'Extract main content from HTML (default: true)',
            },
        },
        required: ['url'],
    };
    async execute(args, context) {
        this.validateArgs(args);
        const { url, extract = true } = args;
        // Security check 1: HTTPS only
        if (!url.startsWith('https://')) {
            throw new SecurityError('Only HTTPS URLs are allowed');
        }
        // Security check 2: Private IP blocking
        const hostname = new URL(url).hostname;
        await this.checkPrivateIP(hostname);
        try {
            // Fetch content
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'VertexMCPServer/1.0',
                },
                // Timeout after 30 seconds
                signal: AbortSignal.timeout(30000),
            });
            if (!response.ok) {
                return {
                    status: 'error',
                    content: `HTTP ${response.status}: ${response.statusText}`,
                };
            }
            let content = await response.text();
            // Extract main content if requested
            if (extract && this.isHTML(content)) {
                content = this.extractMainContent(content);
            }
            return {
                status: 'success',
                content: content.substring(0, 50000), // Limit to 50KB
                metadata: {
                    url,
                    contentType: response.headers.get('content-type') || 'unknown',
                    contentLength: content.length,
                },
            };
        }
        catch (error) {
            if (error instanceof SecurityError) {
                throw error;
            }
            return {
                status: 'error',
                content: `Failed to fetch URL: ${error.message}`,
            };
        }
    }
    /**
     * Check if hostname resolves to private IP
     */
    async checkPrivateIP(hostname) {
        // Skip check for well-known public domains
        if (this.isPublicDomain(hostname)) {
            return;
        }
        try {
            const addresses = await dns.resolve4(hostname);
            for (const ip of addresses) {
                if (this.isPrivateIPAddress(ip)) {
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
     * Check if IP address is in private CIDR ranges
     */
    isPrivateIPAddress(ip) {
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
    isPublicDomain(hostname) {
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
    /**
     * Check if content is HTML
     */
    isHTML(content) {
        return content.trim().toLowerCase().startsWith('<!doctype html') ||
            content.trim().toLowerCase().startsWith('<html');
    }
    /**
     * Extract main content from HTML (remove scripts, styles, extract text)
     */
    extractMainContent(html) {
        let text = html;
        // Remove script tags and content
        text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Remove style tags and content
        text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        // Remove HTML comments
        text = text.replace(/<!--[\s\S]*?-->/g, '');
        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, ' ');
        // Decode HTML entities
        text = this.decodeHTMLEntities(text);
        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();
        // Extract paragraphs (heuristic: lines with more than 40 characters)
        const lines = text.split(/[.!?]\s+/).filter((line) => line.length > 40);
        return lines.join('. ');
    }
    /**
     * Decode common HTML entities
     */
    decodeHTMLEntities(text) {
        const entities = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
        };
        let decoded = text;
        for (const [entity, char] of Object.entries(entities)) {
            decoded = decoded.replace(new RegExp(entity, 'g'), char);
        }
        return decoded;
    }
}
//# sourceMappingURL=WebFetchTool.js.map