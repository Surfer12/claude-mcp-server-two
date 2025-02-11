class PatternRecognitionTool {
    constructor(config = {}) {
        this.config = {
            minPatternLength: 2,
            maxPatternLength: 10,
            similarityThreshold: 0.7,
            ...config
        };
        this.patternHistory = [];
    }

    async analyzePatterns(data, context = {}) {
        try {
            const patterns = await this.detectPatterns(data);
            const analysis = this.analyzePatternSignificance(patterns);

            this.patternHistory.push({
                timestamp: new Date().toISOString(),
                patterns,
                analysis,
                context
            });

            return {
                success: true,
                patterns,
                analysis,
                history: this.patternHistory.slice(-5) // Keep last 5 entries
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async detectPatterns(data) {
        const patterns = [];

        // Sequence patterns
        if (Array.isArray(data)) {
            patterns.push(...this.findSequencePatterns(data));
        }

        // Structure patterns
        if (typeof data === 'object' && data !== null) {
            patterns.push(...this.findStructurePatterns(data));
        }

        // Value patterns
        patterns.push(...this.findValuePatterns(data));

        return patterns;
    }

    findSequencePatterns(array) {
        const patterns = [];
        const len = array.length;

        for (let windowSize = this.config.minPatternLength; windowSize <= Math.min(this.config.maxPatternLength, len); windowSize++) {
            for (let i = 0; i <= len - windowSize; i++) {
                const window = array.slice(i, i + windowSize);
                const pattern = this.analyzeWindow(window);

                if (pattern) {
                    patterns.push({
                        type: 'sequence',
                        pattern,
                        position: i,
                        length: windowSize
                    });
                }
            }
        }

        return patterns;
    }

    findStructurePatterns(obj) {
        const patterns = [];
        const structure = this.mapStructure(obj);

        // Find repeated structures
        const structureCounts = {};
        for (const [path, type] of Object.entries(structure)) {
            structureCounts[type] = (structureCounts[type] || 0) + 1;
        }

        for (const [type, count] of Object.entries(structureCounts)) {
            if (count > 1) {
                patterns.push({
                    type: 'structure',
                    pattern: type,
                    occurrences: count
                });
            }
        }

        return patterns;
    }

    findValuePatterns(data) {
        const patterns = [];
        const values = this.extractValues(data);

        // Numeric patterns
        const numbers = values.filter(v => typeof v === 'number');
        if (numbers.length > 1) {
            const stats = this.calculateStats(numbers);
            if (stats.stdDev < stats.mean * 0.1) { // Low variance
                patterns.push({
                    type: 'value',
                    subtype: 'numeric',
                    pattern: 'consistent_range',
                    stats
                });
            }
        }

        // String patterns
        const strings = values.filter(v => typeof v === 'string');
        if (strings.length > 1) {
            const commonPrefix = this.findCommonPrefix(strings);
            if (commonPrefix.length > 2) {
                patterns.push({
                    type: 'value',
                    subtype: 'string',
                    pattern: 'common_prefix',
                    value: commonPrefix
                });
            }
        }

        return patterns;
    }

    analyzeWindow(window) {
        if (window.length < 2) return null;

        // Check for arithmetic progression
        const diffs = [];
        for (let i = 1; i < window.length; i++) {
            if (typeof window[i] === 'number' && typeof window[i - 1] === 'number') {
                diffs.push(window[i] - window[i - 1]);
            }
        }

        if (diffs.length > 0 && this.isConstant(diffs)) {
            return {
                type: 'arithmetic',
                difference: diffs[0]
            };
        }

        // Check for repeating elements
        const elements = new Set(window);
        if (elements.size < window.length * 0.5) {
            return {
                type: 'repetition',
                elements: Array.from(elements)
            };
        }

        return null;
    }

    mapStructure(obj, path = '') {
        const structure = {};

        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (value === null) {
                structure[currentPath] = 'null';
            } else if (Array.isArray(value)) {
                structure[currentPath] = 'array';
                if (value.length > 0) {
                    structure[`${currentPath}[]`] = typeof value[0];
                }
            } else if (typeof value === 'object') {
                structure[currentPath] = 'object';
                Object.assign(structure, this.mapStructure(value, currentPath));
            } else {
                structure[currentPath] = typeof value;
            }
        }

        return structure;
    }

    extractValues(data) {
        const values = [];

        const extract = (item) => {
            if (Array.isArray(item)) {
                item.forEach(extract);
            } else if (typeof item === 'object' && item !== null) {
                Object.values(item).forEach(extract);
            } else {
                values.push(item);
            }
        };

        extract(data);
        return values;
    }

    calculateStats(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            stdDev,
            min: Math.min(...numbers),
            max: Math.max(...numbers)
        };
    }

    findCommonPrefix(strings) {
        if (strings.length === 0) return '';

        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (strings[i].indexOf(prefix) !== 0) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (prefix === '') return '';
            }
        }

        return prefix;
    }

    isConstant(array) {
        if (array.length < 2) return true;
        const first = array[0];
        return array.every(item => Math.abs(item - first) < 1e-10);
    }

    analyzePatternSignificance(patterns) {
        const analysis = {
            totalPatterns: patterns.length,
            typeDistribution: {},
            significantPatterns: []
        };

        // Calculate type distribution
        patterns.forEach(pattern => {
            analysis.typeDistribution[pattern.type] = (analysis.typeDistribution[pattern.type] || 0) + 1;
        });

        // Identify significant patterns
        patterns.forEach(pattern => {
            let significance = 0;

            switch (pattern.type) {
                case 'sequence':
                    significance = pattern.length / this.config.maxPatternLength;
                    break;
                case 'structure':
                    significance = pattern.occurrences / 10; // Normalize by expected max occurrences
                    break;
                case 'value':
                    significance = pattern.subtype === 'numeric' ?
                        1 - (pattern.stats.stdDev / pattern.stats.mean) :
                        pattern.value.length / 10;
                    break;
            }

            if (significance > this.config.similarityThreshold) {
                analysis.significantPatterns.push({
                    ...pattern,
                    significance
                });
            }
        });

        return analysis;
    }
}

module.exports = PatternRecognitionTool;