const http = require('http');
const { OpenAI } = require('openai');
const AITool = require('../tools/ai/ai_tool');
require('dotenv').config({ path: 'config/.env' });

// Initialize AI tools
let aiTool;
try {
  aiTool = new AITool();
  console.log('AI Tool initialized successfully');
} catch (error) {
  console.warn('Failed to initialize AI Tool:', error.message);
  console.warn('Server will start but AI functionality will be limited');
}

// Define available tools in Cursor's MCP format
const availableTools = [
  {
    id: "llm_code_generate",
    name: "Generate Code",
    description: "Generate code using AI",
    type: "function",
    schema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", description: "The code generation prompt" },
        context: { type: "object", description: "Additional context for code generation" },
        options: { type: "object", description: "Additional options for generation" }
      }
    }
  },
  {
    id: "analyze_code",
    name: "Analyze Code",
    description: "Analyze existing code",
    type: "function",
    schema: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "string", description: "The code to analyze" },
        analysisType: { type: "string", description: "Type of analysis to perform" }
      }
    }
  },
  {
    id: "enhance_documentation",
    name: "Enhance Documentation",
    description: "Enhance code documentation",
    type: "function",
    schema: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "string", description: "The code to document" },
        docStyle: { type: "string", description: "Documentation style to use" },
        includeExamples: { type: "boolean", description: "Whether to include examples" }
      }
    }
  },
  {
    id: "suggest_improvements",
    name: "Suggest Improvements",
    description: "Suggest code improvements",
    type: "function",
    schema: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "string", description: "The code to improve" },
        focusAreas: { type: "array", items: { type: "string" }, description: "Areas to focus improvements on" }
      }
    }
  },
  {
    id: "generate",
    name: "Generate Text",
    description: "General text generation",
    type: "function",
    schema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", description: "The generation prompt" }
      }
    }
  }
];

// Track active SSE connections
const activeConnections = new Set();

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy' }));
    return;
  }

  // Handle SSE connection request at dedicated endpoint
  if (req.method === 'GET' && req.url === '/v1/sse' && req.headers.accept === 'text/event-stream') {
    // Clean up old connections if they exist
    if (activeConnections.has(req.socket)) {
      console.log('Cleaning up existing connection');
      req.socket.end();
      activeConnections.delete(req.socket);
    }

    console.log('SSE connection established');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Add this connection to active connections
    activeConnections.add(req.socket);

    // Send initial connection message with tools
    res.write(`data: ${JSON.stringify({
      type: "connection_established",
      tools: availableTools,
      version: "1.0.0",
      protocol: "mcp"
    })}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      if (res.writeable) {
        res.write('data: {"type": "keep_alive"}\n\n');
      }
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE connection closed');
      clearInterval(keepAlive);
      activeConnections.delete(req.socket);
    });

    return;
  }

  // Handle tool invocations
  if (req.method === 'POST' && req.url.startsWith('/v1/tools/')) {
    if (!aiTool) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: "error",
        message: "AI functionality is not available. Please check your API keys."
      }));
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      console.log('Request body:', body);
      try {
        const { prompt, code, context = {}, options = {} } = JSON.parse(body);
        const toolId = req.url.split('/').pop(); // Get the tool ID from the URL

        let response;
        switch (toolId) {
          case 'llm_code_generate':
            response = await aiTool.generateResponse({
              prompt,
              responseFormat: 'code',
              ...options
            });
            break;

          case 'analyze_code':
            response = await aiTool.analyzeCode({
              code: code || prompt,
              ...options
            });
            break;

          case 'enhance_documentation':
            response = await aiTool.enhanceDocumentation({
              code: code || prompt,
              ...options
            });
            break;

          case 'suggest_improvements':
            response = await aiTool.suggestImprovements({
              code: code || prompt,
              ...options
            });
            break;

          case 'generate':
            response = await aiTool.generateResponse({
              prompt,
              ...options
            });
            break;

          default:
            console.log('Tool not found:', toolId);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "error", message: "Tool not found" }));
            return;
        }

        if (response.success) {
          console.log('Success response:', response.metadata);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: "success",
            result: response.text,
            metadata: response.metadata
          }));
        } else {
          console.error('Error response:', response.error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: "error",
            message: response.error,
            metadata: response.metadata
          }));
        }
      } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: "error", message: error.message }));
      }
    });
  } else if (req.method !== 'GET' || !req.url.startsWith('/v1/sse')) {
    res.writeHead(404);
    res.end();
  }
});

// Error handling for the server
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error('Port 3000 is already in use. Please close other instances or use a different port.');
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET  /v1/sse                       : SSE connection');
  console.log('- POST /v1/tools/llm_code_generate    : Generate code');
  console.log('- POST /v1/tools/analyze_code         : Analyze existing code');
  console.log('- POST /v1/tools/enhance_documentation: Enhance code documentation');
  console.log('- POST /v1/tools/suggest_improvements : Suggest code improvements');
  console.log('- POST /v1/tools/generate            : General text generation');
});