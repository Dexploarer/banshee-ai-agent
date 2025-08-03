import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export interface DbConversation {
  id: string;
  agent_id: string;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  token_count: number;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: string;
  timestamp: string;
  tokens: number;
}

export interface DbAgentSettings {
  id: string;
  agent_id: string;
  configuration: string;
  created_at: string;
  updated_at: string;
}

export interface DbMcpSession {
  id: string;
  server_id: string;
  status: string;
  connected_at: string;
  disconnected_at?: string;
}

// Initialize database connection
export async function initDatabase(): Promise<void> {
  if (db) return;

  // Check if we're in Tauri environment
  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    console.warn('Not in Tauri environment, skipping database initialization');
    return;
  }

  try {
    console.log('Loading database...');
    db = await Database.load('sqlite:banshee.db');
    console.log('Database loaded successfully');

    // Create tables
    await db.execute(`
      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          token_count INTEGER DEFAULT 0
      );
    `);

    await db.execute(`
      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
          content TEXT NOT NULL,
          tool_calls TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          tokens INTEGER,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      -- Agent settings table
      CREATE TABLE IF NOT EXISTS agent_settings (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL UNIQUE,
          configuration TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      -- MCP sessions table
      CREATE TABLE IF NOT EXISTS mcp_sessions (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          status TEXT NOT NULL,
          connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          disconnected_at DATETIME
      );
    `);

    // Create indexes
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);'
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_mcp_sessions_server_id ON mcp_sessions(server_id);'
    );

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Conversation operations
export async function saveConversation(
  conversation: Omit<DbConversation, 'created_at' | 'updated_at'>
): Promise<DbConversation> {
  if (!db) throw new Error('Database not initialized');

  const id = conversation.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO conversations (id, agent_id, title, summary, token_count, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      conversation.agent_id,
      conversation.title,
      conversation.summary || null,
      conversation.token_count || 0,
      now,
      now,
    ]
  );

  return {
    ...conversation,
    id,
    created_at: now,
    updated_at: now,
  };
}

export async function createConversation(data: {
  agent_id: string;
  title: string;
}): Promise<DbConversation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (!db) throw new Error('Database not initialized');

  await db.execute(
    `INSERT INTO conversations (id, agent_id, title, summary, token_count, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.agent_id, data.title, null, 0, now, now]
  );

  return getConversation(id) as Promise<DbConversation>;
}

export async function getConversations(agentId?: string, limit = 50): Promise<DbConversation[]> {
  if (!db) throw new Error('Database not initialized');

  const query = agentId
    ? 'SELECT * FROM conversations WHERE agent_id = ? ORDER BY updated_at DESC LIMIT ?'
    : 'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?';

  const params = agentId ? [agentId, limit] : [limit];
  const result = await db.select<DbConversation[]>(query, params);

  return result;
}

export async function getConversation(id: string): Promise<DbConversation | null> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbConversation[]>('SELECT * FROM conversations WHERE id = ?', [
    id,
  ]);

  return result[0] || null;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute('DELETE FROM conversations WHERE id = ?', [conversationId]);
}

// Message operations
export async function saveMessage(
  message: Omit<DbMessage, 'id' | 'timestamp'> & { id?: string }
): Promise<DbMessage> {
  if (!db) throw new Error('Database not initialized');

  const id = message.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const token_count = message.tokens || Math.ceil(message.content.length / 4);

  await db.execute(
    `INSERT INTO messages (id, conversation_id, role, content, tool_calls, tokens, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      message.conversation_id,
      message.role,
      message.content,
      message.tool_calls || null,
      token_count,
      now,
    ]
  );

  // Update conversation's updated_at and token count
  await db.execute(
    `UPDATE conversations 
     SET updated_at = ?, token_count = token_count + ? 
     WHERE id = ?`,
    [now, token_count, message.conversation_id]
  );

  return {
    ...message,
    id,
    timestamp: now,
    tokens: token_count,
  };
}

export async function getMessages(conversationId: string, limit = 100): Promise<DbMessage[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbMessage[]>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ?',
    [conversationId, limit]
  );

  return result;
}

