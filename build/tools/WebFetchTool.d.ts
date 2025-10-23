/**
 * WebFetchTool - Fetch content from URLs with security guards
 * HTTPS only, private IP blocking, smart content extraction
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
     * Check if hostname resolves to private IP
     */
    private checkPrivateIP;
    /**
     * Check if IP address is in private CIDR ranges
     */
    private isPrivateIPAddress;
    /**
     * Check if domain is known public domain (skip IP check)
     */
    private isPublicDomain;
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
}
//# sourceMappingURL=WebFetchTool.d.ts.map