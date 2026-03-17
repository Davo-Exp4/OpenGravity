import { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

export interface AgentTool {
  declaration: ChatCompletionTool;
  execute: (args: any) => Promise<string> | string;
}

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool) {
    if (tool.declaration.function?.name) {
      this.tools.set(tool.declaration.function.name, tool);
    }
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAllDeclarations(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(t => t.declaration);
  }

  async executeAll(toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>) {
    const results: Array<{ tool_call_id: string; role: 'tool'; content: string }> = [];

    for (const call of toolCalls) {
      const tool = this.getTool(call.function.name);
      if (tool) {
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          const result = await tool.execute(args);
          results.push({
            tool_call_id: call.id,
            role: 'tool',
            content: result
          });
        } catch (err: any) {
          results.push({
            tool_call_id: call.id,
            role: 'tool',
            content: `Error executing tool: ${err.message}`
          });
        }
      } else {
        results.push({
          tool_call_id: call.id,
          role: 'tool',
          content: `Tool ${call.function.name} not found.`
        });
      }
    }
    return results;
  }
}

export const tools = new ToolRegistry();
