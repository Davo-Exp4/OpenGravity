import { AgentTool } from './registry';

export const getCurrentTimeTool: AgentTool = {
  declaration: {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current time based on the local system block. Useful for queries about the time.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  execute: () => {
    return new Date().toLocaleString();
  },
};
