import { AITool } from './ai/ai_tool.js';
import { GoogleTool } from './google/google_tool.js';
import { MetaCognitiveTool } from './meta/meta_cognitive_tool.js';
import { PatternRecognitionTool } from './pattern/pattern_recognition_tool.js';
import { WebTool } from './web/web_tool.js';

class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.initializeTools();
    }

    initializeTools() {
        // Initialize all available tools
        try {
            this.registerTool('ai', new AITool());
        } catch (error) {
            console.warn('AI Tool initialization failed:', error.message);
        }

        try {
            this.registerTool('web', new WebTool());
        } catch (error) {
            console.warn('Web Tool initialization failed:', error.message);
        }

        try {
            this.registerTool('meta', new MetaCognitiveTool());
        } catch (error) {
            console.warn('Meta Cognitive Tool initialization failed:', error.message);
        }

        try {
            this.registerTool('pattern', new PatternRecognitionTool());
        } catch (error) {
            console.warn('Pattern Recognition Tool initialization failed:', error.message);
        }

        try {
            this.registerTool('google', new GoogleTool());
        } catch (error) {
            console.warn('Google Tool initialization failed:', error.message);
        }
    }

    registerTool(name, tool) {
        this.tools.set(name, tool);
    }

    getTool(name) {
        return this.tools.get(name);
    }

    getAllTools() {
        return Array.from(this.tools.entries()).map(([name, tool]) => ({
            name,
            capabilities: this.getToolCapabilities(tool)
        }));
    }

    getToolCapabilities(tool) {
        // Get all methods of the tool that aren't from Object.prototype
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(tool))
            .filter(name => name !== 'constructor' && typeof tool[name] === 'function');

        return {
            methods,
            config: tool.config || {},
            provider: tool.availableProviders || []
        };
    }

    async executeToolMethod(toolName, methodName, params) {
        const tool = this.getTool(toolName);
        if (!tool) {
            throw new Error(`Tool '${toolName}' not found`);
        }

        if (typeof tool[methodName] !== 'function') {
            throw new Error(`Method '${methodName}' not found in tool '${toolName}'`);
        }

        try {
            return await tool[methodName](params);
        } catch (error) {
            throw new Error(`Error executing ${toolName}.${methodName}: ${error.message}`);
        }
    }
}

export { ToolRegistry };
