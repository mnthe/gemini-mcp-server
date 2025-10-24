/**
 * WebFetchTool - Fetch content from URLs with security guards
 * HTTPS only, private IP blocking, smart content extraction
 */
import { BaseTool } from '../agentic/Tool.js';
import { SecurityError } from '../errors/index.js';
import { validateSecureUrl } from '../utils/urlSecurity.js';
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
        // Security validation: HTTPS only and private IP blocking
        await validateSecureUrl(url);
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