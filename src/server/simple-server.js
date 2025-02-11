const http = require('http');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');
const fs = require('fs');

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '../..');

// Dynamically load environment configuration
const loadEnvironmentConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  const envFiles = [
    `.env.${environment}.local`,
    `.env.${environment}`,
    '.env.local',
    '.env'
  ];

  envFiles.forEach(file => {
    const result = dotenv.config({ path: path.join(rootDir, file) });
    if (result.error) {
      console.warn(`Could not load environment file: ${file}`);
    } else {
      dotenvExpand.expand(result);
    }
  });
};

loadEnvironmentConfig();

// Now you can access environment variables via process.env
const PORT = process.env.PORT || 3000;

// Initialize tools with error handling
const tools = {};

// Function to load tools from a directory
const loadToolsFromDirectory = async (directory) => {
  const toolsPath = path.join(__dirname, '../tools', directory);
  if (!fs.existsSync(toolsPath)) return;

  const files = fs.readdirSync(toolsPath);
  for (const file of files) {
    if (file.endsWith('_tool.js')) {
      try {
        const Tool = require(path.join(toolsPath, file));
        const toolName = file.replace('_tool.js', '');
        tools[toolName] = new Tool();
        console.log(`${directory}/${toolName} Tool initialized successfully`);
      } catch (error) {
        console.warn(`Failed to initialize ${directory}/${file}:`, error.message);
      }
    }
  }
};

// Load all tools
const toolDirectories = ['ai', 'web', 'google', 'meta', 'pattern', 'workflow', 'code'];
Promise.all(toolDirectories.map(dir => loadToolsFromDirectory(dir)))
  .then(() => {
    console.log('All tools loaded. Available tools:', Object.keys(tools));
  })
  .catch(error => {
    console.error('Error loading tools:', error);
  });

// Create HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Handle SSE endpoint
  if (path === '/v1/sse' && req.method === 'GET') {
    console.log(`${new Date().toISOString()} - GET /v1/sse`);
    handleSSE(req, res);
    return;
  }

  // Handle other endpoints
  if (req.method === 'POST') {
    console.log(`${new Date().toISOString()} - POST ${path}`);
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        let response = { error: 'Endpoint not found' };

        // Route to appropriate tool handler
        if (path.startsWith('/v1/tools/')) {
          const toolName = path.split('/')[3];
          response = await handleToolRequest(toolName, data);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Handle unknown endpoints
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET  /v1/sse                       : SSE connection');
  console.log('- POST /v1/tools/:toolName           : Generic tool endpoint');
  console.log('\nAvailable tools will be listed after initialization.');
});

// Handle SSE connections
function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const heartbeat = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });

  console.log('SSE connection established');
}

// Handle tool requests
async function handleToolRequest(toolName, data) {
  // Get the tool instance
  const tool = tools[toolName];

  if (!tool) {
    return {
      error: `Tool not found: ${toolName}`,
      available_tools: Object.keys(tools)
    };
  }

  try {
    // All tools should implement a process method
    return await tool.process(data);
  } catch (error) {
    console.error(`Error processing ${toolName} request:`, error);
    return {
      error: `Failed to process ${toolName} request: ${error.message}`,
      available_tools: Object.keys(tools)
    };
  }
}