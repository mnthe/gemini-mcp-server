/**
 * QueryHandler - Handles the query tool
 * Uses AgenticLoop for intelligent multi-turn execution with tools
 */

import { QueryInput } from '../schemas/index.js';
import { GeminiAIConfig, Message } from '../types/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { AgenticLoop } from '../agentic/AgenticLoop.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { createTextResponse } from '../utils/responseFormatter.js';

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
      let sessionId = input.sessionId;
      let conversationHistory: Message[] = [];

      // Handle conversation context
      if (this.enableConversations) {
        if (!sessionId) {
          sessionId = this.conversationManager.createSession();
        }

        conversationHistory = this.conversationManager.getHistory(sessionId);
      }

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
        },
        input.parts // Pass multimodal parts
      );

      // Update conversation history with all messages from result
      if (this.enableConversations && sessionId) {
        for (const msg of result.messages) {
          this.conversationManager.addMessage(sessionId, msg);
        }
      }

      // Format response
      const responseText = this.formatResponse(result, sessionId);

      return createTextResponse(responseText);
    } catch (error) {
      return createTextResponse(
        `Error in agentic loop: ${getErrorMessage(error)}`
      );
    }
  }

  /**
   * Format agentic loop result for response
   */
  private formatResponse(result: any, sessionId?: string): string {
    const parts: string[] = [];

    // Session info
    if (sessionId) {
      parts.push(`[Session: ${sessionId}]`);
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
