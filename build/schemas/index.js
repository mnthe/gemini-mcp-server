/**
 * Zod validation schemas for tool inputs
 */
import { z } from "zod";
export const QuerySchema = z.object({
    prompt: z.string().describe("The prompt to send to Vertex AI"),
    sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
});
export const SearchSchema = z.object({
    query: z.string().describe("The search query"),
});
export const FetchSchema = z.object({
    id: z.string().describe("The unique identifier for the document to fetch"),
});
//# sourceMappingURL=index.js.map