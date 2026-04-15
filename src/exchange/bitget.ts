import { bitget } from 'ccxt';
import { config } from '../config.js';

let exchange: bitget;

export function getBitget(): bitget {
  if (!exchange) {
    if (!config.BITGET_API_KEY || !config.BITGET_API_SECRET || !config.BITGET_PASSPHRASE) {
      console.warn('[Bitget] Missing API credentials. Exchange integration will fail if used.');
    }
    exchange = new bitget({
      apiKey: config.BITGET_API_KEY,
      secret: config.BITGET_API_SECRET,
      password: config.BITGET_PASSPHRASE,
      options: {
        defaultType: 'swap', // Derivados / Futuros Perpetuos
      },
      // Descomentar para usar testnet
      // enableRateLimit: true,
    });
    // Si tienes testnet activado:
    // exchange.setSandboxMode(true);
  }
  return exchange;
}

export interface TradeParams {
  symbol: string;         // Ej. 'BTC/USDT:USDT'
  side: 'buy' | 'sell';   // long o short
  type: 'market' | 'limit';
  usdtAmount?: number;    // El volumen a comprar en USDT (Margen + Apalancamiento)
  price?: number;         // Para ordenes Limit
  leverage?: number;      // Sugerido 15x
  tpPct?: number;         // Sugerido 4%  (esto es el porcentaje de MOVIMIENTO de precio bruto, ej. 0.04)
  slPct?: number;         // Sugerido 2%  (0.02)
}

/**
 * Configure Leverage and ensure Isolated Margin. 
 */
export async function setupLeverageAndMargin(ex: bitget, symbol: string, leverage: number) {
  try {
    // CCXT soporta `setLeverage` nativamente
    await ex.setLeverage(leverage, symbol);
    
    // Para marginMode, se setea usualmente en los parámetros de la orden, 
    // Bitget en CCXT acepta 'marginMode': 'isolated' en los params.
    console.log(`[Bitget] Apalancamiento configurado: ${leverage}x para ${symbol}`);
  } catch (error: any) {
    console.warn(`[Bitget] Advertencia al configurar apalancamiento (puede que ya esté fijado): ${error.message}`);
  }
}

/**
 * Ejecuta una orden, calculando la cantidad basado en los USDT y estableciendo TP/SL si es necesario.
 */
export async function executeTrade(params: TradeParams) {
  const ex = getBitget();
  
  // Valores por defecto
  const leverage = params.leverage || 15;
  const tpPct = params.tpPct || 4;
  const slPct = params.slPct || 2;
  const usdtAmount = params.usdtAmount || 50; // default 50 USDT de riesgo si el usuario no especifica cantidad

  let targetPrice = params.price;

  // Si es a mercado, necesitamos precio actual para calcular contratos
  if (!targetPrice) {
    const ticker = await ex.fetchTicker(params.symbol);
    targetPrice = ticker.last;
  }

  if (!targetPrice) throw new Error("No se pudo obtener el precio actual para el cálculo de tamaño.");

  await setupLeverageAndMargin(ex, params.symbol, leverage);

  // Cantidad notional total = Riesgo * Apalancamiento
  const notional = usdtAmount * leverage;
  let qty = notional / targetPrice;
  const formattedQty = ex.amountToPrecision(params.symbol, qty);

  // Parámetros críticos para Bitget (Aislado)
  const orderParams: any = {
    marginMode: 'isolated', 
  };
  
  console.log(`[Bitget] Abriendo orden ${params.side} ${params.type} de ${formattedQty} ${params.symbol} a ~${targetPrice}...`);
  
  // 1. Abrir la posición principal
  const order = await ex.createOrder(
    params.symbol, 
    params.type, 
    params.side, 
    parseFloat(formattedQty), 
    params.type === 'market' ? undefined : targetPrice, 
    orderParams
  );
  
  console.log(`[Bitget] Orden Creada ID: ${order.id}`);

  // 2. Definir Take Profit y Stop Loss
  // Calcular precios de salida basados en el % de movimiento del precio.
  // 4% significa 0.04
  const roiDecimalTP = tpPct / 100.0;
  const roiDecimalSL = slPct / 100.0;
  
  let tpPrice = 0;
  let slPrice = 0;

  if (params.side === 'buy') {
    tpPrice = targetPrice * (1 + roiDecimalTP);
    slPrice = targetPrice * (1 - roiDecimalSL);
  } else {
    tpPrice = targetPrice * (1 - roiDecimalTP);
    slPrice = targetPrice * (1 + roiDecimalSL);
  }

  const strTpPrice = ex.priceToPrecision(params.symbol, tpPrice);
  const strSlPrice = ex.priceToPrecision(params.symbol, slPrice);

  // En Bitget CCXT, para poner TP/SL como una "Plan Order / Contingent Order" es mejor usar el método privado.
  // CCXT implementa `createOrder` con stopLoss/takeProfit params pero depende de la versión y exchange.
  // Método directo usando V1 (como tenías en Python) o params V2 modernos de cxtt:
  try {
    const planParams = {
      symbol: params.symbol.replace('/', '').replace(':USDT', 'USDT'), // Ej: BTCUSDT
      planType: 'profit_loss',
      holdSide: params.side === 'buy' ? 'long' : 'short',
      triggerPrice: strTpPrice,
      triggerType: 'fill_price',
      size: '0', // 0 cierra toda la posición
      marginCoin: 'USDT'
    };
    
    // Esto es un workaround para el método directo de Bitget
    await ex.privateMixPostMixV1PlanPlacePlan(planParams as any);
    
    const slPlanParams = { ...planParams, triggerPrice: strSlPrice };
    await ex.privateMixPostMixV1PlanPlacePlan(slPlanParams as any);

    console.log(`[Bitget] Planes de salida fijados: TP en ${strTpPrice}, SL en ${strSlPrice}`);
  } catch (error: any) {
    console.error(`[Bitget] Error al colocar los TP/SL: ${error.message}. La orden base se ejecutó.`);
  }

  return {
    orderId: order.id,
    symbol: params.symbol,
    side: params.side,
    amount: usdtAmount,
    leverage,
    tpPrice: strTpPrice,
    slPrice: strSlPrice,
    status: order.status
  };
}
