require('dotenv').config({ path: 'backend/.env' });
const axios = require('axios');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return console.log('No GEMINI_API_KEY');
  const model = process.env.GEMINI_RESUME_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: 'Return JSON: {"status": "success", "model": "gemini"}' }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 60 }
  });
  console.log('Gemini OK:', res.data?.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return console.log('No OPENAI_API_KEY');
  const res = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 60,
    messages: [{ role: 'user', content: 'Return JSON: {"status": "success", "model": "openai"}' }]
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }
  });
  console.log('OpenAI OK:', res.data?.choices?.[0]?.message?.content);
}

Promise.all([testGemini(), testOpenAI()]).catch(console.error);
