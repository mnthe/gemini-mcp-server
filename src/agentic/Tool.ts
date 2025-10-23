/**
 * Tool - Interface and types for tool system
 * Follows MCP standard for tool definitions and execution
 */

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  [key: string]: any;
}

export interface ToolResult {
  status: 'success' | 'error';
  content: string;
  metadata?: Record<string, any>;
}

export interface RunContext {
  sessionId: string;
  context: Record<string, any>;
  [key: string]: any;
}

/**
 * Tool interface following MCP standard
 */
export interface Tool {
  /**
   * Tool name (must be unique)
   */
  name: string;

  /**
   * Human-readable description for LLM
   */
  description: string;

  /**
   * JSON Schema for parameters (MCP standard)
   */
  parameters: JSONSchema;

  /**
   * Execute the tool with given arguments
   */
  execute(args: any, context: RunContext): Promise<ToolResult>;
}

/**
 * Tool definition for LLM prompt
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: string; // Formatted parameter description
}

/**
 * Base abstract class for tools
 */
export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: JSONSchema;

  /**
   * Execute the tool - must be implemented by subclasses
   */
  abstract execute(args: any, context: RunContext): Promise<ToolResult>;

  /**
   * Validate arguments against parameters schema
   */
  protected validateArgs(args: any): void {
    if (!this.parameters.required) {
      return;
    }

    const missing = this.parameters.required.filter((key) => !(key in args));

    if (missing.length > 0) {
      throw new Error(
        `Missing required parameters for tool '${this.name}': ${missing.join(', ')}`
      );
    }
  }

  /**
   * Get formatted tool definition for LLM prompt
   */
  getDefinition(): ToolDefinition {
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
  private formatParameters(): string {
    const props = this.parameters.properties || {};
    const required = this.parameters.required || [];

    const lines: string[] = [];

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
