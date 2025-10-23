/**
 * EnhancedMCPClient - Unified MCP client supporting both stdio and HTTP
 * Manages connections and tool discovery from multiple MCP servers
 */
import { Logger } from '../utils/Logger.js';
import { BaseTool } from '../agentic/Tool.js';
import { StdioMCPConnection } from './StdioMCPConnection.js';
import { HttpMCPConnection } from './HttpMCPConnection.js';
/**
 * MCP Tool wrapper - wraps MCP server tool as a Tool interface
 */
class MCPToolWrapper extends BaseTool {
    serverName;
    toolName;
    mcpClient;
    name;
    description;
    parameters;
    constructor(serverName, toolName, mcpClient, name, description, parameters) {
        super();
        this.serverName = serverName;
        this.toolName = toolName;
        this.mcpClient = mcpClient;
        this.name = name;
        this.description = description;
        this.parameters = parameters;
    }
    async execute(args, context) {
        this.validateArgs(args);
        return await this.mcpClient.callTool(this.serverName, this.toolName, args);
    }
}
export class EnhancedMCPClient {
    stdioServers = new Map();
    httpServers = new Map();
    logger;
    discoveredTools = [];
    constructor(sessionId, logDir, disableLogging = false, logToStderr = false) {
        this.logger = new Logger(sessionId, logDir, disableLogging, logToStderr);
    }
    /**
     * Initialize from MCP server configurations
     */
    async initialize(configs) {
        this.logger.info(`Initializing EnhancedMCPClient with ${configs.length} servers`);
        for (const config of configs) {
            try {
                if (config.transport === 'stdio') {
                    await this.initializeStdioServer(config);
                }
                else if (config.transport === 'http') {
                    await this.initializeHttpServer(config);
                }
                else {
                    this.logger.error(`Unknown transport type: ${config.transport}`);
                }
            }
            catch (error) {
                this.logger.error(`Failed to initialize MCP server ${config.name}`, error);
            }
        }
        // Discover tools from all servers
        await this.discoverTools();
        this.logger.info(`Initialized ${this.discoveredTools.length} tools from MCP servers`);
    }
    /**
     * Initialize stdio MCP server
     */
    async initializeStdioServer(config) {
        if (!config.command || !config.args) {
            throw new Error(`Stdio server ${config.name} missing command or args`);
        }
        const stdioConfig = {
            name: config.name,
            command: config.command,
            args: config.args,
        };
        const connection = new StdioMCPConnection(stdioConfig, this.logger);
        await connection.connect();
        this.stdioServers.set(config.name, connection);
        this.logger.info(`Initialized stdio MCP server: ${config.name}`);
    }
    /**
     * Initialize HTTP MCP server
     */
    async initializeHttpServer(config) {
        if (!config.url) {
            throw new Error(`HTTP server ${config.name} missing url`);
        }
        const httpConfig = {
            name: config.name,
            url: config.url,
            headers: config.headers,
        };
        const connection = new HttpMCPConnection(httpConfig, this.logger);
        await connection.connect();
        this.httpServers.set(config.name, connection);
        this.logger.info(`Initialized HTTP MCP server: ${config.name}`);
    }
    /**
     * Discover tools from all connected servers
     */
    async discoverTools() {
        this.discoveredTools = [];
        // Discover from stdio servers
        for (const [serverName, connection] of this.stdioServers.entries()) {
            try {
                const tools = await connection.listTools();
                this.logger.info(`Discovered ${tools.length} tools from stdio server ${serverName}`);
                for (const tool of tools) {
                    this.discoveredTools.push(new MCPToolWrapper(serverName, tool.name, this, `mcp_${serverName}_${tool.name}`, tool.description || `Tool ${tool.name} from ${serverName}`, tool.inputSchema));
                }
            }
            catch (error) {
                this.logger.error(`Failed to list tools from stdio server ${serverName}`, error);
            }
        }
        // Discover from HTTP servers
        for (const [serverName, connection] of this.httpServers.entries()) {
            try {
                const tools = await connection.listTools();
                this.logger.info(`Discovered ${tools.length} tools from HTTP server ${serverName}`);
                for (const tool of tools) {
                    this.discoveredTools.push(new MCPToolWrapper(serverName, tool.name, this, `mcp_${serverName}_${tool.name}`, tool.description || `Tool ${tool.name} from ${serverName}`, tool.inputSchema));
                }
            }
            catch (error) {
                this.logger.error(`Failed to list tools from HTTP server ${serverName}`, error);
            }
        }
        return this.discoveredTools;
    }
    /**
     * Get all discovered tools
     */
    getTools() {
        return this.discoveredTools;
    }
    /**
     * Call a tool on the appropriate server
     */
    async callTool(serverName, toolName, args) {
        // Try stdio server first
        if (this.stdioServers.has(serverName)) {
            return await this.stdioServers.get(serverName).callTool(toolName, args);
        }
        // Try HTTP server
        if (this.httpServers.has(serverName)) {
            return await this.httpServers.get(serverName).callTool(toolName, args);
        }
        throw new Error(`MCP server '${serverName}' not found`);
    }
    /**
     * Shutdown all connections
     */
    async shutdown() {
        this.logger.info('Shutting down EnhancedMCPClient');
        for (const connection of this.stdioServers.values()) {
            await connection.close();
        }
        for (const connection of this.httpServers.values()) {
            await connection.close();
        }
        this.stdioServers.clear();
        this.httpServers.clear();
        this.discoveredTools = [];
        this.logger.info('EnhancedMCPClient shutdown complete');
    }
}
//# sourceMappingURL=EnhancedMCPClient.js.map