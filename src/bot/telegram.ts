import { Bot, InputFile, InlineKeyboard } from 'grammy';
import { config, allowedUserIds } from '../config.js';
import { processUserMessage } from '../agent/loop.js';
import { memory } from '../db/memory.js';

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
  await memory.clearHistory(ctx.chat.id);
  await ctx.reply('🧹 Memoria borrada. Empecemos de nuevo.');
});

import { downloadTelegramVoice, transcribeAudio, generateSpeech } from '../agent/audio.js';

export async function sendAgentResponse(chatId: number, response: string, replyToMessageId?: number) {
  // Strip markdown bolding safely in case the LLM stubbornly hallucinated them
  response = response.replace(/\*\*/g, '');

  let replyMarkup: InlineKeyboard | undefined;
  
  if (response.includes('[INLINE_KEYBOARD:LINKEDIN]')) {
    response = response.replace('[INLINE_KEYBOARD:LINKEDIN]', '').trim();
    replyMarkup = new InlineKeyboard()
      .text('✅ Publicar en LinkedIn', 'linkedin_publish').row()
      .text('❌ Descartar', 'linkedin_discard');
  }

  const options: any = {};
  if (replyToMessageId) options.reply_to_message_id = replyToMessageId;

  if (response.length > 4000) {
    const chunks = response.match(/.{1,4000}/g) || [];
    for (let i = 0; i < chunks.length; i++) {
        if (i === chunks.length - 1 && replyMarkup) {
            options.reply_markup = replyMarkup;
            await bot.api.sendMessage(chatId, chunks[i], options);
        } else {
            await bot.api.sendMessage(chatId, chunks[i], options);
        }
    }
  } else {
    if (replyMarkup) options.reply_markup = replyMarkup;
    await bot.api.sendMessage(chatId, response, options);
  }
}

// 4. Handle text messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const chatId = ctx.chat.id;

  await ctx.replyWithChatAction('typing');

  try {
    const response = await processUserMessage(chatId, text);
    await sendAgentResponse(chatId, response, ctx.message.message_id);
  } catch (error: any) {
    console.error(`[Bot Error]`, error);
    const safeError = error.message ? error.message.substring(0, 1000) : "Unknown Error";
    await ctx.reply('⚠️ Ocurrió un error al procesar tu solicitud: ' + safeError);
  }
});

// 4.5 Handle Callback Queries
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat?.id;
  const messageId = ctx.callbackQuery.message?.message_id;
  
  if (!chatId || !messageId) return;

  if (data === 'linkedin_discard') {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply('Borrador descartado. ¿Qué te gustaría hacer ahora?', { reply_to_message_id: messageId });
    await ctx.answerCallbackQuery({ text: 'Descartado' });
  } 
  else if (data === 'linkedin_publish') {
    await ctx.answerCallbackQuery({ text: 'Publicando...' });
    const originalText = ctx.callbackQuery.message?.text || '';
    
    // Try to extract content and URL if present
    let content = originalText;
    let urlRef = null;
    let titleRef = null;
    
    // Look for our exact hidden tags
    const urlMatch = content.match(/\[URL:(.*?)\]/);
    if (urlMatch && urlMatch[1]) {
        urlRef = urlMatch[1].trim();
    }
    
    const titleMatch = content.match(/\[TITLE:(.*?)\]/);
    if (titleMatch && titleMatch[1]) {
        titleRef = titleMatch[1].trim();
    }
    
    // Cleanup visual styling from draft tool output
    content = content.replace('📝 *Borrador de LinkedIn* 📝', '').trim();
    content = content.replace(/\[URL:.*?\]/g, '').trim();
    content = content.replace(/\[TITLE:.*?\]/g, '').trim();
    
    if (!config.MAKE_LINKEDIN_WEBHOOK_URL) {
      await ctx.reply('⚠️ Error: Falta configurar MAKE_LINKEDIN_WEBHOOK_URL en las variables de entorno.', { reply_to_message_id: messageId });
      return;
    }
    
    try {
      const response = await fetch(config.MAKE_LINKEDIN_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, urlRef, title: titleRef, timestamp: new Date().toISOString() })
      });
      
      if (response.ok) {
        // Remove buttons
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
        await ctx.reply('🎉 ¡Post enviado con éxito a LinkedIn!', { reply_to_message_id: messageId });
      } else {
        await ctx.reply(`⚠️ Make devolvió un error de conexión (${response.status})`, { reply_to_message_id: messageId });
      }
    } catch (e: any) {
      await ctx.reply('⚠️ Error de conexión con Make.com: ' + e.message, { reply_to_message_id: messageId });
    }
  }
});

// 5. Handle voice messages
bot.on('message:voice', async (ctx) => {
  const voiceFileId = ctx.message.voice.file_id;
  const chatId = ctx.chat.id;

  await ctx.replyWithChatAction('typing');

  try {
    await ctx.reply('🎧 *Transcribiendo tu nota de voz...*', { parse_mode: 'Markdown' });
    const audioBuffer = await downloadTelegramVoice(voiceFileId);
    const transcribedText = await transcribeAudio(audioBuffer);
    
    await ctx.reply(`_Entendido:_ "${transcribedText}"\n\nGenerando respuesta...`, { parse_mode: 'Markdown' });

    const responseText = await processUserMessage(chatId, transcribedText);

    await ctx.replyWithChatAction('record_voice');
    const responseAudio = await generateSpeech(responseText);
    
    // grammy allows passing buffers directly wrapping them with InputFile
    // Google TTS returns OGG-OPUS, so we can use native "Voice Note" style
    await ctx.replyWithVoice(new InputFile(responseAudio, 'respuesta.ogg'), { 
      caption: '🔊 Respuesta de OpenGravity'
    });
    // Send text as a fallback if it's short enough to not spam the chat
    if (responseText.length < 1000) {
      await ctx.reply(`📄 *Transcripción de mi respuesta:*\n${responseText}`, { parse_mode: 'Markdown' });
    }
  } catch (error: any) {
    console.error(`[Audio Error]`, error);
    const safeError = error.message ? error.message.substring(0, 1000) : "Unknown Error";
    await ctx.reply('⚠️ Hubo un error procesando tu nota de voz: ' + safeError);
  }
});

// Error handling to prevent crash on long polling network issues
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});
