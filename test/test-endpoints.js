const http = require('http');

async function makeRequest(endpoint, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        data: JSON.parse(data)
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('Starting endpoint tests...\n');

    const providers = ['anthropic', 'openai'];

    for (const provider of providers) {
        console.log(`\n=== Testing with ${provider.toUpperCase()} provider ===\n`);

        // Test code generation
        console.log(`Testing code generation with ${provider}...`);
        const codeGenResult = await makeRequest('/v1/tools/llm_code_generate', {
            prompt: 'Write a simple function that calculates the factorial of a number',
            context: {},
            options: {
                responseFormat: 'code',
                provider: provider
            }
        });
        console.log('Status:', codeGenResult.statusCode);
        console.log('Response:', codeGenResult.data);
        console.log('\n---\n');

        // Test code analysis
        console.log(`Testing code analysis with ${provider}...`);
        const analysisResult = await makeRequest('/v1/tools/analyze_code', {
            prompt: `
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
            options: {
                analysisType: 'general',
                provider: provider
            }
        });
        console.log('Status:', analysisResult.statusCode);
        console.log('Response:', analysisResult.data);
        console.log('\n---\n');

        // Test documentation enhancement
        console.log(`Testing documentation enhancement with ${provider}...`);
        const docResult = await makeRequest('/v1/tools/enhance_documentation', {
            prompt: `
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
            options: {
                docStyle: 'jsdoc',
                includeExamples: true,
                provider: provider
            }
        });
        console.log('Status:', docResult.statusCode);
        console.log('Response:', docResult.data);
        console.log('\n---\n');

        // Test improvement suggestions
        console.log(`Testing improvement suggestions with ${provider}...`);
        const improvementResult = await makeRequest('/v1/tools/suggest_improvements', {
            prompt: `
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}`,
            options: {
                focusAreas: ['performance', 'safety'],
                provider: provider
            }
        });
        console.log('Status:', improvementResult.statusCode);
        console.log('Response:', improvementResult.data);
        console.log('\n---\n');
    }
}

runTests().catch(console.error);