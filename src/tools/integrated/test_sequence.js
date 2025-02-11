async function demonstrateSequentialThinking() {
    const API_BASE = 'http://localhost:3001/api';  // Updated port to 3001
    const thoughts = [
        {
            thought: "Let's solve the problem of optimizing a web application's performance",
            stage: "Problem Definition"
        },
        {
            thought: "First, we need to identify the key performance metrics to measure",
            stage: "Analysis"
        },
        {
            thought: "Loading time, Time to Interactive (TTI), and First Contentful Paint (FCP) are crucial metrics",
            stage: "Analysis"
        },
        {
            thought: "We can implement code splitting and lazy loading to improve initial load time",
            stage: "Ideation"
        },
        {
            thought: "Implementing a service worker for caching would enhance subsequent visits",
            stage: "Ideation"
        }
    ];

    for (const [index, thoughtData] of thoughts.entries()) {
        try {
            const response = await fetch(`${API_BASE}/think`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...thoughtData,
                    thoughtNumber: index + 1,
                    totalThoughts: thoughts.length,
                    nextThoughtNeeded: index < thoughts.length - 1,
                    tags: ['performance', 'web-optimization']
                })
            });

            const result = await response.json();
            console.log(`Thought ${index + 1} processed:`, result);

            // Wait a bit between thoughts to simulate real thinking time
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error processing thought ${index + 1}:`, error);
        }
    }

    // Get final analysis
    try {
        const analysisResponse = await fetch(`${API_BASE}/analysis`);
        const analysis = await analysisResponse.json();
        console.log('\nFinal Analysis:', analysis);
    } catch (error) {
        console.error('Error getting analysis:', error);
    }
}

// Run the demonstration
demonstrateSequentialThinking().catch(console.error);