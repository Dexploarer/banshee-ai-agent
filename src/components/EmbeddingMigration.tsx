import React, { useState, useEffect, useCallback } from 'react';
import {
  EmbeddingMigrationService,
  EmbeddingMigrationConfig,
  MigrationStatus,
  MigrationValidationResult,
  MigrationStats,
  MigrationPresets,
  MigrationUtils,
  useEmbeddingMigration,
} from '../lib/embedding-migration';

interface EmbeddingMigrationProps {
  onClose?: () => void;
}

export const EmbeddingMigration: React.FC<EmbeddingMigrationProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'migrating' | 'validation' | 'complete'>('setup');
  const [config, setConfig] = useState<EmbeddingMigrationConfig>(MigrationPresets.adaToTextEmbedding3Small);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [validationResult, setValidationResult] = useState<MigrationValidationResult | null>(null);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    startMigration,
    getStatus,
    validateResults,
    rollback,
    getStats,
    getCurrentStatus,
    isInProgress,
    getProgress,
    getTimeRemaining,
  } = useEmbeddingMigration();

  // Listen for status updates
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent<MigrationStatus>) => {
      setStatus(event.detail);
      
      // Update step based on status
      if (event.detail.processedItems >= event.detail.totalItems && event.detail.totalItems > 0) {
        setCurrentStep('validation');
      }
    };

    window.addEventListener('embedding-migration-status', handleStatusUpdate as EventListener);
    return () => {
      window.removeEventListener('embedding-migration-status', handleStatusUpdate as EventListener);
    };
  }, []);

  // Poll for status updates when migration is in progress
  useEffect(() => {
    if (isInProgress()) {
      const interval = setInterval(async () => {
        try {
          const currentStatus = await getStatus();
          setStatus(currentStatus);
        } catch (error) {
          console.error('Failed to get migration status:', error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isInProgress, getStatus]);

  const handleStartMigration = useCallback(async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate configuration
      const configErrors = MigrationUtils.validateConfig(config);
      if (configErrors.length > 0) {
        setErrors(configErrors);
        setIsLoading(false);
        return;
      }

      await startMigration(config);
      setCurrentStep('migrating');
    } catch (error) {
      setErrors([`Failed to start migration: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [config, startMigration]);

  const handleValidateResults = useCallback(async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      const result = await validateResults();
      setValidationResult(result);
      setCurrentStep('complete');
    } catch (error) {
      setErrors([`Failed to validate results: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [validateResults]);

  const handleRollback = useCallback(async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      await rollback();
      setCurrentStep('setup');
      setStatus(null);
      setValidationResult(null);
    } catch (error) {
      setErrors([`Failed to rollback: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  }, [rollback]);

  const handleGetStats = useCallback(async () => {
    try {
      const migrationStats = await getStats();
      setStats(migrationStats);
    } catch (error) {
      console.error('Failed to get migration stats:', error);
    }
  }, [getStats]);

  const handlePresetChange = (preset: keyof typeof MigrationPresets) => {
    setConfig(MigrationPresets[preset]);
  };

  const handleConfigChange = (field: keyof EmbeddingMigrationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Migration Configuration</h3>
        
        {/* Preset Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Migration Preset</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePresetChange('adaToTextEmbedding3Small')}
              className={`p-3 text-left rounded border ${
                config.sourceModel === 'text-embedding-ada-002' && config.targetModel === 'text-embedding-3-small'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Ada-002 → Text-Embedding-3-Small</div>
              <div className="text-sm text-gray-600">1536 → 1536 dimensions</div>
            </button>
            
            <button
              onClick={() => handlePresetChange('adaToTextEmbedding3Large')}
              className={`p-3 text-left rounded border ${
                config.sourceModel === 'text-embedding-ada-002' && config.targetModel === 'text-embedding-3-large'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Ada-002 → Text-Embedding-3-Large</div>
              <div className="text-sm text-gray-600">1536 → 3072 dimensions</div>
            </button>
            
            <button
              onClick={() => handlePresetChange('traditionalToNeural')}
              className={`p-3 text-left rounded border ${
                config.useNeuralEmbeddings
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Traditional → Neural</div>
              <div className="text-sm text-gray-600">1536 → 256 dimensions</div>
            </button>
            
            <button
              onClick={() => handlePresetChange('neuralToTraditional')}
              className={`p-3 text-left rounded border ${
                config.sourceModel === 'neural-embedding-v1' && !config.useNeuralEmbeddings
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Neural → Traditional</div>
              <div className="text-sm text-gray-600">256 → 1536 dimensions</div>
            </button>
          </div>
        </div>

        {/* Advanced Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source Model</label>
              <input
                type="text"
                value={config.sourceModel}
                onChange={(e) => handleConfigChange('sourceModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Model</label>
              <input
                type="text"
                value={config.targetModel}
                onChange={(e) => handleConfigChange('targetModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source Dimensions</label>
              <input
                type="number"
                value={config.sourceDimensions}
                onChange={(e) => handleConfigChange('sourceDimensions', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Dimensions</label>
              <input
                type="number"
                value={config.targetDimensions}
                onChange={(e) => handleConfigChange('targetDimensions', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Batch Size</label>
              <input
                type="number"
                value={config.batchSize}
                onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Similarity Threshold</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.similarityThreshold}
                onChange={(e) => handleConfigChange('similarityThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.validateEmbeddings}
                onChange={(e) => handleConfigChange('validateEmbeddings', e.target.checked)}
                className="mr-2"
              />
              Validate Embeddings
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.backupOriginal}
                onChange={(e) => handleConfigChange('backupOriginal', e.target.checked)}
                className="mr-2"
              />
              Backup Original
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.useNeuralEmbeddings}
                onChange={(e) => handleConfigChange('useNeuralEmbeddings', e.target.checked)}
                className="mr-2"
              />
              Use Neural Embeddings
            </label>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Configuration Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleStartMigration}
          disabled={isLoading || errors.length > 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Starting...' : 'Start Migration'}
        </button>
      </div>
    </div>
  );

  const renderMigratingStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Migration in Progress</h3>
        
        {status && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-600">
                  {status.processedItems} / {status.totalItems}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span> {status.statusMessage}
              </div>
              <div>
                <span className="font-medium">Batch:</span> {status.currentBatch} / {status.totalBatches}
              </div>
              <div>
                <span className="font-medium">Successful:</span> {status.successfulItems}
              </div>
              <div>
                <span className="font-medium">Failed:</span> {status.failedItems}
              </div>
            </div>

            {getTimeRemaining() && (
              <div className="text-sm text-gray-600">
                Estimated time remaining: {getTimeRemaining()}
              </div>
            )}

            {status.errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Recent Errors:</h4>
                <div className="text-sm text-yellow-700 max-h-32 overflow-y-auto">
                  {status.errors.slice(-5).map((error, index) => (
                    <div key={index} className="mb-1">• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleRollback}
          disabled={isLoading}
          className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50"
        >
          {isLoading ? 'Rolling back...' : 'Rollback Migration'}
        </button>
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Validating Migration Results</h3>
        <p className="text-gray-600 mb-4">
          Validating migrated embeddings to ensure quality and consistency...
        </p>
        
        <button
          onClick={handleValidateResults}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Validating...' : 'Run Validation'}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Migration Complete</h3>
        
        {validationResult && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">Validation Results:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Validated:</span> {validationResult.totalValidated}
                </div>
                <div>
                  <span className="font-medium">Valid Embeddings:</span> {validationResult.validEmbeddings}
                </div>
                <div>
                  <span className="font-medium">Invalid Embeddings:</span> {validationResult.invalidEmbeddings}
                </div>
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
                <div className="text-sm text-red-700 max-h-32 overflow-y-auto">
                  {validationResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="mb-1">• {error}</div>
                  ))}
                  {validationResult.errors.length > 10 && (
                    <div className="text-gray-600">... and {validationResult.errors.length - 10} more errors</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {stats && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Migration Statistics:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Embeddings:</span> {stats.totalEmbeddings}
              </div>
              <div>
                <span className="font-medium">Migrated:</span> {stats.migratedEmbeddings}
              </div>
              <div>
                <span className="font-medium">Failed:</span> {stats.failedEmbeddings}
              </div>
              <div>
                <span className="font-medium">Success Rate:</span>{' '}
                {stats.totalEmbeddings > 0
                  ? `${((stats.migratedEmbeddings / stats.totalEmbeddings) * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            setCurrentStep('setup');
            setStatus(null);
            setValidationResult(null);
            setStats(null);
          }}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          New Migration
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Embedding Migration Utility</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {currentStep === 'setup' && renderSetupStep()}
          {currentStep === 'migrating' && renderMigratingStep()}
          {currentStep === 'validation' && renderValidationStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </div>
    </div>
  );
};

export default EmbeddingMigration; 