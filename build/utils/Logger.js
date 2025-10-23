/**
 * Logger - File-based logging system with reasoning trace support
 * Logs to both general log file and separate reasoning log
 */
import * as fs from 'fs';
import * as path from 'path';
export class Logger {
    logDir;
    sessionId;
    generalLogPath;
    reasoningLogPath;
    disabled;
    constructor(sessionId, logDir, disabled = false) {
        this.sessionId = sessionId;
        this.disabled = disabled;
        this.logDir = logDir || './logs';
        this.generalLogPath = path.join(this.logDir, 'general.log');
        this.reasoningLogPath = path.join(this.logDir, 'reasoning.log');
        // Ensure log directory exists only if logging is enabled
        if (!this.disabled) {
            this.ensureLogDirectory();
        }
    }
    /**
     * Log info message
     */
    info(message, data) {
        this.writeLog('info', message, data);
    }
    /**
     * Log error message
     */
    error(message, error) {
        const errorData = error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : undefined;
        this.writeLog('error', message, errorData);
    }
    /**
     * Log reasoning step (separate file)
     */
    reasoning(step) {
        const reasoningText = `
================================================================================
[${new Date().toISOString()}] Session: ${this.sessionId}
Step ${step.step}: ${step.thought}
--------------------------------------------------------------------------------
${step.result}
================================================================================
`;
        this.writeReasoning(reasoningText);
        this.writeLog('reasoning', `Step ${step.step}: ${step.thought}`, { result: step.result });
    }
    /**
     * Log tool call
     */
    toolCall(toolName, args) {
        this.writeLog('tool', `CALL: ${toolName}`, { args });
    }
    /**
     * Log tool result
     */
    toolResult(toolName, result) {
        this.writeLog('tool', `RESULT: ${toolName}`, { result });
    }
    /**
     * Write to general log file
     */
    writeLog(level, message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level,
            sessionId: this.sessionId,
            message,
            data,
        };
        const logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.sessionId}] ${entry.message}`;
        const fullLine = data ? `${logLine} | ${JSON.stringify(data)}\n` : `${logLine}\n`;
        // Skip file writing if logging is disabled
        if (this.disabled) {
            return;
        }
        try {
            fs.appendFileSync(this.generalLogPath, fullLine, 'utf8');
        }
        catch (error) {
            // Fallback to console if file write fails (only in development)
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to write to log file:', error);
                console.log(fullLine);
            }
        }
    }
    /**
     * Write to reasoning log file (separate for easier analysis)
     */
    writeReasoning(reasoningText) {
        // Skip file writing if logging is disabled
        if (this.disabled) {
            return;
        }
        try {
            fs.appendFileSync(this.reasoningLogPath, reasoningText, 'utf8');
        }
        catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to write to reasoning log:', error);
                console.log(reasoningText);
            }
        }
    }
    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        }
        catch (error) {
            // Silently ignore directory creation errors
            // Logging will be skipped if directory doesn't exist
            if (process.env.NODE_ENV === 'development') {
                console.error('Failed to create log directory:', error);
            }
        }
    }
    /**
     * Get log file path for external access
     */
    getLogPath() {
        return this.generalLogPath;
    }
    /**
     * Get reasoning log file path for external access
     */
    getReasoningLogPath() {
        return this.reasoningLogPath;
    }
    /**
     * Static method to clean old logs (optional maintenance)
     */
    static cleanOldLogs(logDir, daysToKeep = 7) {
        try {
            const files = fs.readdirSync(logDir);
            const now = Date.now();
            const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
            for (const file of files) {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        catch (error) {
            console.error('Failed to clean old logs:', error);
        }
    }
}
//# sourceMappingURL=Logger.js.map