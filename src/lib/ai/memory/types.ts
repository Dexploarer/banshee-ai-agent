// TypeScript types for the Agent Memory System

export enum MemoryType {
  Conversation = 'Conversation',
  Task = 'Task',
  Learning = 'Learning',
  Context = 'Context',
  Tool = 'Tool',
  Error = 'Error',
  Success = 'Success',
  Pattern = 'Pattern',
}

export enum KnowledgeType {
  Fact = 'Fact',
  Procedure = 'Procedure',
  Pattern = 'Pattern',
  Rule = 'Rule',
  Concept = 'Concept',
  Relationship = 'Relationship',
}

export enum NodeType {
  Agent = 'Agent',
  Memory = 'Memory',
  Concept = 'Concept',
  Task = 'Task',
  Tool = 'Tool',
  Context = 'Context',
  Pattern = 'Pattern',
}

export enum RelationshipType {
  Knows = 'Knows',
  Uses = 'Uses',
  LearnedFrom = 'LearnedFrom',
  CollaboratesWith = 'CollaboratesWith',
  DependsOn = 'DependsOn',
  Similar = 'Similar',
  Opposite = 'Opposite',
  CausedBy = 'CausedBy',
  LeadsTo = 'LeadsTo',
}

export interface AgentMemory {
  id: string;
  agent_id: string;
  memory_type: MemoryType;
  content: string;
  metadata: Record<string, string>;
  embedding?: number[];
  relevance_score: number;
  created_at: string;
  updated_at: string;
  access_count: number;
  tags: string[];
}

export interface SharedKnowledge {
  id: string;
  knowledge_type: KnowledgeType;
  title: string;
  content: string;
  source_agents: string[];
  embedding?: number[];
  confidence_score: number;
  created_at: string;
  updated_at: string;
  version: number;
  tags: string[];
}

export interface KnowledgeNode {
  id: string;
  node_type: NodeType;
  name: string;
  properties: Record<string, string>;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEdge {
  id: string;
  from_node: string;
  to_node: string;
  relationship_type: RelationshipType;
  weight: number;
  properties: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface MemoryQuery {
  agent_id?: string;
  memory_types?: MemoryType[];
  content_search?: string;
  tags?: string[];
  embedding?: number[];
  similarity_threshold?: number;
  limit?: number;
  time_range?: [string, string];
}

export interface MemorySearchResult {
  memory: AgentMemory;
  similarity_score?: number;
  relevance_rank: number;
}

export interface MemoryStats {
  agent_id: string;
  total_memories: number;
  memory_type_counts: Record<MemoryType, number>;
  average_relevance: number;
  most_accessed_memories: AgentMemory[];
  recent_learnings: AgentMemory[];
  knowledge_graph_size: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Memory creation request
export interface CreateMemoryRequest {
  agent_id: string;
  memory_type: MemoryType;
  content: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

// Search request
export interface SearchMemoriesRequest {
  agent_id: string;
  content_search?: string;
  memory_types?: MemoryType[];
  tags?: string[];
  limit?: number;
  similarity_threshold?: number;
}

// Knowledge creation request
export interface CreateKnowledgeRequest {
  knowledge_type: KnowledgeType;
  title: string;
  content: string;
  source_agent: string;
  tags?: string[];
}

// Graph node creation request
export interface CreateNodeRequest {
  node_type: NodeType;
  name: string;
  properties?: Record<string, string>;
  agent_id: string;
}

// Graph edge creation request
export interface CreateEdgeRequest {
  from_node: string;
  to_node: string;
  relationship_type: RelationshipType;
  weight?: number;
  properties?: Record<string, string>;
  agent_id: string;
}

// UI State types
export interface MemoryFilter {
  types: MemoryType[];
  tags: string[];
  searchText: string;
  dateRange?: [Date, Date];
}

export interface KnowledgeGraphView {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNode?: string;
  selectedEdge?: string;
  zoom: number;
  center: [number, number];
}

// Hook return types
export interface UseMemoryReturn {
  memories: AgentMemory[];
  loading: boolean;
  error: string | null;
  createMemory: (request: CreateMemoryRequest) => Promise<string>;
  searchMemories: (request: SearchMemoriesRequest) => Promise<MemorySearchResult[]>;
  getMemory: (agent_id: string, memory_id: string) => Promise<AgentMemory | null>;
  refreshMemories: () => Promise<void>;
}

export interface UseKnowledgeReturn {
  knowledge: SharedKnowledge[];
  loading: boolean;
  error: string | null;
  createKnowledge: (request: CreateKnowledgeRequest) => Promise<string>;
  refreshKnowledge: () => Promise<void>;
}

export interface UseKnowledgeGraphReturn {
  graph: KnowledgeGraphView;
  loading: boolean;
  error: string | null;
  addNode: (request: CreateNodeRequest) => Promise<string>;
  addEdge: (request: CreateEdgeRequest) => Promise<string>;
  refreshGraph: () => Promise<void>;
  selectNode: (nodeId: string) => void;
  selectEdge: (edgeId: string) => void;
}
