import { memory, ChatMessage } from '../db/memory.js';
import { chatCompletion } from './llm.js';
import { tools } from '../tools/registry.js';
import { getCurrentTimeTool } from '../tools/time.js';
import { draftTradeTool, executeTradeTool } from '../tools/trade.js';
import { draftLinkedInPostTool } from '../tools/linkedin.js';

// Register tools
tools.register(getCurrentTimeTool);
tools.register(draftTradeTool);
tools.register(executeTradeTool);
tools.register(draftLinkedInPostTool);

const SYSTEM_PROMPT = `Eres OpenGravity, un agente de IA personal altamente capaz y seguro, creado por Davo.
Te comunicas exclusivamente a través de Telegram y hablas estrictamente con tu creador, Davo.
Tu idioma principal es el español y debes responder siempre de forma natural y útil en este idioma.
Tienes acceso a herramientas que puedes usar cuando sea necesario.
Prioriza la brevedad, la claridad y la seguridad en tus respuestas. Eres un asistente general capaz de ayudar con cualquier tarea, no solo con las herramientas predefinidas.`;

const MAX_ITERATIONS = 5;

async function buildLlmMessages(chatId: number): Promise<any[]> {
  const history = await memory.getRecentMessages(chatId, 30);
  
  const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  
  for (const msg of history) {
    if (msg.role === 'tool') {
       messages.push({
           role: 'tool',
           content: msg.content,
           tool_call_id: msg.tool_call_id
       });
    } else if (msg.role === 'assistant' && msg.tool_calls) {
       messages.push({
           role: 'assistant',
           content: msg.content || null,
           tool_calls: msg.tool_calls
       });
    } else {
       messages.push({
           role: msg.role,
           content: msg.content
       });
    }
  }
  
  return messages;
}

export async function processUserMessage(chatId: number, text: string): Promise<string> {
    
  // 1. Save user msg to memory
  await memory.addMessage({ chat_id: chatId, role: 'user', content: text });
  
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const messages = await buildLlmMessages(chatId);
      const availableTools = tools.getAllDeclarations();
      
      // 2. Call LLM
      const response = await chatCompletion(messages, availableTools);
      
      // 3. Save Assistant msg
      await memory.addMessage({
          chat_id: chatId,
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls ? JSON.stringify(response.tool_calls) : undefined
      });
      
      // 4. Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
          console.log(`[Agent] LLM requested ${response.tool_calls.length} tool(s). Executing...`);
          
          const toolResults = await tools.executeAll(response.tool_calls);
          
          for (const res of toolResults) {
              await memory.addMessage({
                  chat_id: chatId,
                  role: 'tool',
                  content: res.content,
                  tool_call_id: res.tool_call_id
              });
          }
          
          // Loop continues to let the LLM see the tool output
          continue;
      }
      
      // 5. Normal text response
      return response.content || 'Error: LLM returned empty response.';
  }
  
  return 'Agent reached maximum reasoning iterations based on safety limits.';
}
