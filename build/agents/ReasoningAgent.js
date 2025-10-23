/**
 * ReasoningAgent - Handles chain-of-thought reasoning
 * Breaks down complex problems into steps and synthesizes answers
 */
export class ReasoningAgent {
    vertexAI;
    maxSteps;
    constructor(vertexAI, maxSteps = 5) {
        this.vertexAI = vertexAI;
        this.maxSteps = maxSteps;
    }
    /**
     * Apply chain-of-thought reasoning to a prompt
     */
    async reason(prompt, context = "") {
        const steps = Math.min(3, this.maxSteps);
        const reasoningSteps = [];
        // Step 1: Break down the problem
        const breakdownPrompt = `${context}Break down this complex problem into ${steps} logical steps: ${prompt}\n\nProvide a structured breakdown.`;
        const breakdownResponse = await this.vertexAI.query(breakdownPrompt);
        reasoningSteps.push({
            step: 0,
            thought: "Problem breakdown",
            result: breakdownResponse,
        });
        // Process each reasoning step
        for (let i = 1; i <= steps; i++) {
            const stepPrompt = `${context}Problem: "${prompt}"

Previous reasoning:
${reasoningSteps.map(s => `${s.thought}: ${s.result}`).join('\n\n')}

Now reason through step ${i} of ${steps}.`;
            const stepResponse = await this.vertexAI.query(stepPrompt);
            reasoningSteps.push({
                step: i,
                thought: `Step ${i}`,
                result: stepResponse,
            });
        }
        // Final synthesis
        const synthesisPrompt = `${context}Based on this reasoning, provide a final answer to: ${prompt}

Reasoning steps:
${reasoningSteps.map(s => `${s.thought}:\n${s.result}`).join('\n\n')}`;
        const finalAnswer = await this.vertexAI.query(synthesisPrompt);
        // Format response with reasoning trace
        return this.formatReasoningOutput(reasoningSteps, finalAnswer);
    }
    /**
     * Format the reasoning output
     */
    formatReasoningOutput(steps, finalAnswer) {
        return `## Chain-of-Thought Reasoning

${steps.map((s, idx) => `### ${s.thought}\n${s.result}`).join('\n\n')}

## Final Answer
${finalAnswer}`;
    }
}
//# sourceMappingURL=ReasoningAgent.js.map