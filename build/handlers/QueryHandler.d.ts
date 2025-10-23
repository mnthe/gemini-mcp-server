/**
 * QueryHandler - Handles the query tool
 * Uses AgenticLoop for intelligent multi-turn execution with tools
 */
import { QueryInput } from '../schemas/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { AgenticLoop } from '../agentic/AgenticLoop.js';
export declare class QueryHandler {
    private conversationManager;
    private agenticLoop;
    private enableConversations;
    private logDir;
    private disableLogging;
    constructor(conversationManager: ConversationManager, agenticLoop: AgenticLoop, enableConversations?: boolean, logDir?: string, disableLogging?: boolean);
    /**
     * Handle a query tool request using AgenticLoop
     */
    handle(input: QueryInput): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Format agentic loop result for response
     */
    private formatResponse;
}
//# sourceMappingURL=QueryHandler.d.ts.map