// Enhanced database schema for agent memory and knowledge graph system

pub const AGENT_MEMORY_SCHEMA: &str = r#"
-- Agent Memory Tables
CREATE TABLE IF NOT EXISTS agent_memories (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK(memory_type IN ('Conversation', 'Task', 'Learning', 'Context', 'Tool', 'Error', 'Success', 'Pattern')),
    content TEXT NOT NULL,
    metadata TEXT DEFAULT '{}', -- JSON object
    embedding BLOB, -- Vector embedding as binary data
    relevance_score REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]' -- JSON array of strings
);

-- Shared Knowledge Table
CREATE TABLE IF NOT EXISTS shared_knowledge (
    id TEXT PRIMARY KEY,
    knowledge_type TEXT NOT NULL CHECK(knowledge_type IN ('Fact', 'Procedure', 'Pattern', 'Rule', 'Concept', 'Relationship')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_agents TEXT NOT NULL DEFAULT '[]', -- JSON array of agent IDs
    embedding BLOB, -- Vector embedding
    confidence_score REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    tags TEXT DEFAULT '[]' -- JSON array of strings
);

-- Knowledge Graph Nodes
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id TEXT PRIMARY KEY,
    node_type TEXT NOT NULL CHECK(node_type IN ('Agent', 'Memory', 'Concept', 'Task', 'Tool', 'Context', 'Pattern')),
    name TEXT NOT NULL,
    properties TEXT DEFAULT '{}', -- JSON object
    embedding BLOB, -- Vector embedding
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Graph Edges (Relationships)
CREATE TABLE IF NOT EXISTS knowledge_edges (
    id TEXT PRIMARY KEY,
    from_node TEXT NOT NULL,
    to_node TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK(relationship_type IN ('Knows', 'Uses', 'LearnedFrom', 'CollaboratesWith', 'DependsOn', 'Similar', 'Opposite', 'CausedBy', 'LeadsTo')),
    weight REAL DEFAULT 1.0,
    properties TEXT DEFAULT '{}', -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_node) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (to_node) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
);

