import { onRequest } from 'firebase-functions/v2/https';
import { webhookCallback } from 'grammy';
import { bot } from './bot/telegram.js';
import './tools/time.js'; // ensures the tool gets registered

// Webhook handler for Firebase Cloud Functions
export const opengravitybot = onRequest(
  { maxInstances: 5 }, 
  webhookCallback(bot, 'express')
);
