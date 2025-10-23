/**
 * Types for search and fetch operations (OpenAI MCP spec)
 */

export interface SearchResult {
  id: string;
  title: string;
  url: string;
}

export interface FetchResult {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface CachedDocument {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, unknown>;
}
