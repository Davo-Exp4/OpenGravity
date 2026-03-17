import { bot } from './bot/telegram';
import { memory } from './db/memory';
import './tools/time'; // ensures the tool gets registered

async function main() {
  console.log('🚀 Starting OpenGravity Agent...');
  
  // Start the bot
  bot.start({
    onStart: (info) => {
      console.log(`🤖 Bot @${info.username} is up and running!`);
      console.log(`[Memory] SQLite initialized.`);
    }
  });

  // Handle graceful shutdown
  process.once('SIGINT', () => {
    bot.stop();
    console.log('OpenGravity Agent shutting down gracefully...');
  });
  process.once('SIGTERM', () => {
    bot.stop();
    console.log('OpenGravity Agent shutting down gracefully...');
  });
}

main().catch(console.error);
