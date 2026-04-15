import { onSchedule } from 'firebase-functions/v2/scheduler';
import { processUserMessage } from './agent/loop.js';
import { sendAgentResponse } from './bot/telegram.js';
import { allowedUserIds } from './config.js';

export const proactiveLinkedInRoutine = onSchedule({
  schedule: '0 9 * * 1,3,5', // Lunes, Miércoles, Viernes a las 9 AM
  timeZone: 'America/Guayaquil', // Cambiar si prefieres otra timezone
  maxInstances: 1
}, async (event) => {
  const primaryUserId = allowedUserIds[0];
  if (!primaryUserId) {
    console.error("Cron Error: No primary user ID configured.");
    return;
  }
  
  try {
    const prompt = `[INTERNAL CRON TRIGGER] Es hora de tu rutina preventiva de LinkedIn. Por favor usa tu herramienta \`search_ai_news\` para buscar las 3 noticias más recientes sobre Inteligencia Artificial.\nLuego, escribe un saludo cálido en español para Davo presentándole las noticias con viñetas.\nPregúntale cuál de estas 3 opciones (o alguna otra) le gustaría publicar para que tú le redactes el borrador de LinkedIn. NO escribas todavía el borrador final en inglés con teclado inline, solo propónle las noticias y charlen al respecto.`;
    
    // Process seamlessly as if the user triggered it
    const response = await processUserMessage(primaryUserId, prompt);
    
    // Relay back to user via Telegram
    await sendAgentResponse(primaryUserId, response);
    console.log("Proactive routine sent to user successfully.");
    
  } catch (error) {
    console.error("Cron execution failed:", error);
  }
});
