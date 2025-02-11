const http = require('http');
const { OpenAI } = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' });

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/v1/tools/llm_code_generate') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { prompt, context = {} } = JSON.parse(body);

        const response = await client.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are an expert code generation assistant." },
            { role: "user", content: prompt },
            { role: "system", content: `Context: ${JSON.stringify(context)}` }
          ]
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: "success",
          code: response.choices[0].message.content,
          metadata: { provider: 'openai' }
        }));
      } catch (error) {
        console.error("Error:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: "error", message: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.MCP_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});