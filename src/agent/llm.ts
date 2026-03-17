import Groq from 'groq-sdk';
import { config } from '../config';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});

// Since groq-sdk uses the same OpenAI-compatible format as OpenRouter, we can reuse it
const openrouter = config.OPENROUTER_API_KEY ? new Groq({
  apiKey: config.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
}) : null;

export async function chatCompletion(
  messages: any[],
  tools?: any[]
): Promise<any> {
    
  try {
    console.log(`[LLM] Requesting Groq (${GROQ_MODEL})...`);
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      temperature: 0.5,
      max_tokens: 4096,
    });
    return completion.choices[0].message;
  } catch (error: any) {
    if (error.status === 429 || error.status >= 500) {
      console.warn(`[LLM] Groq API error (${error.status}). Attempting OpenRouter fallback...`);
      return fallbackCompletion(messages, tools);
    }
    throw error;
  }
}

async function fallbackCompletion(messages: any[], tools?: any[]): Promise<any> {
  if (!openrouter) {
     throw new Error('OpenRouter API Key not provided. Fallback failed.');
  }
  
  console.log(`[LLM] Requesting OpenRouter (${config.OPENROUTER_MODEL})...`);
  const completion = await openrouter.chat.completions.create({
    model: config.OPENROUTER_MODEL,
    messages: messages,
    tools: tools && tools.length > 0 ? tools : undefined,
    temperature: 0.5,
  });
  return completion.choices[0].message;
}
