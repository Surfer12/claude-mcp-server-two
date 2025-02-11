import { MetaCognitiveTool } from '../meta/meta_cognitive_tool.js';

// Main async function to run our test
async function runMetaToolTest() {
    const metaTool = new MetaCognitiveTool({
        observation: {
            stateTracking: true,
            patternAnalysis: true,
            performanceMonitoring: true
        },
        adaptation: {
            enabled: true,
            threshold: 0.7
        }
    });

    try {
        // Example analysis
        const result = await metaTool.analyze({
            query: "What are the best practices for writing clean code?",
            context: {
                domain: "software_development",
                complexity: "intermediate"
            }
        });

        console.log('Analysis Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error running meta tool:', error);
    }
}

// Run the test
runMetaToolTest().catch(console.error);