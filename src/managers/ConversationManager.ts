/**
 * ConversationManager - Handles multi-turn conversation sessions
 * Manages session creation, message history, and expiration
 */

import { randomBytes } from "crypto";
import { ConversationSession, Message } from '../types/index.js';

export class ConversationManager {
  private sessions: Map<string, ConversationSession> = new Map();
  private sessionTimeout: number;
  private maxHistory: number;

  constructor(sessionTimeout: number = 3600, maxHistory: number = 10) {
    this.sessionTimeout = sessionTimeout * 1000; // Convert to milliseconds
    this.maxHistory = maxHistory;

    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
  }

  /**
   * Create a new conversation session
   */
  createSession(): string {
    const sessionId = randomBytes(16).toString("hex");
    const session: ConversationSession = {
      id: sessionId,
      history: [],
      created: new Date(),
      lastAccessed: new Date(),
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get conversation history for a session
   */
  getHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    // Update last accessed time
    session.lastAccessed = new Date();
    return session.history;
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.history.push(message);
    session.lastAccessed = new Date();

    // Trim history if it exceeds max length
    if (session.history.length > this.maxHistory) {
      session.history = session.history.slice(-this.maxHistory);
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date().getTime();
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastAccessedTime = session.lastAccessed.getTime();
      if (now - lastAccessedTime > this.sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get total number of active sessions
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }
}
