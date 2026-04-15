import { config } from './src/config.js';

const WEBHOOK_URL = process.argv[2];

if (!WEBHOOK_URL) {
  console.error('Por favor provee la URL de la Cloud Function como argumento.');
  console.log('Uso: npx tsx set-webhook.ts <URL_DE_LA_FUNCTION>');
  process.exit(1);
}

async function setWebhook() {
  const TELEGRAM_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
  
  console.log(`Configurando Webhook en: ${WEBHOOK_URL} ...`);
  const response = await fetch(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
  const data = await response.json();
  
  if (data.ok) {
    console.log('✅ Webhook configurado exitosamente.');
    console.log('¡Tu bot ahora corre 100% en la nube (Serverless)!');
  } else {
    console.error('❌ Error configurando Webhook:', data);
  }
}

setWebhook();
