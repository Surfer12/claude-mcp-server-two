const PatternRecognitionTool = require('./pattern_recognition_tool');

describe('PatternRecognitionTool', () => {
    let patternTool;

    beforeEach(() => {
        patternTool = new PatternRecognitionTool({
            minPatternLength: 2,
            maxPatternLength: 5,
            similarityThreshold: 0.7
        });
    });

    describe('Pattern Analysis', () => {
        it('should analyze sequence patterns', async () => {
            const data = [1, 2, 3, 1, 2, 3];
            const result = await patternTool.analyzePatterns(data);

            expect(result.success).toBe(true);
            expect(result.patterns).toContainEqual(expect.objectContaining({
                type: 'sequence'
            }));
        });

        it('should analyze structure patterns', async () => {
            const data = {
                user: { name: 'test', age: 25 },
                settings: { name: 'config', enabled: true }
            };
            const result = await patternTool.analyzePatterns(data);

            expect(result.success).toBe(true);
            expect(result.patterns).toContainEqual(expect.objectContaining({
                type: 'structure'
            }));
        });

        it('should analyze value patterns', async () => {
            const data = {
                scores: [95, 96, 94, 95],
                prefixes: ['test_1', 'test_2', 'test_3']
            };
            const result = await patternTool.analyzePatterns(data);

            expect(result.success).toBe(true);
            expect(result.patterns).toContainEqual(expect.objectContaining({
                type: 'value',
                subtype: 'numeric'
            }));
            expect(result.patterns).toContainEqual(expect.objectContaining({
                type: 'value',
                subtype: 'string'
            }));
        });
    });

    describe('Sequence Pattern Detection', () => {
        it('should detect arithmetic progression', () => {
            const window = [2, 4, 6, 8];
            const pattern = patternTool.analyzeWindow(window);

            expect(pattern).toEqual({
                type: 'arithmetic',
                difference: 2
            });
        });

        it('should detect repeating elements', () => {
            const window = [1, 2, 1, 2, 1];
            const pattern = patternTool.analyzeWindow(window);

            expect(pattern).toEqual({
                type: 'repetition',
                elements: expect.arrayContaining([1, 2])
            });
        });

        it('should handle invalid windows', () => {
            expect(patternTool.analyzeWindow([])).toBeNull();
            expect(patternTool.analyzeWindow([1])).toBeNull();
        });
    });

    describe('Structure Pattern Detection', () => {
        it('should map object structure', () => {
            const obj = {
                user: {
                    name: 'test',
                    settings: [1, 2, 3]
                }
            };
            const structure = patternTool.mapStructure(obj);

            expect(structure['user']).toBe('object');
            expect(structure['user.name']).toBe('string');
            expect(structure['user.settings']).toBe('array');
        });

        it('should handle null values', () => {
            const obj = { field: null };
            const structure = patternTool.mapStructure(obj);

            expect(structure['field']).toBe('null');
        });
    });

    describe('Value Pattern Detection', () => {
        it('should calculate statistics for numeric values', () => {
            const numbers = [10, 12, 11, 13];
            const stats = patternTool.calculateStats(numbers);

            expect(stats).toEqual({
                mean: expect.any(Number),
                stdDev: expect.any(Number),
                min: 10,
                max: 13
            });
        });

        it('should find common prefix in strings', () => {
            const strings = ['test_1', 'test_2', 'test_3'];
            const prefix = patternTool.findCommonPrefix(strings);

            expect(prefix).toBe('test_');
        });

        it('should handle empty string arrays', () => {
            expect(patternTool.findCommonPrefix([])).toBe('');
        });
    });

    describe('Pattern Significance Analysis', () => {
        it('should analyze pattern significance', () => {
            const patterns = [
                { type: 'sequence', length: 4 },
                { type: 'structure', occurrences: 8 },
                {
                    type: 'value',
                    subtype: 'numeric',
                    stats: { mean: 100, stdDev: 5 }
                }
            ];

            const analysis = patternTool.analyzePatternSignificance(patterns);

            expect(analysis).toEqual({
                totalPatterns: 3,
                typeDistribution: expect.any(Object),
                significantPatterns: expect.any(Array)
            });
        });

        it('should identify significant patterns based on threshold', () => {
            const patterns = [
                { type: 'sequence', length: 5 }, // Should be significant (length/maxLength = 1)
                { type: 'sequence', length: 2 }  // Should not be significant (length/maxLength = 0.4)
            ];

            const analysis = patternTool.analyzePatternSignificance(patterns);
            expect(analysis.significantPatterns).toHaveLength(1);
            expect(analysis.significantPatterns[0].length).toBe(5);
        });
    });

    describe('Error Handling', () => {
        it('should handle analysis errors gracefully', async () => {
            const result = await patternTool.analyzePatterns(null);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle invalid pattern data', async () => {
            const result = await patternTool.analyzePatterns(undefined);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});