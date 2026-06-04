/**
 * QueryHandler - Handles the query tool
 * Uses AgenticLoop for intelligent multi-turn execution with tools
 */

import { QueryInput } from '../schemas/index.js';
import { Message } from '../types/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { AgenticLoop } from '../agentic/AgenticLoop.js';

export class QueryHandler {
  private conversationManager: ConversationManager;
  private agenticLoop: AgenticLoop;
  private enableConversations: boolean;
  private logDir: string;
  private disableLogging: boolean;
  private logToStderr: boolean;

  constructor(
    conversationManager: ConversationManager,
    agenticLoop: AgenticLoop,
    enableConversations: boolean = true,
    logDir: string = './logs',
    disableLogging: boolean = false,
    logToStderr: boolean = false
  ) {
    this.conversationManager = conversationManager;
    this.agenticLoop = agenticLoop;
    this.enableConversations = enableConversations;
    this.logDir = logDir;
    this.disableLogging = disableLogging;
    this.logToStderr = logToStderr;
  }

  /**
   * Handle a query tool request using AgenticLoop with multimodal support
   */
  async handle(input: QueryInput): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      let sessionId: string | undefined;
      let conversationHistory: Message[] = [];

      // Handle conversation context
      if (this.enableConversations) {
        sessionId = this.conversationManager.getOrCreateSession(input.sessionId);
        conversationHistory = this.conversationManager.getHistory(sessionId);
      }
      const previousHistoryLength = conversationHistory.length;

      // Run agentic loop with multimodal parts if provided
      const result = await this.agenticLoop.run(
        input.prompt,
        conversationHistory,
        {
          sessionId,
          maxTurns: 10,
          logDir: this.logDir,
          disableLogging: this.disableLogging,
          logToStderr: this.logToStderr,
          model: input.model,
          thinkingLevel: input.thinkingLevel,
          mediaResolution: input.mediaResolution,
          backend: input.backend,
        },
        input.parts // Pass multimodal parts
      );

      // Update conversation history with all messages from result
      if (this.enableConversations && sessionId) {
        const newMessages = result.messages.slice(previousHistoryLength);
        for (const msg of newMessages) {
          this.conversationManager.addMessage(sessionId, msg);
        }
      }

      // Format response
      const responseText = this.formatResponse(result, sessionId, input.sessionId);

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error in agentic loop: ${errorMessage}`,
          },
        ],
      };
    }
  }

  /**
   * Format agentic loop result for response
   */
  private formatResponse(result: any, sessionId?: string, requestedSessionId?: string): string {
    const parts: string[] = [];

    // Session info
    if (sessionId) {
      parts.push(`[Session: ${sessionId}]`);
    } else if (requestedSessionId) {
      parts.push(
        `[Session: disabled — sessionId='${requestedSessionId}' was ignored. Set GEMINI_ENABLE_CONVERSATIONS=true to persist multi-turn history.]`
      );
    }

    // Stats
    if (result.toolCallsCount > 0 || result.reasoningStepsCount > 0) {
      parts.push(
        `[Stats: ${result.turnsUsed} turns, ${result.toolCallsCount} tool calls, ${result.reasoningStepsCount} reasoning steps]`
      );
    }

    // Final output
    parts.push(result.finalOutput);

    return parts.join('\n\n');
  }
}
