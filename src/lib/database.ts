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

// New interfaces for agent construction and knowledge bases
export interface DbAgent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  character_role: string;
  model_id: string;
  provider_id: string;
  temperature: number;
  max_tokens: number;
  tools: string; // JSON array of tool names
  created_at: string;
  updated_at: string;
}

export interface DbKnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: 'files' | 'text' | 'web' | 'mixed';
  settings: string; // JSON configuration
  created_at: string;
  updated_at: string;
}

export interface DbKnowledgeItem {
  id: string;
  knowledge_base_id: string;
  title: string;
  content: string;
  content_type: string; // 'text', 'file', 'url'
  file_path?: string;
  file_size?: number;
  embedding?: string; // Base64 encoded vector embedding
  metadata: string; // JSON metadata
  created_at: string;
  updated_at: string;
}

export interface DbAgentKnowledge {
  id: string;
  agent_id: string;
  knowledge_base_id: string;
  created_at: string;
}

export interface DbArtifact {
  id: string;
  conversation_id: string;
  message_id: string;
  type: 'code' | 'html' | 'react' | 'svg' | 'text' | 'data';
  language?: string;
  title: string;
  content: string;
  version: number;
  metadata: string; // JSON metadata
  created_at: string;
  updated_at: string;
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

    await db.execute(`
      -- Agents table
      CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          system_prompt TEXT NOT NULL,
          character_role TEXT NOT NULL,
          model_id TEXT NOT NULL,
          provider_id TEXT NOT NULL,
          temperature REAL DEFAULT 0.7,
          max_tokens INTEGER DEFAULT 4000,
          tools TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      -- Knowledge bases table
      CREATE TABLE IF NOT EXISTS knowledge_bases (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK(type IN ('files', 'text', 'web', 'mixed')),
          settings TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      -- Knowledge items table
      CREATE TABLE IF NOT EXISTS knowledge_items (
          id TEXT PRIMARY KEY,
          knowledge_base_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          content_type TEXT NOT NULL,
          file_path TEXT,
          file_size INTEGER,
          embedding TEXT,
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      -- Agent knowledge junction table
      CREATE TABLE IF NOT EXISTS agent_knowledge (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          knowledge_base_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
          UNIQUE(agent_id, knowledge_base_id)
      );
    `);

    await db.execute(`
      -- Artifacts table
      CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('code', 'html', 'react', 'svg', 'text', 'data')),
          language TEXT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          version INTEGER DEFAULT 1,
          metadata TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
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

    // New indexes for agent construction tables
    await db.execute('CREATE INDEX IF NOT EXISTS idx_agents_provider_id ON agents(provider_id);');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_agents_character_role ON agents(character_role);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_knowledge_items_kb_id ON knowledge_items(knowledge_base_id);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_knowledge_items_content_type ON knowledge_items(content_type);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON agent_knowledge(agent_id);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_agent_knowledge_kb_id ON agent_knowledge(knowledge_base_id);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_artifacts_conversation_id ON artifacts(conversation_id);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_artifacts_message_id ON artifacts(message_id);'
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);');

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
  const agent = getAgent(conversation[0]?.agent_id || '');

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

  // Delete all data from tables (in order to respect foreign keys)
  await db.execute('DELETE FROM artifacts');
  await db.execute('DELETE FROM agent_knowledge');
  await db.execute('DELETE FROM knowledge_items');
  await db.execute('DELETE FROM knowledge_bases');
  await db.execute('DELETE FROM agents');
  await db.execute('DELETE FROM messages');
  await db.execute('DELETE FROM conversations');
  await db.execute('DELETE FROM agent_settings');
  await db.execute('DELETE FROM mcp_sessions');

  // Reset autoincrement counters
  await db.execute(
    "DELETE FROM sqlite_sequence WHERE name IN ('messages', 'conversations', 'agent_settings', 'mcp_sessions', 'agents', 'knowledge_bases', 'knowledge_items', 'agent_knowledge', 'artifacts')"
  );
}

// Agent operations
export async function saveAgent(
  agent: Omit<DbAgent, 'created_at' | 'updated_at'>
): Promise<DbAgent> {
  if (!db) throw new Error('Database not initialized');

  const id = agent.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO agents 
     (id, name, description, system_prompt, character_role, model_id, provider_id, temperature, max_tokens, tools, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      agent.name,
      agent.description || '',
      agent.system_prompt,
      agent.character_role,
      agent.model_id,
      agent.provider_id,
      agent.temperature,
      agent.max_tokens,
      agent.tools,
      now,
      now,
    ]
  );

  return {
    ...agent,
    id,
    created_at: now,
    updated_at: now,
  };
}

export async function getAgent(id: string): Promise<DbAgent | null> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbAgent[]>('SELECT * FROM agents WHERE id = ?', [id]);
  return result[0] || null;
}

export async function getAgents(limit = 50): Promise<DbAgent[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbAgent[]>(
    'SELECT * FROM agents ORDER BY updated_at DESC LIMIT ?',
    [limit]
  );

  return result;
}

export async function deleteAgent(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute('DELETE FROM agents WHERE id = ?', [id]);
}

// Knowledge base operations
export async function saveKnowledgeBase(
  kb: Omit<DbKnowledgeBase, 'created_at' | 'updated_at'>
): Promise<DbKnowledgeBase> {
  if (!db) throw new Error('Database not initialized');

  const id = kb.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO knowledge_bases 
     (id, name, description, type, settings, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, kb.name, kb.description || '', kb.type, kb.settings, now, now]
  );

  return {
    ...kb,
    id,
    created_at: now,
    updated_at: now,
  };
}

export async function getKnowledgeBase(id: string): Promise<DbKnowledgeBase | null> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbKnowledgeBase[]>('SELECT * FROM knowledge_bases WHERE id = ?', [
    id,
  ]);
  return result[0] || null;
}

export async function getKnowledgeBases(limit = 50): Promise<DbKnowledgeBase[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbKnowledgeBase[]>(
    'SELECT * FROM knowledge_bases ORDER BY updated_at DESC LIMIT ?',
    [limit]
  );

  return result;
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute('DELETE FROM knowledge_bases WHERE id = ?', [id]);
}

// Knowledge item operations
export async function saveKnowledgeItem(
  item: Omit<DbKnowledgeItem, 'created_at' | 'updated_at'>
): Promise<DbKnowledgeItem> {
  if (!db) throw new Error('Database not initialized');

  const id = item.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO knowledge_items 
     (id, knowledge_base_id, title, content, content_type, file_path, file_size, embedding, metadata, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      item.knowledge_base_id,
      item.title,
      item.content,
      item.content_type,
      item.file_path || null,
      item.file_size || null,
      item.embedding || null,
      item.metadata,
      now,
      now,
    ]
  );

  return {
    ...item,
    id,
    created_at: now,
    updated_at: now,
  };
}

export async function getKnowledgeItems(
  knowledgeBaseId: string,
  limit = 100
): Promise<DbKnowledgeItem[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbKnowledgeItem[]>(
    'SELECT * FROM knowledge_items WHERE knowledge_base_id = ? ORDER BY updated_at DESC LIMIT ?',
    [knowledgeBaseId, limit]
  );

  return result;
}

export async function searchKnowledgeItems(
  knowledgeBaseId: string,
  query: string,
  limit = 20
): Promise<DbKnowledgeItem[]> {
  if (!db) throw new Error('Database not initialized');

  const searchPattern = `%${query}%`;
  const result = await db.select<DbKnowledgeItem[]>(
    `SELECT * FROM knowledge_items 
     WHERE knowledge_base_id = ? AND (title LIKE ? OR content LIKE ?) 
     ORDER BY updated_at DESC LIMIT ?`,
    [knowledgeBaseId, searchPattern, searchPattern, limit]
  );

  return result;
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute('DELETE FROM knowledge_items WHERE id = ?', [id]);
}

// Agent-Knowledge relationships
export async function linkAgentToKnowledgeBase(
  agentId: string,
  knowledgeBaseId: string
): Promise<DbAgentKnowledge> {
  if (!db) throw new Error('Database not initialized');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR IGNORE INTO agent_knowledge (id, agent_id, knowledge_base_id, created_at) 
     VALUES (?, ?, ?, ?)`,
    [id, agentId, knowledgeBaseId, now]
  );

