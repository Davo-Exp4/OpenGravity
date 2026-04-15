import { bot } from './bot/telegram.js';
import './tools/time.js'; 
import './tools/linkedin.js'; 

console.log('🚀 Iniciando OpenGravity en modo desarrollo (Long Polling)...');

// Inicia el bot en modo polling (esto deshabilitará temporalmente los webhooks de Telegram si tenías uno configurado)
bot.start({
  onStart: (me) => {
    console.log(`✅ Bot ${me.username} conectado exitosamente. Escuchando mensajes de Telegram...`);
    console.log('Puedes probar el bot directamente en Telegram enviándole un mensaje.');
  }
}).catch(console.error);

// Agarrar señales de interrupción para detener el bot limpiamente
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
