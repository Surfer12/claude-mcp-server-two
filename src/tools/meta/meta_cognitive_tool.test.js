const { MetaCognitiveTool, MetaCognitiveState } = require('./meta_cognitive_tool');

describe('MetaCognitiveState', () => {
    let state;

    beforeEach(() => {
        state = new MetaCognitiveState();
    });

    it('should initialize with empty arrays', () => {
        expect(state.patterns).toEqual([]);
        expect(state.adaptations).toEqual([]);
        expect(state.metrics).toEqual([]);
        expect(state.lastUpdate).toBeInstanceOf(Date);
    });

    it('should add patterns with timestamps', () => {
        const pattern = { type: 'test', value: 123 };
        state.addPattern(pattern);

        expect(state.patterns).toHaveLength(1);
        expect(state.patterns[0]).toEqual({
            ...pattern,
            timestamp: expect.any(String)
        });
    });

    it('should add adaptations with timestamps', () => {
        const adaptation = { type: 'optimize', target: 'memory' };
        state.addAdaptation(adaptation);

        expect(state.adaptations).toHaveLength(1);
        expect(state.adaptations[0]).toEqual({
            ...adaptation,
            timestamp: expect.any(String)
        });
    });

    it('should add metrics with timestamps', () => {
        const metric = { memory: 256, cpu: 0.5 };
        state.addMetric(metric);

        expect(state.metrics).toHaveLength(1);
        expect(state.metrics[0]).toEqual({
            ...metric,
            timestamp: expect.any(String)
        });
    });

    it('should return complete state', () => {
        const pattern = { type: 'test_pattern' };
        const adaptation = { type: 'test_adaptation' };
        const metric = { type: 'test_metric' };

        state.addPattern(pattern);
        state.addAdaptation(adaptation);
        state.addMetric(metric);

        const fullState = state.getState();
        expect(fullState).toEqual({
            patterns: [{ ...pattern, timestamp: expect.any(String) }],
            adaptations: [{ ...adaptation, timestamp: expect.any(String) }],
            metrics: [{ ...metric, timestamp: expect.any(String) }],
            lastUpdate: expect.any(Date)
        });
    });
});

describe('MetaCognitiveTool', () => {
    let tool;
    let mockConfig;

    beforeEach(() => {
        mockConfig = {
            observation: {
                stateTracking: true,
                patternAnalysis: true,
                performanceMonitoring: true
            },
            adaptation: {
                enabled: true,
                threshold: 0.7
            }
        };
        tool = new MetaCognitiveTool(mockConfig);
    });

    describe('Configuration', () => {
        it('should initialize with default config when none provided', () => {
            const defaultTool = new MetaCognitiveTool();
            expect(defaultTool.config.observation.stateTracking).toBe(true);
            expect(defaultTool.config.adaptation.threshold).toBe(0.7);
        });

        it('should merge provided config with defaults', () => {
            const customConfig = {
                observation: { stateTracking: false },
                adaptation: { threshold: 0.5 }
            };
            const customTool = new MetaCognitiveTool(customConfig);

            expect(customTool.config.observation.stateTracking).toBe(false);
            expect(customTool.config.observation.patternAnalysis).toBe(true);
            expect(customTool.config.adaptation.threshold).toBe(0.5);
        });
    });

    describe('Pattern Recognition', () => {
        it('should recognize repeated actions', async () => {
            const action = { action: 'test', value: 123 };
            const result = await tool.recognizePatterns(action);

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    type: expect.any(String)
                })
            ]));
        });

        it('should track resource usage patterns', async () => {
            // Simulate high memory usage
            const mockMemoryMetrics = Array(3).fill({ memory: 600 });
            tool.state.metrics.push(...mockMemoryMetrics);

            const result = await tool.recognizePatterns({});
            expect(result).toContainEqual(expect.objectContaining({
                type: 'high_memory_usage'
            }));
        });
    });

    describe('Metrics Collection', () => {
        it('should collect performance metrics', () => {
            const startTime = process.hrtime();
            const data = { action: 'test' };

            const metrics = tool.collectMetrics(startTime, data);

            expect(metrics).toEqual({
                timestamp: expect.any(String),
                action: 'test',
                duration_ms: expect.any(Number),
                memory: expect.any(Number),
                cpu_usage: expect.any(Object),
                context: {
                    node_version: expect.any(String),
                    platform: expect.any(String)
                }
            });
        });
    });

    describe('Adaptation Computation', () => {
        it('should compute performance-based adaptations', async () => {
            // Simulate high duration metrics
            tool.state.metrics.push(
                { duration_ms: 1500 },
                { duration_ms: 1200 },
                { duration_ms: 1300 }
            );

            const adaptations = await tool.computeAdaptations({});
            expect(adaptations).toContainEqual(expect.objectContaining({
                type: 'performance_optimization'
            }));
        });

        it('should compute resource-based adaptations', async () => {
            // Simulate high memory usage
            tool.state.metrics.push(
                { memory: 800 },
                { memory: 850 },
                { memory: 900 }
            );

            const adaptations = await tool.computeAdaptations({});
            expect(adaptations).toContainEqual(expect.objectContaining({
                type: 'resource_optimization'
            }));
        });
    });

    describe('Insight Generation', () => {
        it('should generate insights from collected data', async () => {
            const insights = await tool.generateInsights({});
            expect(insights).toEqual({
                patterns: expect.any(Number),
                adaptations: expect.any(Number),
                metrics: expect.any(Number),
                recommendations: expect.any(Array)
            });
        });

        it('should generate appropriate recommendations', () => {
            // Simulate repeated patterns
            tool.state.patterns.push(
                { type: 'repeated_action' },
                { type: 'repeated_action' }
            );

            // Simulate high memory usage
            tool.state.metrics.push({ memory: 600 });

            const recommendations = tool.generateRecommendations();
            expect(recommendations).toContainEqual(expect.objectContaining({
                type: 'automation'
            }));
            expect(recommendations).toContainEqual(expect.objectContaining({
                type: 'optimization'
            }));
        });
    });

    describe('Integration Tests', () => {
        it('should perform complete analysis cycle', async () => {
            const testData = {
                action: 'test_action',
                parameters: { value: 123 }
            };

            const result = await tool.analyze(testData);

            expect(result).toEqual({
                success: true,
                state: expect.any(Object),
                analysis: {
                    timestamp: expect.any(String),
                    context: expect.any(Object),
                    results: expect.any(Object)
                }
            });
        });

        it('should handle analysis errors gracefully', async () => {
            const result = await tool.analyze(null);

            expect(result).toEqual({
                success: false,
                error: expect.any(String),
                state: expect.any(Object)
            });
        });
    });
});