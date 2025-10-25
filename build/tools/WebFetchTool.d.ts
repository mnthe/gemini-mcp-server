/**
 * WebFetchTool - Fetch content from URLs with security guards
 * HTTPS only, private IP blocking, smart content extraction, manual redirect validation
 */
import { BaseTool, ToolResult, RunContext, JSONSchema } from '../agentic/Tool.js';
export declare class WebFetchTool extends BaseTool {
    name: string;
    description: string;
    parameters: JSONSchema;
    execute(args: {
        url: string;
        extract?: boolean;
    }, context: RunContext): Promise<ToolResult>;
    /**
     * Fetch with manual redirect validation to prevent SSRF via redirects
     */
    private fetchWithRedirectValidation;
    /**
     * Check if content is HTML
     */
    private isHTML;
    /**
     * Extract main content from HTML (remove scripts, styles, extract text)
     */
    private extractMainContent;
    /**
     * Decode common HTML entities
     */
    private decodeHTMLEntities;
    /**
     * Escape XML special characters to prevent injection
     */
    private escapeXml;
}
//# sourceMappingURL=WebFetchTool.d.ts.map