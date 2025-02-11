import { MemoryTool } from './memory_tools.py';

async function testSequentialMemoryOperations() {
    // Initialize memory tool
    const memoryTool = new MemoryTool();

    // Step 1: Store some initial data
    const storeResult = await memoryTool({
        operation: 'store',
        key: 'sequential_test',
        data: {
            step: 1,
            description: 'Initial data storage',
            timestamp: new Date().toISOString()
        },
        tags: ['sequential', 'test', 'step1']
    });
    console.log('Step 1 - Store:', storeResult);

    // Step 2: Retrieve and analyze
    const retrieveResult = await memoryTool({
        operation: 'retrieve',
        key: 'sequential_test'
    });
    console.log('Step 2 - Retrieve:', retrieveResult);

    // Step 3: Update with new information
    const updateResult = await memoryTool({
        operation: 'store',
        key: 'sequential_test',
        data: {
            ...retrieveResult.data,
            step: 2,
            description: 'Updated with new information',
            previousTimestamp: retrieveResult.data.timestamp,
            timestamp: new Date().toISOString()
        },
        tags: ['sequential', 'test', 'step2']
    });
    console.log('Step 3 - Update:', updateResult);

    // Step 4: List all sequential operations
    const listResult = await memoryTool({
        operation: 'list',
        tag_filter: ['sequential']
    });
    console.log('Step 4 - List Sequential Operations:', listResult);
}

// Run the sequential test
testSequentialMemoryOperations().catch(console.error);