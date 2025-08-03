import { openai } from '@ai-sdk/openai';
import { cosineSimilarity, embed, embedMany } from 'ai';

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
  metadata?: Record<string, any>;
}

export interface EmbeddingConfig {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number; // For text-embedding-3 models
}

export class EmbeddingService {
  private model: any; // Simplified for compatibility
  private modelName: string;

  constructor(config: EmbeddingConfig = {}) {
    this.modelName = config.model || 'text-embedding-3-small';

    if (
      config.dimensions &&
      (this.modelName === 'text-embedding-3-small' || this.modelName === 'text-embedding-3-large')
    ) {
      this.model = openai.embedding(this.modelName, {
        dimensions: config.dimensions,
      });
    } else {
      this.model = openai.embedding(this.modelName);
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const { embedding, usage } = await embed({
        model: this.model,
        value: text,
      });

      return {
        embedding,
        text,
        model: this.modelName,
        ...(usage && { usage: { tokens: usage.tokens } }),
      };
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const { embeddings, usage } = await embedMany({
        model: this.model,
        values: texts,
      });

      return texts.map((text, index) => {
        const embedding = embeddings[index];
        return {
          embedding: embedding || [],
          text,
          model: this.modelName,
          ...(usage && { usage: { tokens: Math.ceil(usage.tokens / texts.length) } }),
        };
      });
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Search for similar embeddings using cosine similarity
   */
  searchSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: Array<{
      embedding: number[];
      text: string;
      metadata?: Record<string, any>;
    }>,
    topK = 5,
    threshold = 0.7
  ): EmbeddingSearchResult[] {
    const results = candidateEmbeddings
      .map((candidate) => ({
        text: candidate.text,
        similarity: this.calculateSimilarity(queryEmbedding, candidate.embedding),
        ...(candidate.metadata && { metadata: candidate.metadata }),
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
    metadata?: Record<string, any>,
    chunkSize = 1000,
    overlap = 200
  ): Promise<Array<EmbeddingResult & { metadata?: Record<string, any>; chunkIndex: number }>> {
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
    metadata?: Record<string, any>;
  }> = [];

  constructor(private embeddingService: EmbeddingService = new EmbeddingService()) {}

  /**
   * Add text to the index
   */
  async addText(id: string, text: string, metadata?: Record<string, any>): Promise<void> {
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
    items: Array<{ id: string; text: string; metadata?: Record<string, any> }>
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
    Array<{ id: string; text: string; similarity: number; metadata?: Record<string, any> }>
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
    metadata?: Record<string, any>;
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
      metadata?: Record<string, any>;
    }>
  ): void {
    this.embeddings = [...data];
  }
}
