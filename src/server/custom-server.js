import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import http from 'http';
import OpenAI from 'openai';
import { MetaCognitiveTool } from '../tools/meta/meta_cognitive_tool.js';
import { ToolRegistry } from '../tools/tool_registry.js';
import { Logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// MCP Protocol Constants
const MCP_VERSION = '1.0.0';
const MCP_CAPABILITIES = {
  codeGeneration: true,
  codeAnalysis: true,
  metaCognition: true,
  performanceMonitoring: true,
  tools: true
};

// Log environment variables (without sensitive values)
Logger.info('Environment loaded', {
  hasOpenAIKey: !!process.env.OPENAI_API_KEY,
  hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  hasGoogleKey: !!process.env.GOOGLE_API_KEY,
  port: process.env.PORT
});

// LLM Provider Abstract Class
class LLMProvider {
  constructor(config) {
    this.config = config;
  }

  async chat(messages, options = {}) {
    throw new Error('Chat method must be implemented by subclass');
  }

  async generateCode(prompt, context) {
    throw new Error('Code generation method must be implemented by subclass');
  }

  async codeReview(code, language) {
    throw new Error('Code review method must be implemented by subclass');
  }

  async analyzeCode(code, options = {}) {
    throw new Error('Code analysis method must be implemented by subclass');
  }
}

// OpenAI Provider Implementation
class OpenAIProvider extends LLMProvider {
  constructor(apiKey) {
    super({ apiKey });
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages, options = {}) {
    const response = await this.client.chat.completions.create({
      model: options.model || "gpt-4-turbo",
      messages,
      ...options
    });
    return response.choices[0].message.content;
  }

  async generateCode(prompt, context) {
    const messages = [
      { role: 'system', content: 'You are an expert code generation assistant.' },
      { role: 'user', content: prompt },
      { role: 'system', content: `Context: ${JSON.stringify(context)}` }
    ];
    return this.chat(messages, {
      model: 'gpt-4-turbo',
      temperature: 0.7
    });
  }

  async codeReview(code, language) {
    const prompt = `Perform a comprehensive code review for this ${language} code, focusing on:
    1. Potential bugs
    2. Performance improvements
    3. Best practices and style
    4. Security vulnerabilities

    Code:
    \`\`\`${language}
    ${code}
    \`\`\``;

    return this.chat([{ role: 'user', content: prompt }]);
  }

  async analyzeCode(code, options = {}) {
    const analysisTypes = options.types || ['complexity', 'patterns', 'security'];
    const messages = [
      {
        role: 'system',
        content: 'You are an expert code analyzer. Analyze the provided code and return structured insights.'
      },
      {
        role: 'user',
        content: `Analyze this code focusing on ${analysisTypes.join(', ')}:

        \`\`\`
        ${code}
        \`\`\`

        Provide analysis in JSON format with metrics and recommendations.`
      }
    ];

    const response = await this.chat(messages, {
      model: 'gpt-4-turbo',
      temperature: 0.3
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        error: 'Failed to parse analysis response',
        rawResponse: response
      };
    }
  }
}

// Anthropic Provider Implementation
class AnthropicProvider extends LLMProvider {
  constructor(apiKey) {
    super({ apiKey });
    this.client = new Anthropic({
      apiKey: apiKey,
      maxRetries: 3
    });
    Logger.info('Anthropic provider initialized');
  }

  async chat(messages, options = {}) {
    Logger.info('Preparing Anthropic request', { messageCount: messages.length });
    try {
      const response = await this.client.messages.create({
        model: options.model || "claude-3-5-sonnet-20241022",
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.7,
        messages: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      });
      Logger.info('Anthropic request successful');
      return response.content[0].text;
    } catch (error) {
      Logger.error('Anthropic API error', {
        error: error.message,
        stack: error.stack,
        messages: messages.map(m => ({ role: m.role }))
      });
      throw error;
    }
  }

  async generateCode(prompt, context) {
    const messages = [
      {
        role: 'user',
        content: `Generate high-quality code based on this prompt and context.

        Prompt: ${prompt}
        Context: ${JSON.stringify(context)}

        Please provide clean, efficient, and well-documented code.`
      }
    ];
    return this.chat(messages, {
      model: 'claude-3-sonnet',
      temperature: 0.7
    });
  }

  async codeReview(code, language) {
    const messages = [
      {
        role: 'user',
        content: `Perform a detailed code review for this ${language} code:

        \`\`\`${language}
        ${code}
        \`\`\`

        Please analyze:
        - Potential logical errors
        - Performance considerations
        - Security implications
        - Idiomatic language usage
        - Possible refactoring opportunities`
      }
    ];
    return this.chat(messages);
  }

  async analyzeCode(code, options = {}) {
    const analysisTypes = options.types || ['complexity', 'patterns', 'security'];
    const messages = [
      {
        role: 'user',
        content: `As an expert code analyzer, analyze this code focusing on ${analysisTypes.join(', ')}:

        \`\`\`
        ${code}
        \`\`\`

        Return a detailed analysis in JSON format including:
        1. Complexity metrics (cyclomatic complexity, cognitive complexity)
        2. Pattern recognition (design patterns, anti-patterns)
        3. Security vulnerabilities
        4. Performance considerations
        5. Recommendations for improvement`
      }
    ];

    const response = await this.chat(messages, {
      model: 'claude-3-sonnet',
      temperature: 0.3
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      return {
        error: 'Failed to parse analysis response',
        rawResponse: response
      };
    }
  }
}

// Google Gemini Provider Implementation
class GoogleGeminiProvider extends LLMProvider {
  constructor(apiKey) {
    super({ apiKey });
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: "gemini-pro" });
  }

  async chat(messages, options = {}) {
    const chatSession = this.model.startChat({
      history: messages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.7
      }
    });

    const result = await chatSession.sendMessage(messages[messages.length - 1].content);
    return result.response.text();
  }

  async generateCode(prompt, context) {
    const messages = [
      {
        role: 'user', content: `Generate professional code based on:

      Prompt: ${prompt}
      Context: ${JSON.stringify(context)}

      Provide clean, efficient, and well-commented code.` }
    ];
    return this.chat(messages);
  }

  async codeReview(code, language) {
    const messages = [{
      role: 'user',
      content: `Comprehensive code review for ${language} code:

      \`\`\`${language}
      ${code}
      \`\`\`

      Evaluate:
      - Code correctness
      - Performance optimization
      - Best practices
      - Potential improvements`
    }];

    return this.chat(messages);
  }

  async analyzeCode(code, options = {}) {
    // Implementation of analyzeCode method
  }
}

