import Groq from 'groq-sdk';
import { config } from '../config.js';

import fetch from 'node-fetch';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

const groq = new Groq({
  apiKey: config.GROQ_API_KEY,
});


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
  if (!config.OPENROUTER_API_KEY) {
     throw new Error('OpenRouter API Key not provided. Fallback failed.');
  }
  
  console.log(`[LLM] Requesting OpenRouter (${config.OPENROUTER_MODEL})...`);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.OPENROUTER_MODEL,
      messages: messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      temperature: 0.5,
    })
  });
  
  if (!response.ok) {
     throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  return data.choices[0].message;
}
