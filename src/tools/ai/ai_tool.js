const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AITool {
    constructor() {
        this.availableProviders = [];

        // Initialize OpenAI if API key is available
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            this.availableProviders.push('openai');
        }

        // Initialize Anthropic if API key is available
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });
            this.availableProviders.push('anthropic');
        }

        // Throw error only if no providers are available
        if (this.availableProviders.length === 0) {
            throw new Error('No AI providers available. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable');
        }

        this.models = {
            openai: {
                default: 'o3-mini',
                fallback: 'o1'
            },
            anthropic: {
                default: 'claude-3-5-sonnet-20241022',
                fallback: 'claude-3-5-haiku-20241022'
            }
        };

        // Configure default parameters for each provider
        this.defaultParams = {
            openai: {
                temperature: 1.0,
                max_completion_tokens: 4095,
                top_p: 1,
                frequency_penalty: 0.5,
                presence_penalty: 0.5,
                reasoning: true,
                reasoning_level: 'high',
                response_format: { type: 'json_object' }
            },
            anthropic: {
                temperature: 1.0,
                max_completion_tokens: 8000
            }
        };
    }

    async generateResponse({
        prompt,
        systemPrompt = null,
        temperature = 0.7,
        maxTokens = null,
        provider = null,
        model = null,
        responseFormat = 'text'
    }) {
        // Use the first available provider if none specified or specified provider is not available
        if (!provider || !this.availableProviders.includes(provider)) {
            provider = this.availableProviders[0];
        }

        try {
            if (provider === 'anthropic' && this.anthropic) {
                const response = await this.anthropic.messages.create({
                    model: model || this.models.anthropic.default,
                    max_completion_tokens: maxTokens || this.defaultParams.anthropic.max_completion_tokens,
                    temperature: temperature,
                    messages: [
                        ...(systemPrompt ? [{ role: 'assistant', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ]
                });

                return {
                    success: true,
                    text: response.content[0].text,
                    metadata: {
                        provider: 'anthropic',
                        model: model || this.models.anthropic.default
                    }
                };
            } else if (provider === 'openai' && this.openai) {
                // OpenAI configuration
                const response = await this.openai.chat.completions.create({
                    model: model || this.models.openai.default,
                    temperature: temperature,
                    max_completion_tokens: maxTokens || this.defaultParams.openai.max_completion_tokens,
                    top_p: this.defaultParams.openai.top_p,
                    frequency_penalty: this.defaultParams.openai.frequency_penalty,
                    presence_penalty: this.defaultParams.openai.presence_penalty,
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    response_format: responseFormat === 'json' ? { type: 'json_object' } : { type: 'text' }
                });

                return {
                    success: true,
                    text: response.choices[0].message.content,
                    metadata: {
                        provider: 'openai',
                        model: model || this.models.openai.default
                    }
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    provider,
                    model: model || (provider === 'anthropic' ? this.models.anthropic.default : this.models.openai.default)
                }
            };
        }
    }

    async analyzeCode({
        code,
        analysisType = 'general',
        context = null,
        provider = 'anthropic'
    }) {
        const prompt = `
          Please analyze the following code${analysisType !== 'general' ? ` focusing on ${analysisType}` : ''}:

          \`\`\`
          ${code}
          \`\`\`

          ${context ? `Additional context: ${context}` : ''}

          Please provide:
          1. A brief overview
          2. Key components and their purposes
          3. Potential improvements or issues
          4. Best practices assessment
        `;

        return this.generateResponse({
            prompt,
            temperature: 0.3,
            provider,
            systemPrompt: "You are an expert code analyst. Provide clear, actionable insights."
        });
    }

    async enhanceDocumentation({
        code,
        docStyle = 'jsdoc',
        includeExamples = true,
        provider = 'anthropic'
    }) {
        const prompt = `
          Please enhance the documentation for the following code using ${docStyle} style:

          \`\`\`
          ${code}
          \`\`\`

          ${includeExamples ? 'Include practical examples for key functions.' : ''}
          Focus on:
          1. Function/method descriptions
          2. Parameter documentation
          3. Return value documentation
          4. Type information
          5. Usage examples (if requested)
        `;

        return this.generateResponse({
            prompt,
            temperature: 0.2,
            provider,
            systemPrompt: "You are an expert technical writer. Provide clear, comprehensive documentation."
        });
    }

    async suggestImprovements({
        code,
        focusAreas = null,
        provider = 'anthropic'
    }) {
        const prompt = `
          Please suggest improvements for the following code${focusAreas ? ` focusing on: ${focusAreas.join(', ')}` : ''}:

          \`\`\`
          ${code}
          \`\`\`

          For each suggestion, provide:
          1. Description of the improvement
          2. Rationale
          3. Example implementation (if applicable)
          4. Impact assessment
        `;

        return this.generateResponse({
            prompt,
            temperature: 0.3,
            provider,
            systemPrompt: "You are an expert code reviewer. Provide specific, actionable improvements."
        });
    }
}

module.exports = AITool;