const AITool = require('./src/tools/ai/ai_tool.js');
const aiTool = new AITool();

async function testSystemPrompt() {
  console.log('Testing AI Tool with new system prompt...\n');

  // Test with Anthropic
  console.log('Testing Anthropic Model:');
  const anthropicResult = await aiTool.generateResponse({
    prompt: 'Write a simple function to calculate the factorial of a number.',
    provider: 'anthropic',
    responseFormat: 'code',
    reasoningType: 'step_by_step'
  });
  console.log('Anthropic Response:', JSON.stringify(anthropicResult, null, 2));

  console.log('\n-------------------\n');

  // Test with OpenAI
  console.log('Testing OpenAI Model:');
  const openaiResult = await aiTool.generateResponse({
    prompt: 'Write a simple function to calculate the factorial of a number.',
    provider: 'openai',
    responseFormat: 'code',
    reasoningType: 'step_by_step'
  });
  console.log('OpenAI Response:', JSON.stringify(openaiResult, null, 2));
}

testSystemPrompt().catch(console.error);