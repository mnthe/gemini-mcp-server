/**
 * SearchHandler - Handles the search tool
 * Returns structured search results following OpenAI MCP spec
 */
import { SearchInput } from '../schemas/index.js';
import { CachedDocument } from '../types/index.js';
import { VertexAIService } from '../services/VertexAIService.js';
export declare class SearchHandler {
    private vertexAI;
    private searchCache;
    constructor(vertexAI: VertexAIService, searchCache: Map<string, CachedDocument>);
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
     * Parse Vertex AI response into structured search results
     */
    private parseSearchResults;
}
//# sourceMappingURL=SearchHandler.d.ts.map