// Custom error class for JSON-RPC errors
class JSONRPCError extends Error {
  constructor(code, message, data = null) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'JSONRPCError';
  }
}

// Server class implementation
class Server {
  constructor(config = {}) {
    this.config = config;
    this.providers = {};
    this.metaCognitiveTool = new MetaCognitiveTool(config.metaCognitive);
    this.toolRegistry = new ToolRegistry();
    this.setupProviders();

    // Initialize MCP state
    this.mcpState = {
      version: MCP_VERSION,
      capabilities: MCP_CAPABILITIES,
      activeProviders: [],
      sessionMetrics: [],
      availableTools: this.toolRegistry.getAllTools()
    };
  }

  setupProviders() {
    if (process.env.OPENAI_API_KEY) {
      this.providers.openai = new OpenAIProvider(process.env.OPENAI_API_KEY);
      this.mcpState.activeProviders.push('openai');
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.anthropic = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
      this.mcpState.activeProviders.push('anthropic');
    }
    if (process.env.GOOGLE_API_KEY) {
      this.providers.google = new GoogleGeminiProvider(process.env.GOOGLE_API_KEY);
      this.mcpState.activeProviders.push('google');
    }
  }

  async handleRequest(method, params) {
    try {
      // Track request in meta-cognitive system
      const requestContext = {
        method,
        timestamp: new Date().toISOString(),
        params: { ...params, sensitive: undefined }
      };

      await this.metaCognitiveTool.analyze(requestContext);

      // Handle MCP-specific methods
      if (method === 'mcp.getCapabilities') {
        return this.getMCPCapabilities();
      } else if (method === 'mcp.getState') {
        return this.getMCPState();
      } else if (method === 'mcp.listTools') {
        return this.listTools();
      } else if (method === 'mcp.executeTool') {
        return this.executeTool(params);
      }

      // Handle standard methods
      const result = await this.handleStandardMethod(method, params);

      // Update metrics
      this.updateMetrics(method, result);

      return result;
    } catch (error) {
      Logger.error('Request error', { method, error: error.message });
      throw error;
    }
  }

  async handleStandardMethod(method, params) {
    switch (method) {
      case 'chat':
        return await this.handleChat(params);
      case 'generateCode':
        return await this.handleGenerateCode(params);
      case 'codeReview':
        return await this.handleCodeReview(params);
      case 'analyzeCode':
        return await this.handleCodeAnalysis(params);
      default:
        throw new JSONRPCError(-32601, `Method ${method} not found`);
    }
  }

  getMCPCapabilities() {
    return {
      version: this.mcpState.version,
      capabilities: this.mcpState.capabilities,
      providers: this.mcpState.activeProviders,
      supportedMethods: [
        'chat',
        'generateCode',
        'codeReview',
        'analyzeCode',
        'mcp.getCapabilities',
        'mcp.getState',
        'mcp.listTools',
        'mcp.executeTool'
      ],
      tools: this.mcpState.availableTools
    };
  }

