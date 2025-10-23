/**
 * FetchHandler - Handles the fetch tool
 * Retrieves full document contents by ID following OpenAI MCP spec
 */
export class FetchHandler {
    searchCache;
    constructor(searchCache) {
        this.searchCache = searchCache;
    }
    /**
     * Handle a fetch tool request
     */
    async handle(input) {
        try {
            const cachedDoc = this.searchCache.get(input.id);
            if (!cachedDoc) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `Document with id '${input.id}' not found. Please perform a search first.`
                            }),
                        },
                    ],
                };
            }
            // Return document in OpenAI MCP format
            const fetchResult = {
                id: cachedDoc.id,
                title: cachedDoc.title,
                text: cachedDoc.text,
                url: cachedDoc.url,
                metadata: cachedDoc.metadata
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(fetchResult),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Error fetching document: ${errorMessage}`
                        }),
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=FetchHandler.js.map