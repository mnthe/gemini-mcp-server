import { describe, expect, it } from 'vitest';

import { QueryHandler } from './QueryHandler.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { Message } from '../types/index.js';

class RecordingAgenticLoop {
  runs: Array<{ prompt: string; history: Message[]; options: any }> = [];

  async run(prompt: string, history: Message[], options: any) {
    this.runs.push({ prompt, history: [...history], options });

    return {
      sessionId: options.sessionId ?? 'internal-session',
      finalOutput: `answer: ${prompt}`,
      messages: [
        ...history,
        { role: 'user' as const, content: prompt, timestamp: new Date() },
        { role: 'assistant' as const, content: `answer: ${prompt}`, timestamp: new Date() },
      ],
      toolCallsCount: 0,
      reasoningStepsCount: 0,
      turnsUsed: 1,
    };
  }
}

describe('QueryHandler conversations', () => {
  it('creates and reuses caller-provided session IDs', async () => {
    const conversationManager = new ConversationManager(3600, 10);
    const agenticLoop = new RecordingAgenticLoop();
    const handler = new QueryHandler(conversationManager, agenticLoop as any, true, './logs', true);

    await handler.handle({ prompt: 'remember alpha', sessionId: 'shared-session' });
    const secondResponse = await handler.handle({ prompt: 'what did I ask?', sessionId: 'shared-session' });

    expect(agenticLoop.runs[1].history.map((message) => message.content)).toEqual([
      'remember alpha',
      'answer: remember alpha',
    ]);
    expect(secondResponse.content[0].text).toContain('[Session: shared-session]');
  });

  it('stores only messages generated during the current run', async () => {
    const conversationManager = new ConversationManager(3600, 10);
    const agenticLoop = new RecordingAgenticLoop();
    const handler = new QueryHandler(conversationManager, agenticLoop as any, true, './logs', true);

    await handler.handle({ prompt: 'first', sessionId: 'no-duplicates' });
    await handler.handle({ prompt: 'second', sessionId: 'no-duplicates' });

    expect(conversationManager.getHistory('no-duplicates').map((message) => message.content)).toEqual([
      'first',
      'answer: first',
      'second',
      'answer: second',
    ]);
  });

  it('warns the caller when sessionId is supplied but conversation storage is disabled', async () => {
    const conversationManager = new ConversationManager(3600, 10);
    const agenticLoop = new RecordingAgenticLoop();
    const handler = new QueryHandler(conversationManager, agenticLoop as any, false, './logs', true);

    const response = await handler.handle({ prompt: 'hello', sessionId: 'disabled-session' });

    expect(agenticLoop.runs[0].options.sessionId).toBeUndefined();
    expect(response.content[0].text).not.toContain('[Session: disabled-session]\n');
    expect(response.content[0].text).toContain("[Session: disabled");
    expect(response.content[0].text).toContain("disabled-session");
    expect(response.content[0].text).toContain('GEMINI_ENABLE_CONVERSATIONS');
  });

  it('omits the session warning when sessionId is not supplied and conversation storage is disabled', async () => {
    const conversationManager = new ConversationManager(3600, 10);
    const agenticLoop = new RecordingAgenticLoop();
    const handler = new QueryHandler(conversationManager, agenticLoop as any, false, './logs', true);

    const response = await handler.handle({ prompt: 'hello' });

    expect(response.content[0].text).not.toContain('[Session');
    expect(response.content[0].text).not.toContain('GEMINI_ENABLE_CONVERSATIONS');
  });
});
