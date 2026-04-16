import { AgentTool } from './registry.js';

export const draftLinkedInPostTool: AgentTool = {
  declaration: {
    type: 'function',
    function: {
      name: 'draft_linkedin_post',
      description: 'Estructura un borrador para publicarlo en LinkedIn (incluyendo reposts de URLs). Construye un texto persuasivo, profesional y adaptado para LinkedIn.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'El contenido principal del post.' },
          urlRef: { type: 'string', description: 'Opcional. URL de la noticia o artículo a compartir/repostear.' }
        },
        required: ['content']
      }
    }
  },
  execute: async (args: any) => {
    let draftMsg = `📝 *Borrador de LinkedIn* 📝\n\n${args.content}\n`;
    if (args.urlRef) {
      draftMsg += `\n🔗 URL Adjunta: ${args.urlRef}`;
    }
    
    draftMsg += `\n\n[SYSTEM: Please present the LinkedIn draft to the user in English. DO NOT use markdown asterisks (**) for bolding, as LinkedIn does not support them. At the very end of your response, you MUST append the following required tags unmodified: [INLINE_KEYBOARD:LINKEDIN]`;
    
    if (args.urlRef) {
        draftMsg += ` [URL:${args.urlRef}]`;
    }
    
    draftMsg += `]`;
    
    return draftMsg;
  }
};
