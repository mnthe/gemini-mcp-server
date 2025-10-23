/**
 * DelegationAgent - Handles delegation to external MCP servers
 * Coordinates with external services and synthesizes results
 */

import { MCPClientManager } from '../managers/MCPClientManager.js';
import { VertexAIService } from '../services/VertexAIService.js';

export class DelegationAgent {
  private mcpClientManager: MCPClientManager;
  private vertexAI: VertexAIService;

  constructor(mcpClientManager: MCPClientManager, vertexAI: VertexAIService) {
    this.mcpClientManager = mcpClientManager;
    this.vertexAI = vertexAI;
  }

  /**
   * Delegate a task to an external MCP server
   */
  async delegate(
    prompt: string,
    targetServer: string | undefined,
    context: string = ""
  ): Promise<string> {
    if (!targetServer || !this.mcpClientManager.hasServer(targetServer)) {
      // Fallback to standard query if delegation not possible
      return await this.vertexAI.query(context + prompt);
    }

    try {
      // Attempt to delegate
      const result = await this.mcpClientManager.callTool(
        targetServer,
        'search',
        { query: prompt }
      );
      
      // Use Vertex AI to synthesize the delegated result
      const synthesisPrompt = `${context}External tool provided this information: ${JSON.stringify(result)}

Based on this and your knowledge, provide a comprehensive answer to: ${prompt}`;
      
      const synthesis = await this.vertexAI.query(synthesisPrompt);
      
      return `## Delegated Research\n[Used: ${targetServer}]\n\n${synthesis}`;
    } catch (error) {
      // Fallback to standard query if delegation fails
      return await this.vertexAI.query(context + prompt);
    }
  }

  /**
   * Check if delegation is available
   */
  isDelegationAvailable(): boolean {
    return this.mcpClientManager.listServers().length > 0;
  }
}
