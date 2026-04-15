import fetch from 'node-fetch';
import { config } from '../config.js';
import Groq from 'groq-sdk';
import { toFile } from 'groq-sdk';

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

export async function downloadTelegramVoice(fileId: string): Promise<Buffer> {
  const fileUrlResponse = await fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fileData = await fileUrlResponse.json() as any;
  if (!fileData.ok) {
    throw new Error('Failed to get file from Telegram: ' + fileData.description);
  }
  
  const filePath = fileData.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${filePath}`;
  
  const audioResponse = await fetch(downloadUrl);
  if (!audioResponse.ok) {
    throw new Error('Failed to download audio from Telegram.');
  }
  
  return await audioResponse.buffer();
}

/**
 * Sends a Buffer containing OGG Voice Note to Groq for Whisper transcription.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const audioFile = await toFile(audioBuffer, "voice.ogg", { type: "audio/ogg" });
  
  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3', // or 'whisper-large-v3-turbo' for speed
    response_format: 'text',
    language: 'es' 
  });
  
  return (transcription as unknown as {text: string}).text || transcription.toString();
}

import textToSpeech from '@google-cloud/text-to-speech';

const ttsClient = new textToSpeech.TextToSpeechClient();

/**
 * Converts text to an OGG OPUS buffer using Google TTS.
 * This guarantees true, circular Voice Notes on Telegram and 1M chars/month free.
 */
export async function generateSpeech(text: string): Promise<Buffer> {
  const request = {
    input: { text: text },
    // A nice female Spanish (Latam/US) voice
    voice: { languageCode: 'es-US', name: 'es-US-Neural2-A' }, 
    audioConfig: { audioEncoding: 'OGG_OPUS' as const }, // Format strictly required for Telegram voice notes
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  if (!response.audioContent) {
    throw new Error('Failed to generate speech with Google TTS.');
  }
  
  return Buffer.from(response.audioContent);
}
