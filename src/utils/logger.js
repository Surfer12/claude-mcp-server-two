import fs from 'fs/promises';
import os from 'os';
import path from 'path';

class Logger {
    static log(level, message, metadata = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...metadata
        };
        console.log(JSON.stringify(logEntry));

        try {
            const logDir = path.join(os.homedir(), '.cursor-mcp-logs');
            fs.mkdir(logDir, { recursive: true }).catch(console.error);

            const logFile = path.join(logDir, `cursor-mcp-${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFile(logFile, JSON.stringify(logEntry) + '\n').catch(console.error);
        } catch (error) {
            console.error('Logging error:', error);
        }
    }

    static info(message, metadata) { this.log('INFO', message, metadata); }
    static error(message, metadata) { this.log('ERROR', message, metadata); }
    static warn(message, metadata) { this.log('WARN', message, metadata); }
}

export { Logger };
