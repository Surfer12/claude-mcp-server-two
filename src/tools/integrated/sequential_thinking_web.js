import cors from 'cors';
import express from 'express';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WebSequentialThinkingServer {
    constructor(port = 3001) {
        this.port = port;
        this.app = express();
        this.currentSequence = [];
        this.tools = {
            think: this.executeTool.bind(this, 'think'),
            analysis: this.executeTool.bind(this, 'analysis'),
            history: this.executeTool.bind(this, 'history'),
            reset: this.executeTool.bind(this, 'reset')
        };
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(__dirname));
    }

    async executeTool(toolName, params) {
        switch (toolName) {
            case 'think':
                const result = {
                    step: params.thoughtNumber,
                    data: { thought: params.thought, stage: params.stage },
                    timestamp: new Date().toISOString(),
                    tags: params.tags
                };
                this.currentSequence.push(result);
                return result;

            case 'analysis':
                return {
                    timestamp: new Date().toISOString(),
                    results: {
                        patterns: this.currentSequence.length,
                        adaptations: 0,
                        metrics: this.currentSequence.length,
                        recommendations: []
                    }
                };

            case 'history':
                return this.currentSequence;

            case 'reset':
                this.currentSequence = [];
                return { message: 'Thinking sequence reset successfully' };

            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    setupRoutes() {
        // List available tools
        this.app.get('/mcp/tools', (req, res) => {
            const toolList = Object.keys(this.tools).map(toolName => ({
                name: toolName,
                description: this.getToolDescription(toolName),
                parameters: this.getToolParameters(toolName)
            }));
            res.json(toolList);
        });

        // Execute tool endpoint
        this.app.post('/mcp/execute/:toolName', async (req, res) => {
            try {
                const { toolName } = req.params;
                const tool = this.tools[toolName];

                if (!tool) {
                    return res.status(404).json({ error: `Tool '${toolName}' not found` });
                }

                const result = await tool(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // MCP State endpoint
        this.app.get('/mcp/state', (req, res) => {
            const state = {
                version: '1.0.0',
                status: 'ready',
                currentSequence: this.currentSequence.length,
                lastUpdate: new Date().toISOString(),
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                availableTools: Object.keys(this.tools)
            };
            res.json(state);
        });

        // MCP Capabilities endpoint
        this.app.get('/mcp/capabilities', (req, res) => {
            const capabilities = {
                version: '1.0.0',
                name: 'sequential-thinking',
                description: 'Sequential Thinking MCP Server for structured problem-solving',
                tools: [
                    {
                        name: 'think',
                        description: 'Process a sequential thinking step',
                        endpoint: '/mcp/execute/think',
                        method: 'POST',
                        parameters: {
                            thought: {
                                type: 'string',
                                description: 'The thought content'
                            },
                            thoughtNumber: {
                                type: 'integer',
                                description: 'Sequential number of the thought'
                            },
                            stage: {
                                type: 'string',
                                enum: ['Problem Definition', 'Analysis', 'Ideation', 'Evaluation', 'Conclusion'],
                                description: 'Current stage of thinking'
                            },
                            tags: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                description: 'Tags for categorizing the thought'
                            }
                        }
                    },
                    {
                        name: 'analysis',
                        description: 'Get analysis of the thinking sequence',
                        endpoint: '/mcp/execute/analysis',
                        method: 'POST'
                    },
                    {
                        name: 'history',
                        description: 'Get thinking sequence history',
                        endpoint: '/mcp/execute/history',
                        method: 'POST'
                    },
                    {
                        name: 'reset',
                        description: 'Reset the thinking sequence',
                        endpoint: '/mcp/execute/reset',
                        method: 'POST'
                    }
                ],
                features: {
                    persistentMemory: true,
                    patternRecognition: true,
                    sequentialProcessing: true,
                    metaCognition: true
                }
            };
            res.json(capabilities);
        });

        // Legacy API endpoints
        this.app.post('/api/think', async (req, res) => {
            try {
                const result = await this.executeTool('think', req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/analysis', async (req, res) => {
            try {
                const result = await this.executeTool('analysis');
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/history', async (req, res) => {
            try {
                const result = await this.executeTool('history');
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/reset', async (req, res) => {
            try {
                const result = await this.executeTool('reset');
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
    }

    getToolDescription(toolName) {
        const descriptions = {
            think: 'Process a sequential thinking step',
            analysis: 'Get analysis of the thinking sequence',
            history: 'Get thinking sequence history',
            reset: 'Reset the thinking sequence'
        };
        return descriptions[toolName] || 'No description available';
    }

    getToolParameters(toolName) {
        const parameters = {
            think: {
                thought: {
                    type: 'string',
                    description: 'The thought content'
                },
                thoughtNumber: {
                    type: 'integer',
                    description: 'Sequential number of the thought'
                },
                stage: {
                    type: 'string',
                    enum: ['Problem Definition', 'Analysis', 'Ideation', 'Evaluation', 'Conclusion'],
                    description: 'Current stage of thinking'
                },
                tags: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Tags for categorizing the thought'
                }
            }
        };
        return parameters[toolName] || {};
    }

    start() {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`Sequential Thinking Web Server running on port ${this.port}`);
                resolve();
            });
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }
}

// Create and start the server
const server = new WebSequentialThinkingServer();
server.start().then(() => {
    console.log('Server is ready to accept requests');
});
