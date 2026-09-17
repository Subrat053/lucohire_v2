const TurndownService = require('turndown');
const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('./prompts');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

/**
 * Converts cleaned HTML into Markdown and passes it to the LLM.
 * 
 * @param {string} htmlSubtree - The relevant HTML subtree
 * @returns {Promise<any>} The extracted JSON data
 */
async function extractWithLLM(htmlSubtree) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // 1. Convert to Markdown to save tokens and improve structure readability for the LLM
  let markdown = turndownService.turndown(htmlSubtree);
  
  // 2. Chunk if it exceeds context limit (gpt-4o-mini supports 128k context, but we truncate at ~30k chars for safety and speed)
  if (markdown.length > 40000) {
    console.warn(`[LLM Engine] Markdown size (${markdown.length}) too large. Truncating.`);
    markdown = markdown.substring(0, 40000);
  }

  // 3. Call LLM
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.1, // Low temperature for deterministic extraction
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: markdown
      }
    ]
  });

  const content = response.choices[0].message.content;
  
  let cleanContent = content;
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  }

  try {
    const data = JSON.parse(cleanContent);
    return { data, markdownSize: markdown.length };
  } catch (error) {
    throw new Error('[LLM Engine] Failed to parse LLM response as JSON');
  }
}

module.exports = { extractWithLLM };
