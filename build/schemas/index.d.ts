/**
 * Zod validation schemas for tool inputs
 */
import { z } from "zod";
export declare const QuerySchema: z.ZodObject<{
    prompt: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    sessionId?: string | undefined;
}, {
    prompt: string;
    sessionId?: string | undefined;
}>;
export declare const SearchSchema: z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>;
export declare const FetchSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type QueryInput = z.infer<typeof QuerySchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FetchInput = z.infer<typeof FetchSchema>;
//# sourceMappingURL=index.d.ts.map