const { GoogleGenerativeAI } = require('@google/generative-ai');

class GoogleTool {
    constructor() {
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY environment variable is required');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async process(data) {
        try {
            const { prompt, temperature = 0.7, maxTokens = 2048 } = data;

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    topP: 0.8,
                    topK: 40,
                }
            });

            const response = result.response;
            return {
                success: true,
                text: response.text(),
                metadata: {
                    provider: 'google',
                    model: 'gemini-pro'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                metadata: {
                    provider: 'google',
                    model: 'gemini-pro'
                }
            };
        }
    }

    async analyzeCode({
        code,
        analysisType = 'general',
        context = null
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

        return this.process({
            prompt,
            temperature: 0.3
        });
    }

    async enhanceDocumentation({
        code,
        docStyle = 'jsdoc',
        includeExamples = true
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

        return this.process({
            prompt,
            temperature: 0.2
        });
    }

    async suggestImprovements({
        code,
        focusAreas = null
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

        return this.process({
            prompt,
            temperature: 0.3
        });
    }
}

module.exports = GoogleTool;