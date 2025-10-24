/**
 * SearchHandler - Handles the search tool
 * Returns structured search results following OpenAI MCP spec
 */
import { SearchInput } from '../schemas/index.js';
import { CachedDocument } from '../types/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
export declare class SearchHandler {
    private geminiAI;
    private searchCache;
    constructor(geminiAI: GeminiAIService, searchCache: Map<string, CachedDocument>);
    /**
     * Handle a search tool request
     */
    handle(input: SearchInput): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Parse Gemini API response into structured search results
     */
    private parseSearchResults;
}
//# sourceMappingURL=SearchHandler.d.ts.map