/**
 * DelegationAgent - Handles delegation to external MCP servers
 * Coordinates with external services and synthesizes results
 */
import { MCPClientManager } from '../managers/MCPClientManager.js';
import { VertexAIService } from '../services/VertexAIService.js';
export declare class DelegationAgent {
    private mcpClientManager;
    private vertexAI;
    constructor(mcpClientManager: MCPClientManager, vertexAI: VertexAIService);
    /**
     * Delegate a task to an external MCP server
     */
    delegate(prompt: string, targetServer: string | undefined, context?: string): Promise<string>;
    /**
     * Check if delegation is available
     */
    isDelegationAvailable(): boolean;
}
//# sourceMappingURL=DelegationAgent.d.ts.map