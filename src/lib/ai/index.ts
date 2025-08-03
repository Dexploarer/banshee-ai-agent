// Main AI module exports
export {
  AgentRuntime,
  type AgentConfig,
  type AgentResult,
  type StreamingAgentResult,
} from './runtime';
export {
  agentConfigs,
  createAssistant,
  createFileManager,
  createSystemAdmin,
  createWebAgent,
  createDeveloper,
} from './agents';
export type { Agent } from './agents';
export { agentTools, getToolsByCategory } from './tools';
export {
  providers,
  getModel,
  listProviders,
  getVisionModels,
  getEmbeddingModels,
  isVisionModel,
  isEmbeddingModel,
  configureGlobalProviders,
  setProviderApiKey,
  setProviderBaseUrl,
  setDefaultProvider,
  getGlobalConfig,
  createConfiguredModel,
  getGlobalModel,
  registerProvider,
  addOllamaProvider,
} from './providers';

// Export structured data features
export {
  StructuredGenerator,
  structuredGenerator,
  extractData,
  streamExtractData,
  analyzeText,
  createTaskPlan,
  reviewCode,
  CommonSchemas,
} from './structured';
export type {
  StructuredResult,
  StreamingStructuredResult,
  StructuredConfig,
} from './structured';

// Export image generation features
export {
  ImageService,
  imageService,
  generateImage,
  analyzeImage,
} from './image';
export type {
  ImageGenerationConfig,
  ImageGenerationResult,
  ImageAnalysisResult,
} from './image';

// Export embedding features
export {
  EmbeddingService,
  embeddingService,
  generateSearchEmbedding,
  findSimilarTexts,
  clusterTexts,
  SemanticIndex,
} from './embeddings';
export type {
  EmbeddingResult,
  EmbeddingSearchResult,
  EmbeddingConfig,
} from './embeddings';

// Re-export common AI SDK types for convenience
export type { CoreMessage, LanguageModel, Tool } from 'ai';
