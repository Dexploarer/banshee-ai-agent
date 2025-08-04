import { invoke } from '@tauri-apps/api/core';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  model: string;
  usage?: {
    tokens: number;
  };
}

export interface EmbeddingSearchResult {
  text: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingConfig {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number; // For text-embedding-3 models
  // Neural system configuration
  embeddingDim?: number;
  maxTextLength?: number;
  learningRate?: number;
  trainingEpochs?: number;
  cacheSizeLimit?: number;
}

/**
 * Neural embedding service that uses the Rust backend's neural networks
 * This replaces the old OpenAI-based EmbeddingService with a more sophisticated
 * neural network approach that can handle different memory types
 */
export class EmbeddingService {
  private initialized = false;
  private modelName: string;

  constructor(config: EmbeddingConfig = {}) {
    this.modelName = config.model || 'neural-embedding-v1';
  }

  /**
   * Initialize the neural embedding service
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      await invoke('init_neural_embedding_service', {
        config: {
          embeddingDim: 256,
          maxTextLength: 512,
          learningRate: 0.001,
          trainingEpochs: 100,
          cacheSizeLimit: 10000,
        },
      });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize neural embedding service: ${error}`);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    await this.ensureInitialized();

    try {
      const result = await invoke<{
        embedding: number[];
        text: string;
        memoryType?: string;
      }>('generate_neural_embedding', {
        text,
        memoryType: null, // Use general network
      });

      return {
        embedding: result.embedding,
        text: result.text,
        model: this.modelName,
        usage: {
          tokens: text.length / 4, // Approximate token count
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    await this.ensureInitialized();

    try {
      const textData = texts.map(text => ({ text, memoryType: null }));
      const results = await invoke<Array<{
        embedding: number[];
        text: string;
        memoryType?: string;
      }>>('generate_neural_embeddings_batch', {
        texts: textData,
      });

      return results.map((result, index) => ({
        embedding: result.embedding || [],
        text: result.text,
        model: this.modelName,
        usage: {
          tokens: Math.ceil(texts[index].length / 4),
        },
      }));
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error}`);
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
  searchSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{
      embedding: number[];
      text: string;
      metadata?: Record<string, unknown>;
    }>,
    topK = 5,
    threshold = 0.7
  ): EmbeddingSearchResult[] {
    const results = candidateEmbeddings
      .map((candidate) => ({
        text: candidate.text,
        similarity: this.calculateSimilarity(queryEmbedding, candidate.embedding),
        ...(candidate.metadata && { metadata: candidate.metadata as Record<string, unknown> }),
      }))
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  /**
   * Chunk text into smaller pieces for embedding
   */
  chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);

      // Try to break at word boundaries
      if (end < text.length) {
        const lastSpaceIndex = chunk.lastIndexOf(' ');
        if (lastSpaceIndex > chunkSize * 0.8) {
          // At least 80% of chunk size
          chunk = chunk.slice(0, lastSpaceIndex);
        }
      }

      chunks.push(chunk.trim());
      start = end - overlap;

      if (start >= text.length) break;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Create embeddings for a document with chunking
   */
  async embedDocument(
    text: string,
    metadata?: Record<string, unknown>,
    chunkSize = 1000,
    overlap = 200
  ): Promise<Array<EmbeddingResult & { metadata?: Record<string, unknown>; chunkIndex: number }>> {
    const chunks = this.chunkText(text, chunkSize, overlap);
    const embeddings = await this.generateEmbeddings(chunks);

    return embeddings.map((embedding, index) => ({
      ...embedding,
      ...(metadata && { metadata }),
      chunkIndex: index,
    }));
  }
}

/**
 * Default embedding service instance
 */
export const embeddingService = new EmbeddingService();

/**
 * Utility functions for common embedding tasks
 */

/**
 * Generate embedding for text search
 */
export async function generateSearchEmbedding(query: string): Promise<number[]> {
  const result = await embeddingService.generateEmbedding(query);
  return result.embedding;
}

/**
 * Find similar texts using embeddings
 */
export async function findSimilarTexts(
  query: string,
  texts: string[],
  topK = 5,
  threshold = 0.7
): Promise<EmbeddingSearchResult[]> {
  // Generate embeddings for all texts
  const [queryResult, textResults] = await Promise.all([
    embeddingService.generateEmbedding(query),
    embeddingService.generateEmbeddings(texts),
  ]);

  // Prepare candidates
  const candidates = textResults.map((result) => ({
    embedding: result.embedding,
    text: result.text,
  }));

  // Search for similar texts
  return embeddingService.searchSimilar(queryResult.embedding, candidates, topK, threshold);
}

/**
 * Cluster texts by similarity
 */
export async function clusterTexts(
  texts: string[],
  similarityThreshold = 0.8
): Promise<string[][]> {
  if (texts.length === 0) return [];

  const embeddings = await embeddingService.generateEmbeddings(texts);
  const clusters: string[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < embeddings.length; i++) {
    if (processed.has(i)) continue;

    const currentEmbedding = embeddings[i];
    if (!currentEmbedding) continue;

    const cluster = [currentEmbedding.text];
    processed.add(i);

    for (let j = i + 1; j < embeddings.length; j++) {
      if (processed.has(j)) continue;

      const otherEmbedding = embeddings[j];
      if (!otherEmbedding) continue;

      const similarity = embeddingService.calculateSimilarity(
        currentEmbedding.embedding,
        otherEmbedding.embedding
      );

      if (similarity >= similarityThreshold) {
        cluster.push(otherEmbedding.text);
        processed.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Create a semantic index from texts
 */
export class SemanticIndex {
  private embeddings: Array<{
    id: string;
    text: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }> = [];

  constructor(private embeddingService: EmbeddingService = new EmbeddingService()) {}

  /**
   * Add text to the index
   */
  async addText(id: string, text: string, metadata?: Record<string, unknown>): Promise<void> {
    const result = await this.embeddingService.generateEmbedding(text);

    this.embeddings.push({
      id,
      text,
      embedding: result.embedding,
      ...(metadata && { metadata }),
    });
  }

  /**
   * Add multiple texts to the index
   */
  async addTexts(
    items: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>
  ): Promise<void> {
    const texts = items.map((item) => item.text);
    const results = await this.embeddingService.generateEmbeddings(texts);

    items.forEach((item, index) => {
      const result = results[index];
      if (result) {
        this.embeddings.push({
          id: item.id,
          text: item.text,
          embedding: result.embedding,
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
    Array<{ id: string; text: string; similarity: number; metadata?: Record<string, unknown> }>
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
      metadata?: Record<string, unknown>;
    }>
  ): void {
    this.embeddings = [...data];
  }
}