  getMCPState() {
    return {
      ...this.mcpState,
      metaCognitive: this.metaCognitiveTool.state.getState(),
      metrics: this.getAggregatedMetrics()
    };
  }

  updateMetrics(method, result) {
    const metric = {
      timestamp: new Date().toISOString(),
      method,
      success: !result.error,
      duration: result.duration,
      provider: result.provider
    };

    this.mcpState.sessionMetrics.push(metric);

    // Maintain reasonable history size
    if (this.mcpState.sessionMetrics.length > 1000) {
      this.mcpState.sessionMetrics = this.mcpState.sessionMetrics.slice(-1000);
    }
  }

  getAggregatedMetrics() {
    const metrics = this.mcpState.sessionMetrics;
    return {
      totalRequests: metrics.length,
      successRate: metrics.filter(m => m.success).length / metrics.length,
      methodDistribution: this.getMethodDistribution(metrics),
      averageDuration: this.getAverageDuration(metrics)
    };
  }

  getMethodDistribution(metrics) {
    return metrics.reduce((acc, metric) => {
      acc[metric.method] = (acc[metric.method] || 0) + 1;
      return acc;
    }, {});
  }

  getAverageDuration(metrics) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric.duration || 0), 0);
    return sum / metrics.length;
  }

  async handleChat(params) {
    const provider = await this.selectProvider(params.options?.model);
    return provider.chat(params.messages, params.options);
  }

  async handleGenerateCode(params) {
    const provider = await this.selectProvider(params.options?.model);
    return provider.generateCode(params.prompt, params.context);
  }

  async handleCodeReview(params) {
    const provider = await this.selectProvider(params.options?.model);
    return provider.codeReview(params.code, params.language);
  }

  async handleCodeAnalysis(params) {
    const provider = await this.selectProvider(params.options?.model);
    const startTime = process.hrtime();

    try {
      const analysis = await provider.analyzeCode(params.code, params.options);

      // Calculate duration
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to ms

      // Enhance analysis with meta-cognitive insights
      const enhancedAnalysis = await this.metaCognitiveTool.analyze({
        type: 'code_analysis',
        input: params,
        result: analysis,
        duration
      });

      return {
        success: true,
        provider: provider.constructor.name,
        duration,
        analysis,
        insights: enhancedAnalysis
      };
    } catch (error) {
      Logger.error('Code analysis error', {
        error: error.message,
        code: params.code.substring(0, 100) + '...' // Log only the beginning
      });

      throw new JSONRPCError(-32603, `Code analysis failed: ${error.message}`);
    }
  }

  async selectProvider(model = '') {
    if (model.startsWith('claude')) {
      if (!this.providers.anthropic) {
        throw new JSONRPCError(-32603, 'Anthropic provider not configured');
      }
      return this.providers.anthropic;
    } else if (model.startsWith('gpt')) {
      if (!this.providers.openai) {
        throw new JSONRPCError(-32603, 'OpenAI provider not configured');
      }
      return this.providers.openai;
    } else if (model.startsWith('gemini')) {
      if (!this.providers.google) {
        throw new JSONRPCError(-32603, 'Google provider not configured');
      }
      return this.providers.google;
    }

    // Default provider selection
    const availableProviders = Object.values(this.providers);
    if (availableProviders.length === 0) {
      throw new JSONRPCError(-32603, 'No LLM providers configured');
    }
    return availableProviders[Math.floor(Math.random() * availableProviders.length)];
  }

  listTools() {
    return {
      success: true,
      tools: this.mcpState.availableTools
    };
  }

  async executeTool(params) {
    const { tool, method, parameters } = params;

    if (!tool || !method) {
      throw new JSONRPCError(-32602, 'Tool and method names are required');
    }

    try {
      const result = await this.toolRegistry.executeToolMethod(tool, method, parameters);
      return {
        success: true,
        tool,
        method,
        result
      };
    } catch (error) {
      throw new JSONRPCError(-32603, `Tool execution failed: ${error.message}`);
    }
  }
}

// Create and start the server
const server = new Server();
const httpServer = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  let requestData;
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    requestData = JSON.parse(Buffer.concat(chunks).toString());
    Logger.info('Received request', { method: requestData.method, params: requestData.params });

    const result = await server.handleRequest(requestData.method, requestData.params);
    Logger.info('Request successful', { result });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result,
      id: requestData.id
    }));
  } catch (error) {
    Logger.error('Server error', {
      error: error.message,
      stack: error.stack,
      code: error.code
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: error.code || -32603,
        message: error.message,
        data: error.data
      },
      id: requestData?.id
    }));
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  Logger.info(`Server running on port ${PORT}`);
});

// Export for testing
export {
  AnthropicProvider,
  GoogleGeminiProvider, JSONRPCError,
  LLMProvider, Logger, OpenAIProvider, Server
};
