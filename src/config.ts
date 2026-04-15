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
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  
  // Bitget
  BITGET_API_KEY: process.env.BITGET_API_KEY,
  BITGET_API_SECRET: process.env.BITGET_API_SECRET,
  BITGET_PASSPHRASE: process.env.BITGET_PASSPHRASE,

  // Integrations
  MAKE_LINKEDIN_WEBHOOK_URL: process.env.MAKE_LINKEDIN_WEBHOOK_URL || 'https://hook.us1.make.com/2059wfhvuwt2lulnhhdyynp4cx7vu5vh',
};

// Validate required keys
const requiredKeys = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLOWED_USER_IDS', 'GROQ_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS'] as const;

for (const key of requiredKeys) {
  if (!config[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Export parsed allowed user IDs
export const allowedUserIds = config.TELEGRAM_ALLOWED_USER_IDS!.split(',').map((id) => parseInt(id.trim(), 10));
