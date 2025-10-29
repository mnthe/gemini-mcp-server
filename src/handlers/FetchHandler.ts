/**
 * FetchHandler - Handles the fetch tool
 * Retrieves full document contents by ID following OpenAI MCP spec
 */

import { FetchInput } from '../schemas/index.js';
import { FetchResult, CachedDocument } from '../types/index.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { createJsonResponse, createErrorResponse } from '../utils/responseFormatter.js';

export class FetchHandler {
  private searchCache: Map<string, CachedDocument>;

  constructor(searchCache: Map<string, CachedDocument>) {
    this.searchCache = searchCache;
  }

  /**
   * Handle a fetch tool request
   */
  async handle(input: FetchInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const cachedDoc = this.searchCache.get(input.id);

      if (!cachedDoc) {
        return createErrorResponse(
          `Document with id '${input.id}' not found. Please perform a search first.`
        );
      }

      // Return document in OpenAI MCP format
      const fetchResult: FetchResult = {
        id: cachedDoc.id,
        title: cachedDoc.title,
        text: cachedDoc.text,
        url: cachedDoc.url,
        metadata: cachedDoc.metadata
      };

      return createJsonResponse(fetchResult);
    } catch (error) {
      return createErrorResponse(
        `Error fetching document: ${getErrorMessage(error)}`
      );
    }
  }
}
