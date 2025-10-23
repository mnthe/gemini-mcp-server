/**
 * SearchHandler - Handles the search tool
 * Returns structured search results following OpenAI MCP spec
 */

import { SearchInput } from '../schemas/index.js';
import { SearchResult, CachedDocument } from '../types/index.js';
import { VertexAIService } from '../services/VertexAIService.js';

export class SearchHandler {
  private vertexAI: VertexAIService;
  private searchCache: Map<string, CachedDocument>;

  constructor(vertexAI: VertexAIService, searchCache: Map<string, CachedDocument>) {
    this.vertexAI = vertexAI;
    this.searchCache = searchCache;
  }

  /**
   * Handle a search tool request
   */
  async handle(input: SearchInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const searchPrompt = `Search and provide information about: ${input.query}. 
Return your response as a structured list of relevant topics or documents with brief descriptions.`;

      const responseText = await this.vertexAI.query(searchPrompt);

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
            model: this.vertexAI.getConfig().model,
          }
        };
        this.searchCache.set(result.id, cachedDoc);
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ 
              results: [],
              error: `Error searching with Vertex AI: ${errorMessage}`
            }),
          },
        ],
      };
    }
  }

  /**
   * Parse Vertex AI response into structured search results
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
          url: `https://vertex-ai-search/${query.replace(/\s+/g, '-')}/${i}`,
        });
      }
    }

    // Ensure at least one result
    if (results.length === 0) {
      results.push({
        id: `doc-${Date.now()}-0`,
        title: query,
        url: `https://vertex-ai-search/${query.replace(/\s+/g, '-')}`,
      });
    }

    return results;
  }
}
