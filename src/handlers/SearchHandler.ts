/**
 * SearchHandler - Handles the search tool
 * Returns structured search results following OpenAI MCP spec
 */

import { SearchInput } from '../schemas/index.js';
import { SearchResult, CachedDocument } from '../types/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { createJsonResponse } from '../utils/responseFormatter.js';

export class SearchHandler {
  private geminiAI: GeminiAIService;
  private searchCache: Map<string, CachedDocument>;

  constructor(geminiAI: GeminiAIService, searchCache: Map<string, CachedDocument>) {
    this.geminiAI = geminiAI;
    this.searchCache = searchCache;
  }

  /**
   * Handle a search tool request
   */
  async handle(input: SearchInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const searchPrompt = `Search and provide information about: ${input.query}. 
Return your response as a structured list of relevant topics or documents with brief descriptions.`;

      const responseText = await this.geminiAI.query(searchPrompt);

      // Parse response and create structured results
      const results: SearchResult[] = this.parseSearchResults(responseText, input.query);

      // Cache documents for fetch
      results.forEach((result, index) => {
        const cachedDoc: CachedDocument = {
          id: result.id,
          title: result.title,
          text: responseText, // Store full response as document text
          url: result.url,
          metadata: {
            query: input.query,
            timestamp: new Date().toISOString(),
            model: this.geminiAI.getConfig().model,
          }
        };
        this.searchCache.set(result.id, cachedDoc);
      });

      return createJsonResponse({ results });
    } catch (error) {
      return createJsonResponse({ 
        results: [],
        error: `Error searching with Gemini: ${getErrorMessage(error)}`
      });
    }
  }

  /**
   * Parse Gemini API response into structured search results
   */
  private parseSearchResults(responseText: string, query: string): SearchResult[] {
    // Generate synthetic search results from the response
    const lines = responseText.split('\n').filter(line => line.trim());
    const results: SearchResult[] = [];
    
    // Create up to 3 results from the response
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (line.length > 10) {
        results.push({
          id: `doc-${Date.now()}-${i}`,
          title: line.substring(0, 100).trim(),
          url: `https://gemini-search/${query.replace(/\s+/g, '-')}/${i}`,
        });
      }
    }

    // Ensure at least one result
    if (results.length === 0) {
      results.push({
        id: `doc-${Date.now()}-0`,
        title: query,
        url: `https://gemini-search/${query.replace(/\s+/g, '-')}`,
      });
    }

    return results;
  }
}
