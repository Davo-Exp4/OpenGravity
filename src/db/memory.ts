import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { config } from '../config.js';

// Initialize Firebase Admin SDK
try {
  const isCloud = !!process.env.FUNCTIONS_EMULATOR || !!process.env.FUNCTION_SIGNATURE_TYPE || !!process.env.K_SERVICE;
  
  if (isCloud) {
    // In Google Cloud Environment, use default credentials
    initializeApp();
    console.log('[Firebase] Initialized with default cloud credentials.');
  } else if (config.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: cert(config.GOOGLE_APPLICATION_CREDENTIALS),
    });
    console.log('[Firebase] Initialized with local service account.');
  } else {
    initializeApp();
    console.log('[Firebase] Initialized with default credentials (fallback).');
  }
} catch (error: any) {
  console.error('[Firebase] Error initializing Firebase admin:', error.message);
  // Don't exit if already initialized (happens in hot reloads)
  if (!error.message.includes('already exists')) {
    process.exit(1);
  }
}

const db = getFirestore();

export interface ChatMessage {
  id?: string;
  chat_id: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: string; // JSON string
  tool_call_id?: string;
  created_at?: FieldValue | Timestamp;
}

class MemoryManager {
  
  async addMessage(message: ChatMessage) {
    try {
      const docRef = db.collection('chats')
          .doc(message.chat_id.toString())
          .collection('messages')
          .doc(); // Auto-generate ID
      
      await docRef.set({
        chat_id: message.chat_id,
        role: message.role,
        content: message.content || null,
        tool_calls: message.tool_calls || null,
        tool_call_id: message.tool_call_id || null,
        created_at: FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('[MemoryManager] Error adding message:', e);
    }
  }

  async getRecentMessages(chat_id: number, limit: number = 20): Promise<ChatMessage[]> {
    try {
      const snapshot = await db.collection('chats')
        .doc(chat_id.toString())
        .collection('messages')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();

      const msgs: ChatMessage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          chat_id: data.chat_id,
          role: data.role,
          content: data.content,
          tool_calls: data.tool_calls ? JSON.parse(data.tool_calls) : undefined,
          tool_call_id: data.tool_call_id,
          created_at: data.created_at
        });
      });

      // Firebase returns them descending (newest first).
      // We reverse them to get chronological order for the LLM.
      return msgs.reverse();
    } catch (e) {
      console.error('[MemoryManager] Error retrieving messages:', e);
      return [];
    }
  }

  async clearHistory(chat_id: number) {
    try {
      const messagesRef = db.collection('chats').doc(chat_id.toString()).collection('messages');
      const snapshot = await messagesRef.get();
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`[MemoryManager] History cleared for chat ${chat_id}`);
    } catch (e) {
      console.error('[MemoryManager] Error clearing history:', e);
    }
  }
}

export const memory = new MemoryManager();
