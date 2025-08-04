import { invoke } from '@tauri-apps/api/core';

export interface EmbeddingMigrationConfig {
  sourceModel: string;
  targetModel: string;
  sourceDimensions: number;
  targetDimensions: number;
  batchSize: number;
  validateEmbeddings: boolean;
  backupOriginal: boolean;
  similarityThreshold: number;
  maxRetries: number;
  useNeuralEmbeddings: boolean;
}

export interface MigrationStatus {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  currentBatch: number;
  totalBatches: number;
  startTime: string;
  estimatedCompletion?: string;
  statusMessage: string;
  errors: string[];
}

export interface MigrationValidationResult {
  totalValidated: number;
  validEmbeddings: number;
  invalidEmbeddings: number;
  errors: string[];
}

export interface MigrationStats {
  totalEmbeddings: number;
  migratedEmbeddings: number;
  failedEmbeddings: number;
  tableBreakdown: Record<string, number>;
}

/**
 * Embedding Migration Service
 * Provides a high-level interface for migrating embeddings between different models
 */
export class EmbeddingMigrationService {
  private static instance: EmbeddingMigrationService;
  private migrationStatus: MigrationStatus | null = null;
  private statusPollingInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): EmbeddingMigrationService {
    if (!EmbeddingMigrationService.instance) {
      EmbeddingMigrationService.instance = new EmbeddingMigrationService();
    }
    return EmbeddingMigrationService.instance;
  }

  /**
   * Start embedding migration with custom configuration
   */
  async startMigration(config: Partial<EmbeddingMigrationConfig> = {}): Promise<string> {
    const defaultConfig: EmbeddingMigrationConfig = {
      sourceModel: 'text-embedding-ada-002',
      targetModel: 'text-embedding-3-small',
      sourceDimensions: 1536,
      targetDimensions: 1536,
      batchSize: 100,
      validateEmbeddings: true,
      backupOriginal: true,
      similarityThreshold: 0.8,
      maxRetries: 3,
      useNeuralEmbeddings: false,
      ...config,
    };

    try {
      const result = await invoke<string>('start_embedding_migration', {
        config: defaultConfig,
      });

      // Start polling for status updates
      this.startStatusPolling();

      return result;
    } catch (error) {
      throw new Error(`Failed to start migration: ${error}`);
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    try {
      const status = await invoke<MigrationStatus>('get_migration_status');
      this.migrationStatus = status;
      return status;
    } catch (error) {
      throw new Error(`Failed to get migration status: ${error}`);
    }
  }

  /**
   * Validate migration results
   */
  async validateMigrationResults(): Promise<MigrationValidationResult> {
    try {
      return await invoke<MigrationValidationResult>('validate_migration_results');
    } catch (error) {
      throw new Error(`Failed to validate migration results: ${error}`);
    }
  }

  /**
   * Rollback migration to backup
   */
  async rollbackMigration(): Promise<string> {
    try {
      const result = await invoke<string>('rollback_migration');
      this.stopStatusPolling();
      return result;
    } catch (error) {
      throw new Error(`Failed to rollback migration: ${error}`);
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(): Promise<MigrationStats> {
    try {
      return await invoke<MigrationStats>('get_migration_stats');
    } catch (error) {
      throw new Error(`Failed to get migration stats: ${error}`);
    }
  }

  /**
   * Start polling for status updates
   */
  private startStatusPolling(): void {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
    }

    this.statusPollingInterval = setInterval(async () => {
      try {
        const status = await this.getMigrationStatus();
        
        // Emit status update event
        this.emitStatusUpdate(status);

        // Stop polling if migration is complete
        if (status.processedItems >= status.totalItems && status.totalItems > 0) {
          this.stopStatusPolling();
        }
      } catch (error) {
        console.error('Failed to poll migration status:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Stop status polling
   */
  private stopStatusPolling(): void {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  }

  /**
   * Emit status update event
   */
  private emitStatusUpdate(status: MigrationStatus): void {
    // Create a custom event for status updates
    const event = new CustomEvent('embedding-migration-status', {
      detail: status,
    });
    window.dispatchEvent(event);
  }

  /**
   * Get current migration status (cached)
   */
  getCurrentStatus(): MigrationStatus | null {
    return this.migrationStatus;
  }

  /**
   * Check if migration is in progress
   */
  isMigrationInProgress(): boolean {
    return this.statusPollingInterval !== null;
  }

  /**
   * Calculate migration progress percentage
   */
  getMigrationProgress(): number {
    if (!this.migrationStatus || this.migrationStatus.totalItems === 0) {
      return 0;
    }
    return (this.migrationStatus.processedItems / this.migrationStatus.totalItems) * 100;
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining(): string | null {
    if (!this.migrationStatus || this.migrationStatus.processedItems === 0) {
      return null;
    }

    const elapsed = Date.now() - new Date(this.migrationStatus.startTime).getTime();
    const itemsPerMs = this.migrationStatus.processedItems / elapsed;
    const remainingItems = this.migrationStatus.totalItems - this.migrationStatus.processedItems;
    const remainingMs = remainingItems / itemsPerMs;

    return this.formatDuration(remainingMs);
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * React hook for embedding migration
 */
export function useEmbeddingMigration() {
  const service = EmbeddingMigrationService.getInstance();

  const startMigration = async (config?: Partial<EmbeddingMigrationConfig>) => {
    return await service.startMigration(config);
  };

  const getStatus = async () => {
    return await service.getMigrationStatus();
  };

  const validateResults = async () => {
    return await service.validateMigrationResults();
  };

  const rollback = async () => {
    return await service.rollbackMigration();
  };

  const getStats = async () => {
    return await service.getMigrationStats();
  };

  const getCurrentStatus = () => {
    return service.getCurrentStatus();
  };

  const isInProgress = () => {
    return service.isMigrationInProgress();
  };

  const getProgress = () => {
    return service.getMigrationProgress();
  };

  const getTimeRemaining = () => {
    return service.getEstimatedTimeRemaining();
  };

  return {
    startMigration,
    getStatus,
    validateResults,
    rollback,
    getStats,
    getCurrentStatus,
    isInProgress,
    getProgress,
    getTimeRemaining,
  };
}

/**
 * Migration configuration presets
 */
export const MigrationPresets = {
  // OpenAI Ada-002 to OpenAI Text-Embedding-3-Small
  adaToTextEmbedding3Small: {
    sourceModel: 'text-embedding-ada-002',
    targetModel: 'text-embedding-3-small',
    sourceDimensions: 1536,
    targetDimensions: 1536,
    batchSize: 100,
    validateEmbeddings: true,
    backupOriginal: true,
    similarityThreshold: 0.8,
    maxRetries: 3,
    useNeuralEmbeddings: false,
  },

  // OpenAI Ada-002 to OpenAI Text-Embedding-3-Large
  adaToTextEmbedding3Large: {
    sourceModel: 'text-embedding-ada-002',
    targetModel: 'text-embedding-3-large',
    sourceDimensions: 1536,
    targetDimensions: 3072,
    batchSize: 50, // Smaller batch size for larger embeddings
    validateEmbeddings: true,
    backupOriginal: true,
    similarityThreshold: 0.8,
    maxRetries: 3,
    useNeuralEmbeddings: false,
  },

  // Traditional to Neural Embeddings
  traditionalToNeural: {
    sourceModel: 'text-embedding-ada-002',
    targetModel: 'neural-embedding-v1',
    sourceDimensions: 1536,
    targetDimensions: 256,
    batchSize: 100,
    validateEmbeddings: true,
    backupOriginal: true,
    similarityThreshold: 0.7, // Lower threshold for neural embeddings
    maxRetries: 3,
    useNeuralEmbeddings: true,
  },

  // Neural to Traditional Embeddings
  neuralToTraditional: {
    sourceModel: 'neural-embedding-v1',
    targetModel: 'text-embedding-3-small',
    sourceDimensions: 256,
    targetDimensions: 1536,
    batchSize: 100,
    validateEmbeddings: true,
    backupOriginal: true,
    similarityThreshold: 0.8,
    maxRetries: 3,
    useNeuralEmbeddings: false,
  },
};

/**
 * Migration utility functions
 */
export class MigrationUtils {
  /**
   * Check if migration is needed by comparing model versions
   */
  static isMigrationNeeded(currentModel: string, targetModel: string): boolean {
    const modelVersions = {
      'text-embedding-ada-002': 1,
      'text-embedding-3-small': 2,
      'text-embedding-3-large': 2,
      'neural-embedding-v1': 3,
    };

    const currentVersion = modelVersions[currentModel as keyof typeof modelVersions] || 0;
    const targetVersion = modelVersions[targetModel as keyof typeof modelVersions] || 0;

    return targetVersion > currentVersion;
  }

  /**
   * Estimate migration time based on item count and batch size
   */
  static estimateMigrationTime(
    itemCount: number,
    batchSize: number,
    avgTimePerBatch: number = 5000 // 5 seconds per batch
  ): number {
    const batchCount = Math.ceil(itemCount / batchSize);
    return batchCount * avgTimePerBatch;
  }

  /**
   * Validate migration configuration
   */
  static validateConfig(config: EmbeddingMigrationConfig): string[] {
    const errors: string[] = [];

    if (config.sourceModel === config.targetModel) {
      errors.push('Source and target models must be different');
    }

    if (config.batchSize < 1 || config.batchSize > 1000) {
      errors.push('Batch size must be between 1 and 1000');
    }

    if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
      errors.push('Similarity threshold must be between 0 and 1');
    }

    if (config.maxRetries < 1 || config.maxRetries > 10) {
      errors.push('Max retries must be between 1 and 10');
    }

    return errors;
  }

  /**
   * Get recommended configuration based on current setup
   */
  static getRecommendedConfig(currentModel?: string): Partial<EmbeddingMigrationConfig> {
    if (!currentModel) {
      return MigrationPresets.adaToTextEmbedding3Small;
    }

    switch (currentModel) {
      case 'text-embedding-ada-002':
        return MigrationPresets.adaToTextEmbedding3Small;
      case 'text-embedding-3-small':
        return MigrationPresets.adaToTextEmbedding3Large;
      case 'neural-embedding-v1':
        return MigrationPresets.neuralToTraditional;
      default:
        return MigrationPresets.adaToTextEmbedding3Small;
    }
  }
}

// Export default instance
export const embeddingMigrationService = EmbeddingMigrationService.getInstance(); 