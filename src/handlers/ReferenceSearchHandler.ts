import { ReferenceSearchInput } from '../schemas/index.js';
import { GeminiAIService } from '../services/GeminiAIService.js';

/**
 * Handles the reference_search tool (AI-assisted, grounded reference search).
 *
 * Composes an answer from live web sources using Gemini's Google Search
 * grounding and returns organized citations (links) plus claim->source supports.
 * The searchSuggestionsHtml, when present, is Google's required Search
 * Suggestions markup that callers must display alongside grounded answers.
 */
export class ReferenceSearchHandler {
  private geminiService: GeminiAIService;

  constructor(geminiService: GeminiAIService) {
    this.geminiService = geminiService;
  }

  async handle(input: ReferenceSearchInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.geminiService.referenceSearch(input.prompt, {
      model: input.model,
      backend: input.backend,
      excludeDomains: input.excludeDomains,
      blockingConfidence: input.blockingConfidence,
      timeRange: input.timeRange,
      includeImages: input.includeImages,
      urls: input.urls,
      systemInstruction: input.systemInstruction,
      thinkingLevel: input.thinkingLevel,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          answer: result.text,
          citations: result.citations,
          supports: result.supports,
          searchQueries: result.searchQueries,
          ...(result.searchEntryPoint ? { searchSuggestionsHtml: result.searchEntryPoint } : {}),
        }, null, 2),
      }],
    };
  }
}
