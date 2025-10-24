/**
 * Zod validation schemas for tool inputs
 */

import { z } from "zod";

// Schema for inline data (base64 encoded files)
const InlineDataSchema = z.object({
  mimeType: z.string().describe("MIME type of the file (e.g., 'image/jpeg', 'audio/mp3', 'video/mp4')"),
  data: z.string().describe("Base64 encoded file data"),
});

// Schema for file data (Cloud Storage URIs)
const FileDataSchema = z.object({
  mimeType: z.string().describe("MIME type of the file"),
  fileUri: z.string().describe("URI of the file (gs:// for Cloud Storage or https:// for public URLs)"),
});

// Schema for a single multimodal part
const MultimodalPartSchema = z.object({
  text: z.string().optional().describe("Text content"),
  inlineData: InlineDataSchema.optional().describe("Inline base64 encoded file data"),
  fileData: FileDataSchema.optional().describe("File URI for Cloud Storage or public URLs"),
});

export const QuerySchema = z.object({
  prompt: z.string().describe("The text prompt to send to Vertex AI"),
  sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
  parts: z.array(MultimodalPartSchema).optional().describe("Optional multimodal content parts (images, audio, video, documents)"),
});

export const SearchSchema = z.object({
  query: z.string().describe("The search query"),
});

export const FetchSchema = z.object({
  id: z.string().describe("The unique identifier for the document to fetch"),
});

export type QueryInput = z.infer<typeof QuerySchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FetchInput = z.infer<typeof FetchSchema>;
