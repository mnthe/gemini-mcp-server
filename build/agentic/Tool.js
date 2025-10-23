/**
 * Tool - Interface and types for tool system
 * Follows MCP standard for tool definitions and execution
 */
/**
 * Base abstract class for tools
 */
export class BaseTool {
    /**
     * Validate arguments against parameters schema
     */
    validateArgs(args) {
        if (!this.parameters.required) {
            return;
        }
        const missing = this.parameters.required.filter((key) => !(key in args));
        if (missing.length > 0) {
            throw new Error(`Missing required parameters for tool '${this.name}': ${missing.join(', ')}`);
        }
    }
    /**
     * Get formatted tool definition for LLM prompt
     */
    getDefinition() {
        const params = this.formatParameters();
        return {
            name: this.name,
            description: this.description,
            parameters: params,
        };
    }
    /**
     * Format parameters for human-readable display
     */
    formatParameters() {
        const props = this.parameters.properties || {};
        const required = this.parameters.required || [];
        const lines = [];
        for (const [key, value] of Object.entries(props)) {
            const isRequired = required.includes(key);
            const typeInfo = value.type || 'any';
            const desc = value.description || '';
            const reqMarker = isRequired ? '(required)' : '(optional)';
            lines.push(`    ${key}: ${typeInfo} ${reqMarker} - ${desc}`);
        }
        return lines.length > 0 ? `{\n${lines.join('\n')}\n  }` : '{}';
    }
}
//# sourceMappingURL=Tool.js.map