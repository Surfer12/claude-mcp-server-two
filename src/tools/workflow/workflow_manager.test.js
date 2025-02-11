const WorkflowManager = require('./workflow_manager');
const { MetaCognitiveTool } = require('../meta/meta_cognitive_tool');
const PatternRecognitionTool = require('../pattern/pattern_recognition_tool');

jest.mock('../meta/meta_cognitive_tool');
jest.mock('../pattern/pattern_recognition_tool');

describe('WorkflowManager', () => {
    let workflowManager;
    let mockMetaCognitiveTool;
    let mockPatternRecognitionTool;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Setup mock implementations
        mockMetaCognitiveTool = {
            analyze: jest.fn(),
            state: {
                patterns: [],
                adaptations: [],
                metrics: []
            }
        };

        mockPatternRecognitionTool = {
            analyzePatterns: jest.fn()
        };

        MetaCognitiveTool.mockImplementation(() => mockMetaCognitiveTool);
        PatternRecognitionTool.mockImplementation(() => mockPatternRecognitionTool);

        workflowManager = new WorkflowManager();
    });

    describe('Pattern Recognition Workflow', () => {
        it('should analyze patterns in a sequence of actions', async () => {
            const actions = WorkflowManager.getExampleActions().patternRecognition;
            const mockPatterns = [
                { type: 'repeated_action', action: 'take_screenshot', count: 2 },
                { type: 'sequence', action: 'click', position: 2 }
            ];

            mockMetaCognitiveTool.analyze.mockResolvedValue({
                success: true,
                state: {
                    patterns: mockPatterns,
                    adaptations: [],
                    metrics: []
                }
            });

            const result = await workflowManager.runPatternRecognitionWorkflow(actions);

            expect(result).toEqual(mockPatterns);
            expect(mockMetaCognitiveTool.analyze).toHaveBeenCalledTimes(actions.length);
        });

        it('should handle failed pattern analysis', async () => {
            const actions = WorkflowManager.getExampleActions().patternRecognition;
            mockMetaCognitiveTool.analyze.mockResolvedValue({
                success: false,
                error: 'Analysis failed'
            });

            const result = await workflowManager.runPatternRecognitionWorkflow(actions);

            expect(result).toEqual([]);
        });
    });

    describe('Adaptive Execution Workflow', () => {
        it('should collect adaptations from actions', async () => {
            const actions = WorkflowManager.getExampleActions().adaptiveExecution;
            const mockAdaptations = [
                { type: 'performance_optimization', reason: 'High memory usage' },
                { type: 'resource_optimization', reason: 'CPU threshold exceeded' }
            ];

            mockMetaCognitiveTool.analyze.mockResolvedValue({
                success: true,
                state: {
                    patterns: [],
                    adaptations: mockAdaptations,
                    metrics: []
                }
            });

            const result = await workflowManager.runAdaptiveExecutionWorkflow(actions);

            expect(result).toEqual(mockAdaptations);
            expect(mockMetaCognitiveTool.analyze).toHaveBeenCalledTimes(actions.length);
        });
    });

    describe('Performance Monitoring Workflow', () => {
        it('should collect metrics from actions', async () => {
            const actions = WorkflowManager.getExampleActions().performanceMonitoring;
            const mockMetrics = {
                duration_ms: 100,
                memory: 256,
                cpu_usage: { user: 1000, system: 500 }
            };

            mockMetaCognitiveTool.analyze.mockResolvedValue({
                success: true,
                state: {
                    patterns: [],
                    adaptations: [],
                    metrics: [mockMetrics]
                }
            });

            const result = await workflowManager.runPerformanceMonitoringWorkflow(actions);

            expect(result).toHaveLength(actions.length);
            expect(result[0].metrics).toEqual(mockMetrics);
        });
    });

    describe('Integrated Workflow', () => {
        it('should collect patterns, adaptations, and metrics', async () => {
            const actions = WorkflowManager.getExampleActions().integrated;
            const mockResult = {
                success: true,
                state: {
                    patterns: [{ type: 'repeated_action', count: 2 }],
                    adaptations: [{ type: 'performance_optimization' }],
                    metrics: [{ duration_ms: 100, memory: 256 }]
                }
            };

            mockMetaCognitiveTool.analyze.mockResolvedValue(mockResult);

            const result = await workflowManager.runIntegratedWorkflow(actions);

            expect(result.patterns).toHaveLength(actions.length);
            expect(result.adaptations).toHaveLength(actions.length);
            expect(result.metrics).toHaveLength(actions.length);
        });
    });

    describe('executeWorkflow', () => {
        it('should execute the correct workflow type', async () => {
            const spyPattern = jest.spyOn(workflowManager, 'runPatternRecognitionWorkflow');
            const spyAdaptive = jest.spyOn(workflowManager, 'runAdaptiveExecutionWorkflow');
            const spyMonitoring = jest.spyOn(workflowManager, 'runPerformanceMonitoringWorkflow');
            const spyIntegrated = jest.spyOn(workflowManager, 'runIntegratedWorkflow');

            const actions = WorkflowManager.getExampleActions().patternRecognition;

            await workflowManager.executeWorkflow('pattern_recognition', actions);
            expect(spyPattern).toHaveBeenCalled();

            await workflowManager.executeWorkflow('adaptive_execution', actions);
            expect(spyAdaptive).toHaveBeenCalled();

            await workflowManager.executeWorkflow('performance_monitoring', actions);
            expect(spyMonitoring).toHaveBeenCalled();

            await workflowManager.executeWorkflow('integrated', actions);
            expect(spyIntegrated).toHaveBeenCalled();
        });

        it('should throw error for unknown workflow type', async () => {
            const actions = WorkflowManager.getExampleActions().patternRecognition;
            await expect(workflowManager.executeWorkflow('unknown', actions))
                .rejects
                .toThrow('Unknown workflow type: unknown');
        });
    });
});