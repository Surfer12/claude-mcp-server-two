const axios = require('axios');
const cheerio = require('cheerio');

class WebTool {
    constructor() {
        this.client = axios.create({
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AnalyticsBot/1.0)",
                "Accept": "text/html,application/json,application/xhtml+xml"
            },
            timeout: 30000
        });
    }

    async makeRequest({
        url,
        method = 'GET',
        params = null,
        data = null,
        headers = null,
        timeout = null
    }) {
        try {
            const response = await this.client.request({
                method: method.toUpperCase(),
                url,
                params,
                data: method.toUpperCase() !== 'GET' ? data : null,
                headers: { ...this.client.defaults.headers, ...headers },
                timeout: timeout || this.client.defaults.timeout
            });

            const contentType = response.headers['content-type'] || '';

            const result = {
                status_code: response.status,
                headers: response.headers,
                success: true
            };

            if (contentType.includes('application/json')) {
                result.data = response.data;
            } else {
                result.text = response.data;
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status_code: error.response?.status
            };
        }
    }

    async scrapeWebpage({
        url,
        selectors = null,
        extractLinks = false
    }) {
        try {
            const response = await this.makeRequest({ url });
            if (!response.success) return response;

            const $ = cheerio.load(response.text);
            const result = {
                success: true,
                title: $('title').text() || null,
                content: {}
            };

            if (selectors) {
                selectors.forEach(selector => {
                    result.content[selector] = $(selector)
                        .map((_, elem) => $(elem).text().trim())
                        .get();
                });
            }

            if (extractLinks) {
                result.links = $('a[href]')
                    .map((_, elem) => ({
                        text: $(elem).text().trim(),
                        href: $(elem).attr('href')
                    }))
                    .get();
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    analyzeApiResponse(responseData, schema = null) {
        try {
            const analysis = {
                success: true,
                data_type: typeof responseData,
                structure: {}
            };

            const analyzeStructure = (data, path = '') => {
                if (typeof data === 'object' && data !== null) {
                    if (Array.isArray(data)) {
                        analysis.structure[path] = `array[${data.length}]`;
                        if (data.length > 0) {
                            analyzeStructure(data[0], `${path}[0]`);
                        }
                    } else {
                        analysis.structure[path] = 'object';
                        Object.entries(data).forEach(([key, value]) => {
                            const newPath = path ? `${path}.${key}` : key;
                            analyzeStructure(value, newPath);
                        });
                    }
                } else {
                    analysis.structure[path] = typeof data;
                }
            };

            analyzeStructure(responseData);

            if (schema) {
                const validateSchema = (data, schemaPart) => {
                    const errors = [];
                    const schemaType = schemaPart.type;

                    if (schemaType === 'object' && typeof data !== 'object') {
                        errors.push(`Expected object, got ${typeof data}`);
                    } else if (schemaType === 'array' && !Array.isArray(data)) {
                        errors.push(`Expected array, got ${typeof data}`);
                    }

                    return errors;
                };

                const validationErrors = validateSchema(responseData, schema);
                analysis.schema_valid = validationErrors.length === 0;
                if (validationErrors.length > 0) {
                    analysis.schema_errors = validationErrors;
                }
            }

            return analysis;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async monitorEndpoint({
        url,
        interval = 60,
        maxAttempts = 5
    }) {
        const results = [];
        try {
            for (let i = 0; i < maxAttempts; i++) {
                const startTime = Date.now();
                const response = await this.makeRequest({ url });
                const endTime = Date.now();

                const result = {
                    timestamp: new Date().toISOString(),
                    response_time: (endTime - startTime) / 1000,
                    status_code: response.status_code,
                    success: response.success
                };
                results.push(result);

                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, interval * 1000));
                }
            }

            return {
                success: true,
                url,
                results,
                summary: {
                    total_checks: results.length,
                    successful_checks: results.filter(r => r.success).length,
                    average_response_time: results.reduce((acc, r) => acc + r.response_time, 0) / results.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                partial_results: results
            };
        }
    }
}

module.exports = WebTool;