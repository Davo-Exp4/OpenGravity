import { memory, ChatMessage } from '../db/memory';
import { chatCompletion } from './llm';
import { tools } from '../tools/registry';
import { getCurrentTimeTool } from '../tools/time';

// Register tools
tools.register(getCurrentTimeTool);

const SYSTEM_PROMPT = `You are OpenGravity, a highly capable and secure personal AI agent running locally.
You communicate via Telegram and only talk strictly with your designated creator.
You have access to tools. Use them to answer questions efficiently.
Prioritize brevity, clarity, and security in your answers.`;

const MAX_ITERATIONS = 5;

function buildLlmMessages(chatId: number): any[] {
  const history = memory.getRecentMessages(chatId, 30);
  
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
  memory.addMessage({ chat_id: chatId, role: 'user', content: text });
  
  let iterations = 0;
  
  while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const messages = buildLlmMessages(chatId);
      const availableTools = tools.getAllDeclarations();
      
      // 2. Call LLM
      const response = await chatCompletion(messages, availableTools);
      
      // 3. Save Assistant msg
      memory.addMessage({
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
              memory.addMessage({
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
