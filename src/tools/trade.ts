import { AgentTool } from './registry.js';
import { executeTrade, TradeParams } from '../exchange/bitget.js';

export const draftTradeTool: AgentTool = {
  declaration: {
    type: 'function',
    function: {
      name: 'draft_trade',
      description: 'Borra (diseña) una orden de trading en Bitget aplicando valores por defecto (15x Aislado, TP 4%, SL 2%). Úsala ANTES de ejecutar para pedir confirmación al usuario.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'El par a operar, ej. BTCUSDT' },
          side: { type: 'string', enum: ['buy', 'sell'], description: 'buy (Long) o sell (Short)' },
          type: { type: 'string', enum: ['market', 'limit'], description: 'market o limit' },
          usdtAmount: { type: 'number', description: 'Cantidad en USDT a arriesgar (margen). Por defecto es 50 si el usuario no dice nada.' },
          price: { type: 'number', description: 'Precio objetivo para ordenes Limit. Obligatorio si type=limit.' }
        },
        required: ['symbol', 'side', 'type']
      }
    }
  },
  execute: async (args: any) => {
    const amount = args.usdtAmount || 50;
    const leverage = 15;
    const tpPct = 4;
    const slPct = 2;
    
    let draftMsg = `Borrador generado con éxito.\nParámetros que se usarán:\n- Símbolo: ${args.symbol}\n- Tipo: ${args.type.toUpperCase()}\n- Lado: ${args.side.toUpperCase()}\n- Margen: ${amount} USDT\n- Apalancamiento: ${leverage}x (AISLADO)\n`;
    
    if (args.type === 'limit' && args.price) {
      draftMsg += `- Precio Entrada: ${args.price}\n`;
    }
    
    draftMsg += `- Take Profit: +${tpPct}%\n- Stop Loss: -${slPct}%\n\n`;
    draftMsg += `INSTRUCCIÓN PARA EL LLM: Dile al usuario exactamente qué vas a hacer usando estos datos y pregúntale explícitamente "¿Confirmo la ejecución de esta orden?". NO llames a execute_trade hasta que el usuario responda "sí".`;
    
    return draftMsg;
  }
};

export const executeTradeTool: AgentTool = {
  declaration: {
    type: 'function',
    function: {
      name: 'execute_trade',
      description: 'Ejecuta en Bitget la orden de trading. SOLO debe usarse después de que el usuario haya confirmado el borrador generado por draft_trade.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'El par a operar, ej. BTCUSDT' },
          side: { type: 'string', enum: ['buy', 'sell'], description: 'buy o sell' },
          type: { type: 'string', enum: ['market', 'limit'] },
          usdtAmount: { type: 'number' },
          price: { type: 'number' }
        },
        required: ['symbol', 'side', 'type']
      }
    }
  },
  execute: async (args: any) => {
    try {
      const params: TradeParams = {
        symbol: args.symbol,
        side: args.side,
        type: args.type,
        usdtAmount: args.usdtAmount || 50,
        price: args.price,
        // Forzamos los defaults obligatorios del sistema
        leverage: 15,
        tpPct: 4,
        slPct: 2
      };
      
      const result = await executeTrade(params);
      
      return `¡Orden ejecutada con éxito en Bitget!\nID: ${result.orderId}\nTP configurado en: ${result.tpPrice}\nSL configurado en: ${result.slPrice}\nEstado: ${result.status}`;
    } catch (e: any) {
      return `Error crítico al ejecutar la orden en Bitget: ${e.message}`;
    }
  }
};