  return {
    id,
    agent_id: agentId,
    knowledge_base_id: knowledgeBaseId,
    created_at: now,
  };
}

export async function unlinkAgentFromKnowledgeBase(
  agentId: string,
  knowledgeBaseId: string
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute('DELETE FROM agent_knowledge WHERE agent_id = ? AND knowledge_base_id = ?', [
    agentId,
    knowledgeBaseId,
  ]);
}

export async function getAgentKnowledgeBases(agentId: string): Promise<DbKnowledgeBase[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbKnowledgeBase[]>(
    `SELECT kb.* FROM knowledge_bases kb
     JOIN agent_knowledge ak ON kb.id = ak.knowledge_base_id
     WHERE ak.agent_id = ?
     ORDER BY kb.updated_at DESC`,
    [agentId]
  );

  return result;
}

// Artifact operations
export async function saveArtifact(
  artifact: Omit<DbArtifact, 'created_at' | 'updated_at'>
): Promise<DbArtifact> {
  if (!db) throw new Error('Database not initialized');

  const id = artifact.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT OR REPLACE INTO artifacts 
     (id, conversation_id, message_id, type, language, title, content, version, metadata, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      artifact.conversation_id,
      artifact.message_id,
      artifact.type,
      artifact.language || null,
      artifact.title,
      artifact.content,
      artifact.version,
      artifact.metadata,
      now,
      now,
    ]
  );

  return {
    ...artifact,
    id,
    created_at: now,
    updated_at: now,
  };
}

export async function getArtifacts(conversationId: string): Promise<DbArtifact[]> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbArtifact[]>(
    'SELECT * FROM artifacts WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );

  return result;
}

export async function getArtifact(id: string): Promise<DbArtifact | null> {
  if (!db) throw new Error('Database not initialized');

  const result = await db.select<DbArtifact[]>('SELECT * FROM artifacts WHERE id = ?', [id]);
  return result[0] || null;
}

export async function updateArtifactContent(
  id: string,
  content: string,
  incrementVersion = true
): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const now = new Date().toISOString();

  if (incrementVersion) {
    await db.execute(
      'UPDATE artifacts SET content = ?, version = version + 1, updated_at = ? WHERE id = ?',
      [content, now, id]
    );
  } else {
    await db.execute('UPDATE artifacts SET content = ?, updated_at = ? WHERE id = ?', [
      content,
      now,
      id,
    ]);
  }
}

export async function deleteArtifact(id: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.execute('DELETE FROM artifacts WHERE id = ?', [id]);
}
