import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Define and validate required environment variables
export const config = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ALLOWED_USER_IDS: process.env.TELEGRAM_ALLOWED_USER_IDS,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
  DB_PATH: process.env.DB_PATH || './memory.db',
};

// Validate required keys
const requiredKeys = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLOWED_USER_IDS', 'GROQ_API_KEY'] as const;

for (const key of requiredKeys) {
  if (!config[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Export parsed allowed user IDs
export const allowedUserIds = config.TELEGRAM_ALLOWED_USER_IDS!.split(',').map((id) => parseInt(id.trim(), 10));
