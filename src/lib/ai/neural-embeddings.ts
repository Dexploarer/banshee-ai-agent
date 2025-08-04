import { invoke } from '@tauri-apps/api/core';

export interface NeuralEmbeddingResult {
  embedding: number[];
  text: string;
  memoryType?: string;
  similarity?: number;
}

export interface NeuralEmbeddingSearchResult {
  text: string;
  similarity: number;
  memoryType?: string;
  metadata?: Record<string, unknown>;
}

export interface NeuralEmbeddingConfig {
  embeddingDim?: number;
  maxTextLength?: number;
  learningRate?: number;
  trainingEpochs?: number;
  cacheSizeLimit?: number;
}

export interface NeuralEmbeddingStats {
  cacheSize: number;
  cacheLimit: number;
  embeddingDimension: number;
  specializedNetworks: number;
}

/**
 * Neural embedding service that uses the Rust backend's neural networks
 * for generating meaningful embeddings for different memory types
 */
export class NeuralEmbeddingService {
  private initialized = false;

  constructor(private config: NeuralEmbeddingConfig = {}) {}

  /**
   * Initialize the neural embedding service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await invoke('init_neural_embedding_service', {
        config: this.config,
      });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize neural embedding service: ${error}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    memoryType?: string
  ): Promise<NeuralEmbeddingResult> {
    await this.ensureInitialized();

    try {
      const result = await invoke<{
        embedding: number[];
        text: string;
        memoryType?: string;
      }>('generate_neural_embedding', {
        text,
        memoryType,
      });

      return {
        embedding: result.embedding,
        text: result.text,
        memoryType: result.memoryType,
      };
    } catch (error) {
      throw new Error(`Failed to generate neural embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(
    texts: Array<{ text: string; memoryType?: string }>
  ): Promise<NeuralEmbeddingResult[]> {
    await this.ensureInitialized();

    try {
      const results = await invoke<Array<{
        embedding: number[];
        text: string;
        memoryType?: string;
      }>>('generate_neural_embeddings_batch', {
        texts,
      });

      return results.map((result) => ({
        embedding: result.embedding,
        text: result.text,
        memoryType: result.memoryType,
      }));
    } catch (error) {
      throw new Error(`Failed to generate neural embeddings: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0.0;
    }

    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const norm1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Search for similar embeddings using neural networks
   */
  async searchSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{
      embedding: number[];
      text: string;
      memoryType?: string;
      metadata?: Record<string, unknown>;
    }>,
    topK = 5,
    threshold = 0.7
  ): Promise<NeuralEmbeddingSearchResult[]> {
    await this.ensureInitialized();

    try {
      const results = await invoke<Array<{
        text: string;
        similarity: number;
        memoryType?: string;
        metadata?: Record<string, unknown>;
      }>>('search_neural_similar', {
        queryEmbedding,
        candidateEmbeddings,
        topK,
        threshold,
      });

      return results;
    } catch (error) {
      throw new Error(`Failed to search similar embeddings: ${error}`);
    }
  }

  /**
   * Find similar memories using neural networks
   */
  async findSimilarMemories(
    queryText: string,
    agentId: string,
    memoryType?: string,
    threshold = 0.7,
    topK = 5
  ): Promise<NeuralEmbeddingSearchResult[]> {
    await this.ensureInitialized();

    try {
      const results = await invoke<Array<{
        text: string;
        similarity: number;
        memoryType?: string;
        metadata?: Record<string, unknown>;
      }>>('find_similar_memories', {
        queryText,
        agentId,
        memoryType,
        threshold,
        topK,
      });

      return results;
    } catch (error) {
      throw new Error(`Failed to find similar memories: ${error}`);
    }
  }

  /**
   * Train the neural networks on new data
   */
  async trainOnMemories(agentId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await invoke('train_neural_networks', {
        agentId,
      });
    } catch (error) {
      throw new Error(`Failed to train neural networks: ${error}`);
    }
  }

  /**
   * Get embedding service statistics
   */
  async getStats(): Promise<NeuralEmbeddingStats> {
    await this.ensureInitialized();

    try {
      const stats = await invoke<NeuralEmbeddingStats>('get_neural_embedding_stats');
      return stats;
    } catch (error) {
      throw new Error(`Failed to get neural embedding stats: ${error}`);
    }
  }

  /**
   * Clear the embedding cache
   */
  async clearCache(): Promise<void> {
    await this.ensureInitialized();

    try {
      await invoke('clear_neural_embedding_cache');
    } catch (error) {
      throw new Error(`Failed to clear neural embedding cache: ${error}`);
    }
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

/**
 * Default neural embedding service instance
 */
export const neuralEmbeddingService = new NeuralEmbeddingService();

/**
 * Utility functions for common neural embedding tasks
 */

/**
 * Generate neural embedding for text search
 */
export async function generateNeuralSearchEmbedding(
  query: string,
  memoryType?: string
): Promise<number[]> {
  const result = await neuralEmbeddingService.generateEmbedding(query, memoryType);
  return result.embedding;
}

/**
 * Find similar texts using neural embeddings
 */
export async function findSimilarTextsNeural(
  query: string,
  texts: Array<{ text: string; memoryType?: string }>,
  topK = 5,
  threshold = 0.7
): Promise<NeuralEmbeddingSearchResult[]> {
  // Generate embeddings for all texts
  const [queryResult, textResults] = await Promise.all([
    neuralEmbeddingService.generateEmbedding(query),
    neuralEmbeddingService.generateEmbeddings(texts),
  ]);

  // Prepare candidates
  const candidates = textResults.map((result) => ({
    embedding: result.embedding,
    text: result.text,
    memoryType: result.memoryType,
  }));

  // Search for similar texts
  return neuralEmbeddingService.searchSimilar(
    queryResult.embedding,
    candidates,
    topK,
    threshold
  );
}

/**
 * Cluster texts by neural similarity
 */
export async function clusterTextsNeural(
  texts: Array<{ text: string; memoryType?: string }>,
  similarityThreshold = 0.8
): Promise<Array<{ text: string; memoryType?: string }>[]> {
  if (texts.length === 0) return [];

  const embeddings = await neuralEmbeddingService.generateEmbeddings(texts);
  const clusters: Array<{ text: string; memoryType?: string }>[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < embeddings.length; i++) {
    if (processed.has(i)) continue;

    const currentEmbedding = embeddings[i];
    if (!currentEmbedding) continue;

    const cluster = [{
      text: currentEmbedding.text,
      memoryType: currentEmbedding.memoryType,
    }];
    processed.add(i);

    for (let j = i + 1; j < embeddings.length; j++) {
      if (processed.has(j)) continue;

      const otherEmbedding = embeddings[j];
      if (!otherEmbedding) continue;

      const similarity = neuralEmbeddingService.calculateSimilarity(
        currentEmbedding.embedding,
        otherEmbedding.embedding
      );

      if (similarity >= similarityThreshold) {
        cluster.push({
          text: otherEmbedding.text,
          memoryType: otherEmbedding.memoryType,
        });
        processed.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Create a semantic index using neural embeddings
 */
export class NeuralSemanticIndex {
  private embeddings: Array<{
    id: string;
    text: string;
    embedding: number[];
    memoryType?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  constructor(private embeddingService: NeuralEmbeddingService = new NeuralEmbeddingService()) {}

  /**
   * Add text to the index
   */
  async addText(
    id: string,
    text: string,
    memoryType?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const result = await this.embeddingService.generateEmbedding(text, memoryType);

    this.embeddings.push({
      id,
      text,
      embedding: result.embedding,
      memoryType: result.memoryType,
      ...(metadata && { metadata }),
    });
  }

  /**
   * Add multiple texts to the index
   */
  async addTexts(
    items: Array<{
      id: string;
      text: string;
      memoryType?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    const texts = items.map((item) => ({
      text: item.text,
      memoryType: item.memoryType,
    }));
    const results = await this.embeddingService.generateEmbeddings(texts);

    items.forEach((item, index) => {
      const result = results[index];
      if (result) {
        this.embeddings.push({
          id: item.id,
          text: item.text,
          embedding: result.embedding,
          memoryType: result.memoryType,
          ...(item.metadata && { metadata: item.metadata }),
        });
      }
    });
  }

  /**
   * Search the index
   */
  async search(
    query: string,
    topK = 5,
    threshold = 0.7
  ): Promise<
    Array<{
      id: string;
      text: string;
      similarity: number;
      memoryType?: string;
      metadata?: Record<string, unknown>;
    }>
  > {
    const queryResult = await this.embeddingService.generateEmbedding(query);

    const results = this.embeddings
      .map((item) => ({
        id: item.id,
        text: item.text,
        similarity: this.embeddingService.calculateSimilarity(
          queryResult.embedding,
          item.embedding
        ),
        memoryType: item.memoryType,
        ...(item.metadata && { metadata: item.metadata }),
      }))
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  /**
   * Remove text from index
   */
  removeText(id: string): boolean {
    const index = this.embeddings.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.embeddings.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.embeddings = [];
  }

  /**
   * Get index size
   */
  size(): number {
    return this.embeddings.length;
  }

  /**
   * Export index data
   */
  export(): Array<{
    id: string;
    text: string;
    embedding: number[];
    memoryType?: string;
    metadata?: Record<string, unknown>;
  }> {
    return [...this.embeddings];
  }

  /**
   * Import index data
   */
  import(
    data: Array<{
      id: string;
      text: string;
      embedding: number[];
      memoryType?: string;
      metadata?: Record<string, unknown>;
    }>
  ): void {
    this.embeddings = [...data];
  }
} 