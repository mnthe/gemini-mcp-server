/**
 * ConversationManager - Handles multi-turn conversation sessions
 * Manages session creation, message history, and expiration
 */
import { Message } from '../types/index.js';
export declare class ConversationManager {
    private sessions;
    private sessionTimeout;
    private maxHistory;
    constructor(sessionTimeout?: number, maxHistory?: number);
    /**
     * Create a new conversation session
     */
    createSession(): string;
    /**
     * Get conversation history for a session
     */
    getHistory(sessionId: string): Message[];
    /**
     * Add a message to the conversation history
     */
    addMessage(sessionId: string, message: Message): void;
    /**
     * Clean up expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Get total number of active sessions
     */
    getActiveSessions(): number;
}
//# sourceMappingURL=ConversationManager.d.ts.map