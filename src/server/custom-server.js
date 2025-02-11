import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JSONRPCError } from "@modelcontextprotocol/sdk/dist/esm/errors.js";
import { Server } from "@modelcontextprotocol/sdk/dist/esm/server/index.js";
import fs from 'fs/promises';
import OpenAI from 'openai';
import os from 'os';
import path from 'path';

// Logging Utility
class Logger {
  static log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };
    console.log(JSON.stringify(logEntry));

    try {
      const logDir = path.join(os.homedir(), '.cursor-mcp-logs');
      fs.mkdir(logDir, { recursive: true }).catch(console.error);

      const logFile = path.join(logDir, `cursor-mcp-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFile(logFile, JSON.stringify(logEntry) + '\n').catch(console.error);
    } catch (error) {
      console.error('Logging error:', error);
    }
  }

  static info(message, metadata) { this.log('INFO', message, metadata); }
  static error(message, metadata) { this.log('ERROR', message, metadata); }
  static warn(message, metadata) { this.log('WARN', message, metadata); }
}

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
}

// Anthropic Provider Implementation
class AnthropicProvider extends LLMProvider {
  constructor(apiKey) {
    super({ apiKey });
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages, options = {}) {
    const response = await this.client.messages.create({
      model: options.model || "claude-2",
      max_tokens: options.max_tokens || 4096,
      messages,
      ...options
    });
    return response.content[0].text;
  }

  async generateCode(prompt, context) {
    const messages = [
      { role: 'user', content: `Generate high-quality code based on this prompt and context.

      Prompt: ${prompt}
      Context: ${JSON.stringify(context)}` }
    ];
    return this.chat(messages, {
      model: 'claude-2',
      temperature: 0.7
    });
  }

  async codeReview(code, language) {
    const messages = [{
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
    }];

    return this.chat(messages);
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
      { role: 'user', content: `Generate professional code based on:

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
}

// LLM Orchestrator
class LLMOrchestrator {
  constructor() {
    this.providers = {
      openai: null,
      anthropic: null,
      google: null
    };
  }

  initialize(config) {
    if (config.openai?.apiKey) {
      this.providers.openai = new OpenAIProvider(config.openai.apiKey);
    }
    if (config.anthropic?.apiKey) {
      this.providers.anthropic = new AnthropicProvider(config.anthropic.apiKey);
    }
    if (config.google?.apiKey) {
      this.providers.google = new GoogleGeminiProvider(config.google.apiKey);
    }
  }

  async selectBestProvider(task) {
    const activeProviders = Object.values(this.providers).filter(p => p !== null);

    if (activeProviders.length === 0) {
      throw new Error('No LLM providers configured');
    }

    // Simple round-robin selection for demonstration
    // In a real-world scenario, implement more sophisticated provider selection
    const selectedProvider = activeProviders[Math.floor(Math.random() * activeProviders.length)];

    Logger.info('Selected LLM Provider', {
      provider: selectedProvider.constructor.name,
      task
    });

    return selectedProvider;
  }

  async chat(messages, options = {}) {
    const provider = await this.selectBestProvider('chat');
    return provider.chat(messages, options);
  }

  async generateCode(prompt, context) {
    const provider = await this.selectBestProvider('code_generation');
    return provider.generateCode(prompt, context);
  }

  async codeReview(code, language) {
    const provider = await this.selectBestProvider('code_review');
    return provider.codeReview(code, language);
  }
}

// Configuration and Server Setup
const llmOrchestrator = new LLMOrchestrator();

const serverConfig = {
  name: "cursor-mcp-llm-server",
  version: "0.2.0",
  features: [
    "multi_llm_interface",
    "code_generation",
    "code_review",
    "context_aware_completion"
  ]
};

const tools = {
  "llm_code_generate": {
    description: "Generate code using multi-provider LLM approach",
    schema: {
      prompt: { type: "string", required: true },
      context: {
        type: "object",
        properties: {
          language: { type: "string" },
          projectStructure: { type: "object" }
        }
      }
    },
    callback: async ({ prompt, context = {} }) => {
      try {
        Logger.info("Code generation requested", {
          prompt: prompt.slice(0, 100),
          language: context.language
        });

        const generatedCode = await llmOrchestrator.generateCode(prompt, context);

        return {
          status: "success",
          code: generatedCode,
          metadata: {
            provider: generatedCode.provider || 'unknown'
          }
        };
      } catch (error) {
        Logger.error("Code generation error", { error: error.message });
        throw new JSONRPCError("GenerationError", error.message, 500);
      }
    }
  },

  "llm_code_review": {
    description: "Perform code review using multi-provider LLM approach",
    schema: {
      code: { type: "string", required: true },
      language: { type: "string", required: true }
    },
    callback: async ({ code, language }) => {
      try {
        Logger.info("Code review requested", {
          codeLength: code.length,
          language
        });

        const reviewResults = await llmOrchestrator.codeReview(code, language);

        return {
          status: "success",
          review: reviewResults,
          metadata: {
            provider: reviewResults.provider || 'unknown'
          }
        };
      } catch (error) {
        Logger.error("Code review error", { error: error.message });
        throw new JSONRPCError("ReviewError", error.message, 500);
      }
    }
  },

  "llm_context_chat": {
    description: "Contextual chat with multi-provider LLM",
    schema: {
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["user", "assistant", "system"] },
            content: { type: "string" }
          }
        },
        required: true
      },
      context: { type: "object" }
    },
    callback: async ({ messages, context = {} }) => {
      try {
        Logger.info("Contextual chat requested", {
          messageCount: messages.length,
          context: Object.keys(context)
        });

        const chatResponse = await llmOrchestrator.chat(messages, context);

        return {
          status: "success",
          response: chatResponse,
          metadata: {
            provider: chatResponse.provider || 'unknown'
          }
        };
      } catch (error) {
        Logger.error("Contextual chat error", { error: error.message });
        throw new JSONRPCError("ChatError", error.message, 500);
      }
    }
  }
};

// Server Initialization
const startServer = async () => {
  try {
    // Load LLM configurations from environment or config file
    llmOrchestrator.initialize({
      openai: { apiKey: process.env.OPENAI_API_KEY },
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
      google: { apiKey: process.env.GOOGLE_API_KEY }
    });

    const server = new Server(serverConfig, { tools });

    const PORT = process.env.MCP_PORT || 3000;
    await server.listen(PORT);

    Logger.info(`Multi-LLM MCP Server started successfully`, {
      name: serverConfig.name,
      version: serverConfig.version,
      port: PORT,
      availableTools: Object.keys(tools),
      activeProviders: Object.keys(llmOrchestrator.providers)
        .filter(key => llmOrchestrator.providers[key] !== null)
    });

  } catch (error) {
    Logger.error("Failed to start Multi-LLM MCP server", { error: error.message });
    process.exit(1);
  }
};

// Run the server
startServer().catch(console.error);