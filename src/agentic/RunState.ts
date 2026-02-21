/**
 * RunState - Manages state for agentic loop execution
 * In-memory only (no serialization needed for chat MCP server)
 */

import { Logger } from '../utils/Logger.js';
import { Message } from '../types/index.js';

export interface RunItem {
  type: 'message' | 'tool_call' | 'tool_result' | 'reasoning';
  content: any;
  timestamp: Date;
}

export interface ToolCallRecord {
  tool: string;
  args: any;
  result: {
    status: 'success' | 'error';
    content: string;
  };
  timestamp: Date;
}

export interface ReasoningItem {
  step: number;
  thought: string;
  result: string;
}

export interface RunOptions {
  sessionId?: string;
  maxTurns?: number;
  context?: Record<string, any>;
  logDir?: string;
  disableLogging?: boolean;
  logToStderr?: boolean;
  model?: string;
}

export class RunState {
  // Turn tracking
  public currentTurn: number = 0;
  public readonly maxTurns: number;

  // Message history (in-memory only)
  public messages: Message[] = [];
  public generatedItems: RunItem[] = [];

  // Context
  public readonly sessionId: string;
  public context: Record<string, any>;

  // Tracking
  public toolCallHistory: ToolCallRecord[] = [];
  public reasoningSteps: ReasoningItem[] = [];

  // Logging
  public readonly logger: Logger;

  constructor(options: RunOptions = {}) {
    this.maxTurns = options.maxTurns ?? 10;
    this.sessionId = options.sessionId ?? this.generateSessionId();
    this.context = options.context ?? {};
    const disableLogging = options.disableLogging ?? false;
    const logToStderr = options.logToStderr ?? false;
    this.logger = new Logger(this.sessionId, options.logDir, disableLogging, logToStderr);

    this.logger.info('RunState initialized', {
      maxTurns: this.maxTurns,
      sessionId: this.sessionId,
    });
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(message: Message): void {
    this.messages.push(message);
    this.generatedItems.push({
      type: 'message',
      content: message,
      timestamp: new Date(),
    });

    this.logger.info('Message added', {
      role: message.role,
      contentLength: message.content.length,
    });
  }

  /**
   * Add a tool result to the state
   */
  addToolResult(record: ToolCallRecord): void {
    this.toolCallHistory.push(record);
    this.generatedItems.push({
      type: 'tool_result',
      content: record,
      timestamp: new Date(),
    });

    this.logger.info('Tool result added', {
      tool: record.tool,
      status: record.result.status,
    });
  }

  /**
   * Add a reasoning step
   */
  addReasoning(reasoning: ReasoningItem): void {
    this.reasoningSteps.push(reasoning);
    this.generatedItems.push({
      type: 'reasoning',
      content: reasoning,
      timestamp: new Date(),
    });

    this.logger.reasoning(reasoning);
  }

  /**
   * Check if the loop can continue
   */
  canContinue(): boolean {
    return this.currentTurn < this.maxTurns;
  }

  /**
   * Get conversation context as formatted string
   */
  getConversationContext(): string {
    if (this.messages.length === 0) {
      return '';
    }

    return this.messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Get tool results summary
   */
  getToolResultsSummary(): string {
    if (this.toolCallHistory.length === 0) {
      return 'No tools used yet.';
    }

    return this.toolCallHistory
      .map((record) => {
        const status = record.result.status === 'success' ? '✓' : '✗';
        const preview = record.result.content.substring(0, 100);
        return `${status} ${record.tool}: ${preview}${record.result.content.length > 100 ? '...' : ''}`;
      })
      .join('\n');
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get state summary for debugging
   */
  getSummary(): string {
    return `RunState {
  sessionId: ${this.sessionId}
  currentTurn: ${this.currentTurn}/${this.maxTurns}
  messages: ${this.messages.length}
  toolCalls: ${this.toolCallHistory.length}
  reasoningSteps: ${this.reasoningSteps.length}
}`;
  }
}
