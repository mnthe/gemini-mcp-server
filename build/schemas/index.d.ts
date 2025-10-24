/**
 * Zod validation schemas for tool inputs
 */
import { z } from "zod";
export declare const QuerySchema: z.ZodObject<{
    prompt: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    parts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        inlineData: z.ZodOptional<z.ZodObject<{
            mimeType: z.ZodString;
            data: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            mimeType: string;
            data: string;
        }, {
            mimeType: string;
            data: string;
        }>>;
        fileData: z.ZodOptional<z.ZodObject<{
            mimeType: z.ZodString;
            fileUri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            mimeType: string;
            fileUri: string;
        }, {
            mimeType: string;
            fileUri: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        text?: string | undefined;
        inlineData?: {
            mimeType: string;
            data: string;
        } | undefined;
        fileData?: {
            mimeType: string;
            fileUri: string;
        } | undefined;
    }, {
        text?: string | undefined;
        inlineData?: {
            mimeType: string;
            data: string;
        } | undefined;
        fileData?: {
            mimeType: string;
            fileUri: string;
        } | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    sessionId?: string | undefined;
    parts?: {
        text?: string | undefined;
        inlineData?: {
            mimeType: string;
            data: string;
        } | undefined;
        fileData?: {
            mimeType: string;
            fileUri: string;
        } | undefined;
    }[] | undefined;
}, {
    prompt: string;
    sessionId?: string | undefined;
    parts?: {
        text?: string | undefined;
        inlineData?: {
            mimeType: string;
            data: string;
        } | undefined;
        fileData?: {
            mimeType: string;
            fileUri: string;
        } | undefined;
    }[] | undefined;
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