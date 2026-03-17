import Database, { Database as DBType } from 'better-sqlite3';
import { config } from '../config';

export interface ChatMessage {
  id?: number;
  chat_id: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: string; // JSON string
  tool_call_id?: string;
  created_at?: string;
}

class MemoryManager {
  private db: DBType;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        tool_calls TEXT,
        tool_call_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_id ON messages(chat_id);
    `);
  }

  addMessage(message: ChatMessage) {
    const stmt = this.db.prepare(
      `INSERT INTO messages (chat_id, role, content, tool_calls, tool_call_id)
       VALUES (?, ?, ?, ?, ?)`
    );
    stmt.run(
      message.chat_id,
      message.role,
      message.content || null,
      message.tool_calls || null,
      message.tool_call_id || null
    );
  }

  getRecentMessages(chat_id: number, limit: number = 20): ChatMessage[] {
    const stmt = this.db.prepare(
      `SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?`
    );
    const rows = stmt.all(chat_id, limit) as ChatMessage[];
    // Return in chronological order
    return rows.reverse().map((row) => ({
      ...row,
      tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
    }));
  }

  clearHistory(chat_id: number) {
    const stmt = this.db.prepare(`DELETE FROM messages WHERE chat_id = ?`);
    stmt.run(chat_id);
  }
}

export const memory = new MemoryManager(config.DB_PATH);
