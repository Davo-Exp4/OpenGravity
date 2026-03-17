import { Bot } from 'grammy';
import { config, allowedUserIds } from '../config';
import { processUserMessage } from '../agent/loop';
import { memory } from '../db/memory';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN!);

// 1. Security Middleware: Whitelist User IDs
bot.use(async (ctx, next) => {
  if (!ctx.from) return;
  const userId = ctx.from.id;
  
  if (!allowedUserIds.includes(userId)) {
    console.warn(`[Security] Unauthorized access attempt from User ID: ${userId}`);
    // Silently ignore or optionally reply
    return;
  }
  
  await next();
});

// 2. Command: /start
bot.command('start', async (ctx) => {
  await ctx.reply('¡Hola! Soy OpenGravity. Estoy listo para ayudarte.');
});

// 3. Command: /clear (clear history)
bot.command('clear', async (ctx) => {
  memory.clearHistory(ctx.chat.id);
  await ctx.reply('🧹 Memoria borrada. Empecemos de nuevo.');
});

// 4. Handle text messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const chatId = ctx.chat.id;

  // Let the user know the bot is "typing"
  await ctx.replyWithChatAction('typing');

  try {
    const response = await processUserMessage(chatId, text);
    
    // Telegram has a 4096 char limit per message.
    // If the response is too long, we split it.
    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }
  } catch (error: any) {
    console.error(`[Bot Error]`, error);
    await ctx.reply('⚠️ Ocurrió un error al procesar tu solicitud: ' + error.message);
  }
});

// Error handling to prevent crash on long polling network issues
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});
