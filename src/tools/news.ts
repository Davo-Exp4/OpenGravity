import { AgentTool } from './registry.js';
import fetch from 'node-fetch';

export const searchNewsTool: AgentTool = {
  declaration: {
    type: 'function',
    function: {
      name: 'search_ai_news',
      description: 'Busca las últimas 3 noticias relevantes del mundo de la Inteligencia Artificial (en inglés) desde feeds RSS confiables (como TechCrunch o similares) para proponerlas como base para posts.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  execute: async () => {
    try {
      const response = await fetch('https://techcrunch.com/category/artificial-intelligence/feed/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenGravityAgent/1.0)'
        }
      });
      
      if (!response.ok) {
        return `Hubo un error obteniendo noticias (${response.status}).`;
      }
      
      const xml = await response.text();
      
      // Simple regex parser for RSS XML
      const items: {title: string, link: string, desc: string}[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      
      let match;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 3) {
        const itemXml = match[1];
        
        const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemXml.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        let descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemXml.match(/<description>([\s\S]*?)<\/description>/);
        
        if (titleMatch && linkMatch) {
          // Remove basic HTML from description
          let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'No description available';
          // limit desc length
          if (desc.length > 200) desc = desc.substring(0, 200) + '...';
          
          items.push({
            title: titleMatch[1],
            link: linkMatch[1],
            desc: desc
          });
          count++;
        }
      }
      
      if (items.length === 0) {
        return "No se encontraron noticias recientes.";
      }
      
      let result = "Últimas Noticias de Inteligencia Artificial encontradas:\n\n";
      items.forEach((it, i) => {
        result += `${i+1}. Título: ${it.title}\n   Resumen: ${it.desc}\n   Enlace: ${it.link}\n\n`;
      });
      return result;
      
    } catch (e: any) {
      return `Error al buscar noticias: ${e.message}`;
    }
  }
};