-- Agent Interactions
CREATE TABLE IF NOT EXISTS agent_interactions (
    id TEXT PRIMARY KEY,
    agent1_id TEXT NOT NULL,
    agent2_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL CHECK(interaction_type IN ('Collaboration', 'KnowledgeSharing', 'TaskHandoff', 'Conflict', 'Learning')),
    context TEXT NOT NULL,
    success BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memory Access Log (for analytics)
CREATE TABLE IF NOT EXISTS memory_access_log (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    access_type TEXT NOT NULL CHECK(access_type IN ('Read', 'Write', 'Update', 'Search')),
    context TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES agent_memories(id) ON DELETE CASCADE
);

-- Embedding Cache (for performance)
CREATE TABLE IF NOT EXISTS embedding_cache (
    content_hash TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding BLOB NOT NULL,
    model_name TEXT NOT NULL DEFAULT 'sentence-transformer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created_at ON agent_memories(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_memories_relevance ON agent_memories(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memories_access_count ON agent_memories(access_count DESC);

CREATE INDEX IF NOT EXISTS idx_shared_knowledge_type ON shared_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_confidence ON shared_knowledge(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_shared_knowledge_created_at ON shared_knowledge(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_name ON knowledge_nodes(name);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_from ON knowledge_edges(from_node);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_to ON knowledge_edges(to_node);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_type ON knowledge_edges(relationship_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_weight ON knowledge_edges(weight DESC);

CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent1 ON agent_interactions(agent1_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent2 ON agent_interactions(agent2_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_type ON agent_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_created_at ON agent_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_memory_access_log_memory_id ON memory_access_log(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_access_log_agent_id ON memory_access_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_access_log_timestamp ON memory_access_log(timestamp);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(content_hash);

-- Full-text search indexes
CREATE VIRTUAL TABLE IF NOT EXISTS agent_memories_fts USING fts5(
    id UNINDEXED,
    agent_id UNINDEXED,
    content,
    tags,
    content='agent_memories',
    content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS shared_knowledge_fts USING fts5(
    id UNINDEXED,
    title,
    content,
    tags,
    content='shared_knowledge',
    content_rowid='rowid'
);

-- Triggers for FTS updates
CREATE TRIGGER IF NOT EXISTS agent_memories_fts_insert AFTER INSERT ON agent_memories
BEGIN
    INSERT INTO agent_memories_fts(id, agent_id, content, tags) 
    VALUES (NEW.id, NEW.agent_id, NEW.content, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS agent_memories_fts_update AFTER UPDATE ON agent_memories
BEGIN
    UPDATE agent_memories_fts SET content = NEW.content, tags = NEW.tags WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS agent_memories_fts_delete AFTER DELETE ON agent_memories
BEGIN
    DELETE FROM agent_memories_fts WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS shared_knowledge_fts_insert AFTER INSERT ON shared_knowledge
BEGIN
    INSERT INTO shared_knowledge_fts(id, title, content, tags) 
    VALUES (NEW.id, NEW.title, NEW.content, NEW.tags);
END;

CREATE TRIGGER IF NOT EXISTS shared_knowledge_fts_update AFTER UPDATE ON shared_knowledge
BEGIN
    UPDATE shared_knowledge_fts SET title = NEW.title, content = NEW.content, tags = NEW.tags WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS shared_knowledge_fts_delete AFTER DELETE ON shared_knowledge
BEGIN
    DELETE FROM shared_knowledge_fts WHERE id = OLD.id;
END;

-- Triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS update_agent_memories_timestamp 
AFTER UPDATE ON agent_memories
BEGIN
    UPDATE agent_memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_shared_knowledge_timestamp 
AFTER UPDATE ON shared_knowledge
BEGIN
    UPDATE shared_knowledge SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_knowledge_nodes_timestamp 
AFTER UPDATE ON knowledge_nodes
BEGIN
    UPDATE knowledge_nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_knowledge_edges_timestamp 
AFTER UPDATE ON knowledge_edges
BEGIN
    UPDATE knowledge_edges SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to increment access count
CREATE TRIGGER IF NOT EXISTS increment_memory_access_count
AFTER INSERT ON memory_access_log
WHEN NEW.access_type = 'Read'
BEGIN
    UPDATE agent_memories SET access_count = access_count + 1 WHERE id = NEW.memory_id;
END;
"#;

// Views for common queries
pub const AGENT_MEMORY_VIEWS: &str = r#"
-- View for agent memory with decoded JSON fields
CREATE VIEW IF NOT EXISTS agent_memories_view AS
SELECT 
    am.*,
    json_extract(am.metadata, '$') as metadata_json,
    json_extract(am.tags, '$') as tags_json
FROM agent_memories am;

-- View for shared knowledge with source agents
CREATE VIEW IF NOT EXISTS shared_knowledge_view AS
SELECT 
    sk.*,
    json_extract(sk.source_agents, '$') as source_agents_json,
    json_extract(sk.tags, '$') as tags_json,
    json_array_length(sk.source_agents) as source_count
FROM shared_knowledge sk;

-- View for knowledge graph with node details
CREATE VIEW IF NOT EXISTS knowledge_graph_view AS
SELECT 
    ke.*,
    kn_from.name as from_node_name,
    kn_from.node_type as from_node_type,
    kn_to.name as to_node_name,
    kn_to.node_type as to_node_type
FROM knowledge_edges ke
JOIN knowledge_nodes kn_from ON ke.from_node = kn_from.id
JOIN knowledge_nodes kn_to ON ke.to_node = kn_to.id;

-- View for agent interaction statistics
CREATE VIEW IF NOT EXISTS agent_interaction_stats AS
SELECT 
    agent_id,
    COUNT(*) as total_interactions,
    COUNT(CASE WHEN success = 1 THEN 1 END) as successful_interactions,
    COUNT(CASE WHEN success = 0 THEN 1 END) as failed_interactions,
    ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate
FROM (
    SELECT agent1_id as agent_id, success FROM agent_interactions
    UNION ALL
    SELECT agent2_id as agent_id, success FROM agent_interactions
) combined
GROUP BY agent_id;

-- View for memory analytics per agent
CREATE VIEW IF NOT EXISTS agent_memory_analytics AS
SELECT 
    agent_id,
    COUNT(*) as total_memories,
    COUNT(CASE WHEN memory_type = 'Learning' THEN 1 END) as learning_memories,
    COUNT(CASE WHEN memory_type = 'Success' THEN 1 END) as success_memories,
    COUNT(CASE WHEN memory_type = 'Error' THEN 1 END) as error_memories,
    AVG(relevance_score) as avg_relevance,
    AVG(access_count) as avg_access_count,
    MAX(created_at) as last_memory_created
FROM agent_memories
GROUP BY agent_id;
"#;