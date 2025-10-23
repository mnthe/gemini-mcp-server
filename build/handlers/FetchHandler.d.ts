/**
 * FetchHandler - Handles the fetch tool
 * Retrieves full document contents by ID following OpenAI MCP spec
 */
import { FetchInput } from '../schemas/index.js';
import { CachedDocument } from '../types/index.js';
export declare class FetchHandler {
    private searchCache;
    constructor(searchCache: Map<string, CachedDocument>);
    /**
     * Handle a fetch tool request
     */
    handle(input: FetchInput): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
}
//# sourceMappingURL=FetchHandler.d.ts.map