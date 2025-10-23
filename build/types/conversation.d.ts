/**
 * Types for conversation management
 */
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
export interface ConversationSession {
    id: string;
    history: Message[];
    created: Date;
    lastAccessed: Date;
}
//# sourceMappingURL=conversation.d.ts.map