// Search operations
export async function searchConversations(query: string): Promise<DbConversation[]> {
  if (!db) throw new Error('Database not initialized');

  const searchPattern = `%${query}%`;
  const result = await db.select<DbConversation[]>(
    `SELECT DISTINCT c.* FROM conversations c
     LEFT JOIN messages m ON c.id = m.conversation_id
     WHERE c.title LIKE ? OR c.summary LIKE ? OR m.content LIKE ?
     ORDER BY c.updated_at DESC
     LIMIT 50`,
    [searchPattern, searchPattern, searchPattern]
  );

  return result;
}

// Agent settings operations
export async function saveAgentSettings(
  settings: Omit<DbAgentSettings, 'created_at' | 'updated_at'>
): Promise<DbAgentSettings> {
  if (!db) throw new Error('Database not initialized');

  const id = settings.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO agent_settings (id, agent_id, configuration, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?)`,
    [id, settings.agent_id, settings.configuration, now, now]
  );

  return {
    ...settings,
    id,
    created_at: now,
    updated_at: now,
  };
}

export async function getAgentSettings(agentId: string): Promise<DbAgentSettings | null> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbAgentSettings[]>(
    'SELECT * FROM agent_settings WHERE agent_id = ?',
    [agentId]
  );

  return result[0] || null;
}

// MCP session operations
export async function saveMcpSession(
  session: Omit<DbMcpSession, 'connected_at'>
): Promise<DbMcpSession> {
  if (!db) throw new Error('Database not initialized');

  const id = session.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO mcp_sessions (id, server_id, status, connected_at, disconnected_at) 
     VALUES (?, ?, ?, ?, ?)`,
    [id, session.server_id, session.status, now, session.disconnected_at || null]
  );

  return {
    ...session,
    id,
    connected_at: now,
  };
}

export async function updateMcpSessionStatus(
  sessionId: string,
  status: string,
  disconnected?: boolean
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  if (disconnected) {
    await db.execute('UPDATE mcp_sessions SET status = ?, disconnected_at = ? WHERE id = ?', [
      status,
      new Date().toISOString(),
      sessionId,
    ]);
  } else {
    await db.execute('UPDATE mcp_sessions SET status = ? WHERE id = ?', [status, sessionId]);
  }
}

export async function getMcpSessions(serverId?: string, limit = 50): Promise<DbMcpSession[]> {
  if (!db) throw new Error('Database not initialized');

  const query = serverId
    ? 'SELECT * FROM mcp_sessions WHERE server_id = ? ORDER BY connected_at DESC LIMIT ?'
    : 'SELECT * FROM mcp_sessions ORDER BY connected_at DESC LIMIT ?';

  const params = serverId ? [serverId, limit] : [limit];
  const result = await db.select<DbMcpSession[]>(query, params);

  return result;
}

// Utility function to export all data
export async function exportAllData(): Promise<{
  conversations: DbConversation[];
  messages: DbMessage[];
  agentSettings: DbAgentSettings[];
  mcpSessions: DbMcpSession[];
}> {
  if (!db) throw new Error('Database not initialized');

  const conversations = await db.select<DbConversation[]>('SELECT * FROM conversations');
  const messages = await db.select<DbMessage[]>('SELECT * FROM messages');
  const agentSettings = await db.select<DbAgentSettings[]>('SELECT * FROM agent_settings');
  const mcpSessions = await db.select<DbMcpSession[]>('SELECT * FROM mcp_sessions');

  return {
    conversations,
    messages,
    agentSettings,
    mcpSessions,
  };
}

// Export conversation data
export async function exportConversation(conversationId: string): Promise<any> {
  if (!db) throw new Error('Database not initialized');

  const conversation = await db.select<DbConversation[]>(
    'SELECT * FROM conversations WHERE id = ?',
    [conversationId]
  );

  if (!conversation || conversation.length === 0) {
    throw new Error('Conversation not found');
  }

  const messages = await getMessages(conversationId);
  const { getAgent } = await import('./ai/agents');
  const agent = getAgent(conversation[0].agent_id);

  return {
    conversation: conversation[0],
    messages,
    agent,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
}

// Clear all application data
export async function clearAllData(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Delete all data from tables
  await db.execute('DELETE FROM messages');
  await db.execute('DELETE FROM conversations');
  await db.execute('DELETE FROM agent_settings');
  await db.execute('DELETE FROM mcp_sessions');

  // Reset autoincrement counters
  await db.execute(
    "DELETE FROM sqlite_sequence WHERE name IN ('messages', 'conversations', 'agent_settings', 'mcp_sessions')"
  );
}
