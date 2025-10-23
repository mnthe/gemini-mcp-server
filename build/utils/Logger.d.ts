/**
 * Logger - File-based logging system with reasoning trace support
 * Logs to both general log file and separate reasoning log
 */
export interface LogEntry {
    timestamp: string;
    level: 'info' | 'error' | 'reasoning' | 'tool';
    sessionId?: string;
    message: string;
    data?: any;
}
export interface ReasoningItem {
    step: number;
    thought: string;
    result: string;
}
export declare class Logger {
    private logDir;
    private sessionId;
    private generalLogPath;
    private reasoningLogPath;
    constructor(sessionId: string, logDir?: string);
    /**
     * Log info message
     */
    info(message: string, data?: any): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error): void;
    /**
     * Log reasoning step (separate file)
     */
    reasoning(step: ReasoningItem): void;
    /**
     * Log tool call
     */
    toolCall(toolName: string, args: any): void;
    /**
     * Log tool result
     */
    toolResult(toolName: string, result: any): void;
    /**
     * Write to general log file
     */
    private writeLog;
    /**
     * Write to reasoning log file (separate for easier analysis)
     */
    private writeReasoning;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
    /**
     * Get log file path for external access
     */
    getLogPath(): string;
    /**
     * Get reasoning log file path for external access
     */
    getReasoningLogPath(): string;
    /**
     * Static method to clean old logs (optional maintenance)
     */
    static cleanOldLogs(logDir: string, daysToKeep?: number): void;
}
//# sourceMappingURL=Logger.d.ts.map