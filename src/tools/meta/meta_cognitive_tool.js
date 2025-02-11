const EventEmitter = require('events');

class MetaCognitiveState {
    constructor() {
        this.patterns = [];
        this.adaptations = [];
        this.metrics = [];
        this.lastUpdate = new Date();
    }

    addPattern(pattern) {
        this.patterns.push({
            ...pattern,
            timestamp: new Date().toISOString()
        });
    }

    addAdaptation(adaptation) {
        this.adaptations.push({
            ...adaptation,
            timestamp: new Date().toISOString()
        });
    }

    addMetric(metric) {
        this.metrics.push({
            ...metric,
            timestamp: new Date().toISOString()
        });
    }

    getState() {
        return {
            patterns: this.patterns,
            adaptations: this.adaptations,
            metrics: this.metrics,
            lastUpdate: this.lastUpdate
        };
    }
}

class MetaCognitiveTool extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            observation: {
                stateTracking: true,
                patternAnalysis: true,
                performanceMonitoring: true,
                ...config.observation
            },
            adaptation: {
                enabled: true,
                threshold: 0.7,
                ...config.adaptation
            }
        };
        this.state = new MetaCognitiveState();
    }

    async analyze(data, context = {}) {
        const startTime = process.hrtime();
        try {
            // Pattern recognition
            if (this.config.observation.patternAnalysis) {
                const patterns = await this.recognizePatterns(data, context);
                patterns.forEach(pattern => this.state.addPattern(pattern));
            }

            // Performance monitoring
            if (this.config.observation.performanceMonitoring) {
                const metrics = this.collectMetrics(startTime, data);
                this.state.addMetric(metrics);
            }

            // Adaptive behavior
            if (this.config.adaptation.enabled) {
                const adaptations = await this.computeAdaptations(data, context);
                adaptations.forEach(adaptation => this.state.addAdaptation(adaptation));
            }

            return {
                success: true,
                state: this.state.getState(),
                analysis: {
                    timestamp: new Date().toISOString(),
                    context: context,
                    results: await this.generateInsights(data)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                state: this.state.getState()
            };
        }
    }

    async recognizePatterns(data, context) {
        const patterns = [];

        // Action pattern recognition
        if (data.action) {
            const recentActions = this.state.metrics
                .filter(m => m.action)
                .slice(-5);

            if (recentActions.length > 0) {
                const repeatedActions = recentActions
                    .filter(m => m.action === data.action)
                    .length;

                if (repeatedActions >= 2) {
                    patterns.push({
                        type: 'repeated_action',
                        action: data.action,
                        count: repeatedActions + 1
                    });
                }
            }
        }

        // Resource usage patterns
        if (this.state.metrics.length > 0) {
            const recentMetrics = this.state.metrics.slice(-3);
            const avgMemory = recentMetrics.reduce((acc, m) => acc + m.memory, 0) / recentMetrics.length;

            if (avgMemory > 500) { // MB
                patterns.push({
                    type: 'high_memory_usage',
                    average: avgMemory,
                    threshold: 500
                });
            }
        }

        return patterns;
    }

    collectMetrics(startTime, data) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to ms

        return {
            timestamp: new Date().toISOString(),
            action: data.action,
            duration_ms: duration,
            memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
            cpu_usage: process.cpuUsage(),
            context: {
                node_version: process.version,
                platform: process.platform
            }
        };
    }

    async computeAdaptations(data, context) {
        const adaptations = [];
        const metrics = this.state.metrics;

        if (metrics.length > 0) {
            const recentMetrics = metrics.slice(-3);
            const avgDuration = recentMetrics.reduce((acc, m) => acc + m.duration_ms, 0) / recentMetrics.length;
            const avgMemory = recentMetrics.reduce((acc, m) => acc + m.memory, 0) / recentMetrics.length;

            // Performance-based adaptations
            if (avgDuration > 1000) { // 1 second threshold
                adaptations.push({
                    type: 'performance_optimization',
                    reason: 'High average operation duration',
                    metric: 'duration',
                    value: avgDuration,
                    threshold: 1000
                });
            }

            // Resource-based adaptations
            if (avgMemory > this.config.adaptation.threshold * 1000) { // MB threshold
                adaptations.push({
                    type: 'resource_optimization',
                    reason: 'High memory usage',
                    metric: 'memory',
                    value: avgMemory,
                    threshold: this.config.adaptation.threshold * 1000
                });
            }
        }

        return adaptations;
    }

    async generateInsights(data) {
        return {
            patterns: this.state.patterns.length,
            adaptations: this.state.adaptations.length,
            metrics: this.state.metrics.length,
            recommendations: this.generateRecommendations()
        };
    }

    generateRecommendations() {
        const recommendations = [];
        const state = this.state.getState();

        // Pattern-based recommendations
        const repeatedPatterns = state.patterns.filter(p => p.type === 'repeated_action');
        if (repeatedPatterns.length > 0) {
            recommendations.push({
                type: 'automation',
                description: 'Consider automating frequently repeated actions',
                evidence: repeatedPatterns.length
            });
        }

        // Performance-based recommendations
        const highMemoryMetrics = state.metrics.filter(m => m.memory > 500);
        if (highMemoryMetrics.length > 0) {
            recommendations.push({
                type: 'optimization',
                description: 'Consider optimizing memory usage',
                evidence: highMemoryMetrics.length
            });
        }

        return recommendations;
    }
}

module.exports = {
    MetaCognitiveTool,
    MetaCognitiveState
};