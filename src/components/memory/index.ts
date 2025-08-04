// Agent Memory System Components
export { MemoryCard } from './MemoryCard';
export { MemoryList } from './MemoryList';
export { MemoryFilter } from './MemoryFilter';
export { MemoryStats } from './MemoryStats';
export { CreateMemoryDialog } from './CreateMemoryDialog';
export { MemoryDashboard } from './MemoryDashboard';

// Re-export types and utilities for convenience
export type {
  AgentMemory,
  SharedKnowledge,
  KnowledgeNode,
  KnowledgeEdge,
  MemoryType,
  KnowledgeType,
  NodeType,
  RelationshipType,
  MemorySearchResult,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  CreateKnowledgeRequest,
  CreateNodeRequest,
  CreateEdgeRequest,
  MemoryFilter as MemoryFilterType,
  UseMemoryReturn,
  UseKnowledgeReturn,
  UseKnowledgeGraphReturn,
} from '../../lib/ai/memory/types';

export { MemoryClient, MemoryUtils } from '../../lib/ai/memory/client';
export {
  useAgentMemory,
  useSharedKnowledge,
  useKnowledgeGraph,
  useFilteredMemories,
  useMemoryStats,
  useMemoryBackup,
} from '../../lib/ai/memory/hooks';
