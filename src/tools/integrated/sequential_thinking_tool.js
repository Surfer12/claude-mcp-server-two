import { MetaCognitiveTool } from '../meta/meta_cognitive_tool.js';
import { MemoryTool } from './memory_tools.py';

class SequentialThinkingTool {
    constructor() {
        this.memoryTool = new MemoryTool();
        this.metaTool = new MetaCognitiveTool();
        this.currentSequence = [];
    }

    async processStep(stepData) {
        try {
            // Step 1: Store the current step in memory
            const memoryResult = await this.memoryTool({
                operation: 'store',
                key: `step_${this.currentSequence.length + 1}`,
                data: {
                    ...stepData,
                    sequencePosition: this.currentSequence.length + 1,
                    timestamp: new Date().toISOString()
                },
                tags: ['sequential_thinking', `step_${this.currentSequence.length + 1}`]
            });

            // Step 2: Analyze the step with meta-cognitive tool
            const analysisResult = await this.metaTool.analyze({
                data: stepData,
                context: {
                    sequencePosition: this.currentSequence.length + 1,
                    previousSteps: this.currentSequence
                }
            });

            // Step 3: Combine results and add to sequence
            const combinedResult = {
                step: this.currentSequence.length + 1,
                data: stepData,
                memory: memoryResult,
                analysis: analysisResult,
                timestamp: new Date().toISOString()
            };

            this.currentSequence.push(combinedResult);

            // Step 4: Store the updated sequence
            await this.memoryTool({
                operation: 'store',
                key: 'current_sequence',
                data: this.currentSequence,
                tags: ['sequential_thinking', 'sequence']
            });

            return combinedResult;
        } catch (error) {
            console.error('Error in sequential processing:', error);
            throw error;
        }
    }

    async analyzeSequence() {
        // Analyze the entire sequence
        const sequenceAnalysis = await this.metaTool.analyze({
            data: this.currentSequence,
            context: {
                type: 'sequence_analysis',
                stepCount: this.currentSequence.length
            }
        });

        // Store the analysis
        await this.memoryTool({
            operation: 'store',
            key: 'sequence_analysis',
            data: sequenceAnalysis,
            tags: ['sequential_thinking', 'analysis']
        });

        return sequenceAnalysis;
    }

    async getSequenceHistory() {
        return await this.memoryTool({
            operation: 'list',
            tag_filter: ['sequential_thinking']
        });
    }

    async reset() {
        this.currentSequence = [];
        // Clear sequence-related data
        const sequenceData = await this.getSequenceHistory();
        for (const item of sequenceData) {
            await this.memoryTool({
                operation: 'delete',
                key: item.key
            });
        }
    }
}

export { SequentialThinkingTool };
