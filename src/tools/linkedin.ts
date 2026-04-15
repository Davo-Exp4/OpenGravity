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
    
    draftMsg += `\n\nINSTRUCCIÓN PARA EL LLM: Escribe este post ESTRICTAMENTE EN INGLÉS PROFESIONAL, sin importar el idioma en que se te pidió. Mustra este borrador EXACTAMENTE al usuario. IMPORTANTE: Al final de tu mensaje debes incluir exactamente este texto: [INLINE_KEYBOARD:LINKEDIN] para que la interfaz pueda pintar los botones de publicar.`;
    
    return draftMsg;
  }
};
