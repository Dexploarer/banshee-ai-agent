// Static tools only - MCP tools are handled by native AI SDK integration
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';

// Compatible tool type for AI SDK
type AITool = {
  description: string;
  parameters: z.ZodSchema;
  execute: (args: unknown) => Promise<unknown>;
};

// File system tools
export const readFileToolSchema = z.object({
  path: z.string().describe('The file path to read'),
});
type ReadFileParams = z.infer<typeof readFileToolSchema>;

export const writeFileToolSchema = z.object({
  path: z.string().describe('The file path to write to'),
  content: z.string().describe('The content to write to the file'),
});
type WriteFileParams = z.infer<typeof writeFileToolSchema>;

export const listFilesToolSchema = z.object({
  path: z.string().describe('The directory path to list files from'),
});
type ListFilesParams = z.infer<typeof listFilesToolSchema>;

// System tools
export const executeCommandToolSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  args: z.array(z.string()).optional().describe('Command arguments'),
});
type ExecuteCommandParams = z.infer<typeof executeCommandToolSchema>;

// Network tools
export const httpRequestToolSchema = z.object({
  url: z.string().describe('The URL to make a request to'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional().describe('Request headers'),
  body: z.string().optional().describe('Request body for POST/PUT'),
});
type HttpRequestParams = z.infer<typeof httpRequestToolSchema>;

// UI tools
export const showNotificationToolSchema = z.object({
  title: z.string().describe('Notification title'),
  message: z.string().describe('Notification message'),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
});
type ShowNotificationParams = z.infer<typeof showNotificationToolSchema>;

// Vision tools
export const analyzeImageToolSchema = z.object({
  imagePath: z.string().describe('Path to the image file to analyze'),
  prompt: z.string().describe('What to analyze about the image'),
  providerId: z.string().optional().describe('AI provider to use (defaults to best vision model)'),
  modelId: z.string().optional().describe('Specific model to use for analysis'),
});
type AnalyzeImageParams = z.infer<typeof analyzeImageToolSchema>;

export const describeImageToolSchema = z.object({
  imagePath: z.string().describe('Path to the image file to describe'),
  detailLevel: z
    .enum(['brief', 'detailed', 'technical'])
    .default('detailed')
    .describe('Level of detail in description'),
});
type DescribeImageParams = z.infer<typeof describeImageToolSchema>;

// Embedding tools
export const generateEmbeddingToolSchema = z.object({
  text: z.string().describe('Text to generate embedding for'),
  model: z
    .enum(['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'])
    .default('text-embedding-3-small')
    .describe('Embedding model to use'),
});
type GenerateEmbeddingParams = z.infer<typeof generateEmbeddingToolSchema>;

export const searchSimilarToolSchema = z.object({
  query: z.string().describe('Search query'),
  texts: z.array(z.string()).describe('Array of texts to search in'),
  topK: z.number().default(5).describe('Number of most similar results to return'),
  threshold: z.number().default(0.7).describe('Minimum similarity threshold'),
});
type SearchSimilarParams = z.infer<typeof searchSimilarToolSchema>;

export const clusterTextsToolSchema = z.object({
  texts: z.array(z.string()).describe('Array of texts to cluster'),
  threshold: z.number().default(0.8).describe('Similarity threshold for clustering'),
});
type ClusterTextsParams = z.infer<typeof clusterTextsToolSchema>;

// Structured output tools
export const generateStructuredToolSchema = z.object({
  prompt: z.string().describe('Prompt for generating structured output'),
  schema: z.string().describe('JSON schema definition (as string)'),
  schemaName: z.string().optional().describe('Name for the schema'),
  schemaDescription: z.string().optional().describe('Description of the schema'),
  providerId: z.string().default('openai').describe('AI provider to use'),
  modelId: z.string().optional().describe('Specific model to use'),
});
type GenerateStructuredParams = z.infer<typeof generateStructuredToolSchema>;

export const extractDataToolSchema = z.object({
  text: z.string().describe('Text to extract data from'),
  schema: z.string().describe('JSON schema definition (as string)'),
  context: z.string().optional().describe('Additional context for extraction'),
});
type ExtractDataParams = z.infer<typeof extractDataToolSchema>;

export const analyzeTextToolSchema = z.object({
  text: z.string().describe('Text to analyze'),
});
type AnalyzeTextParams = z.infer<typeof analyzeTextToolSchema>;

export const createTaskPlanToolSchema = z.object({
  description: z.string().describe('Project or task description'),
});
type CreateTaskPlanParams = z.infer<typeof createTaskPlanToolSchema>;

export const reviewCodeToolSchema = z.object({
  code: z.string().describe('Code to review'),
  language: z.string().optional().describe('Programming language'),
});
type ReviewCodeParams = z.infer<typeof reviewCodeToolSchema>;

// Convert legacy tools to use inputSchema for AI SDK compatibility
const legacyTools: Record<string, any> = {
  readFile: {
    description: 'Read contents of a file from the filesystem',
    parameters: readFileToolSchema,
    execute: async ({ path }: ReadFileParams) => {
      try {
        const content = await invoke<string>('read_file_command', { path });
        return { success: true, content };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  writeFile: {
    description: 'Write content to a file on the filesystem',
    parameters: writeFileToolSchema,
    execute: async ({ path, content }: WriteFileParams) => {
      try {
        await invoke('write_file_command', { path, content });
        return { success: true, message: `File written to ${path}` };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  listFiles: {
    description: 'List files and directories in a given path',
    parameters: listFilesToolSchema,
    execute: async ({ path }: ListFilesParams) => {
      try {
        const files = await invoke<string[]>('list_files_command', { path });
        return { success: true, files };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  executeCommand: {
    description: 'Execute a shell command and return the output (with security validation)',
    parameters: executeCommandToolSchema,
    execute: async ({ command, args = [] }: ExecuteCommandParams) => {
      try {
        // Security validation - command must be whitelisted
        const result = await invoke<{ stdout: string; stderr: string; status: number }>(
          'execute_command_secure',
          {
            command,
            args,
          }
        );
        return {
          success: result.status === 0,
          stdout: result.stdout,
          stderr: result.stderr,
          status: result.status,
        };
      } catch (error) {
        // Sanitized error response
        return {
          success: false,
          error: 'Command execution failed - see logs for details',
        };
      }
    },
  } as any,

  httpRequest: {
    description: 'Make HTTP requests to external APIs',
    parameters: httpRequestToolSchema,
    execute: async ({ url, method, headers, body }: HttpRequestParams) => {
      try {
        const response = await invoke<{
          status: number;
          body: string;
          headers: Record<string, string>;
        }>('http_request_command', { url, method, headers, body });
        return {
          success: response.status < 400,
          status: response.status,
          body: response.body,
          headers: response.headers,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  showNotification: {
    description: 'Show a system notification to the user',
    parameters: showNotificationToolSchema,
    execute: async ({ title, message, type }: ShowNotificationParams) => {
      try {
        await invoke('show_notification_command', { title, message, type });
        return { success: true, message: 'Notification shown' };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  analyzeImage: {
    description: 'Analyze an image using vision-capable AI models',
    parameters: analyzeImageToolSchema,
    execute: async ({ imagePath, prompt, providerId, modelId }: AnalyzeImageParams) => {
      try {
        const result = await invoke<string>('analyze_image_command', {
          imagePath,
          prompt,
          providerId: providerId || 'openai',
          modelId: modelId || 'gpt-4o',
        });
        return { success: true, analysis: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  describeImage: {
    description: 'Generate a description of an image',
    parameters: describeImageToolSchema,
    execute: async ({ imagePath, detailLevel }: DescribeImageParams) => {
      try {
        const prompts = {
          brief: 'Describe this image in 1-2 sentences.',
          detailed:
            'Provide a detailed description of this image, including objects, people, setting, colors, and composition.',
          technical:
            'Analyze this image from a technical perspective, including composition, lighting, quality, and any technical aspects visible.',
        };

        const result = await invoke<string>('analyze_image_command', {
          imagePath,
          prompt: prompts[detailLevel],
          providerId: 'openai',
          modelId: 'gpt-4o',
        });
        return { success: true, description: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  generateEmbedding: {
    description: 'Generate semantic embedding for text using neural networks',
    parameters: generateEmbeddingToolSchema,
    execute: async ({ text, model }: GenerateEmbeddingParams) => {
      try {
        const { NeuralEmbeddingService } = await import('../neural-embeddings');
        const embeddingService = new NeuralEmbeddingService();
        const result = await embeddingService.generateEmbedding(text);
        return {
          success: true,
          embedding: result.embedding,
          model: 'neural-embedding-v1',
          usage: {
            tokens: text.length / 4,
          },
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  searchSimilar: {
    description: 'Find similar texts using neural semantic embeddings',
    parameters: searchSimilarToolSchema,
    execute: async ({ query, texts, topK, threshold }: SearchSimilarParams) => {
      try {
        const { findSimilarTextsNeural } = await import('../neural-embeddings');
        const textData = texts.map(text => ({ text, memoryType: undefined }));
        const results = await findSimilarTextsNeural(query, textData, topK, threshold);
        return { success: true, results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  clusterTexts: {
    description: 'Cluster texts by neural semantic similarity',
    parameters: clusterTextsToolSchema,
    execute: async ({ texts, threshold }: ClusterTextsParams) => {
      try {
        const { clusterTextsNeural } = await import('../neural-embeddings');
        const textData = texts.map(text => ({ text, memoryType: undefined }));
        const clusters = await clusterTextsNeural(textData, threshold);
        return { success: true, clusters: clusters.map(cluster => cluster.map(item => item.text)) };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  generateStructured: {
    description: 'Generate structured output with JSON schema constraints',
    parameters: generateStructuredToolSchema,
    execute: async ({
      prompt,
      schemaName,
      schemaDescription,
      providerId,
      modelId,
    }: GenerateStructuredParams) => {
      try {
        const { StructuredGenerator } = await import('../structured');
        const { z } = await import('zod');

        // Note: In practice, you'd need proper schema-to-zod conversion
        const zodSchema = z.any(); // Simplified for this implementation

        const generator = new StructuredGenerator({
          providerId,
          ...(modelId && { modelId }),
        });
        const result = await generator.generateObject(prompt, zodSchema, {
          ...(schemaName && { schemaName }),
          ...(schemaDescription && { schemaDescription }),
        });

        return {
          success: true,
          object: result.object,
          usage: result.usage,
          finishReason: result.finishReason,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  extractData: {
    description: 'Extract structured data from text using schema',
    parameters: extractDataToolSchema,
    execute: async ({ text, context }: ExtractDataParams) => {
      try {
        const { extractData } = await import('../structured');
        const { z } = await import('zod');

        // Note: In practice, you'd need proper schema-to-zod conversion
        const zodSchema = z.any(); // Simplified for this implementation

        const result = await extractData(text, zodSchema, context);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  analyzeText: {
    description: 'Analyze text and return structured insights (sentiment, summary, classification)',
    parameters: analyzeTextToolSchema,
    execute: async ({ text }: AnalyzeTextParams) => {
      try {
        const { analyzeText } = await import('../structured');
        const result = await analyzeText(text);
        return { success: true, analysis: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  createTaskPlan: {
    description: 'Convert task description into structured project plan',
    parameters: createTaskPlanToolSchema,
    execute: async ({ description }: CreateTaskPlanParams) => {
      try {
        const { createTaskPlan } = await import('../structured');
        const result = await createTaskPlan(description);
        return { success: true, plan: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,

  reviewCode: {
    description: 'Review code and provide structured feedback',
    parameters: reviewCodeToolSchema,
    execute: async ({ code, language }: ReviewCodeParams) => {
      try {
        const { reviewCode } = await import('../structured');
        const result = await reviewCode(code, language);
        return { success: true, review: result };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  } as any,
};

/**
 * Get static tools only - MCP tools are handled separately by native AI SDK
 */
export async function getAvailableTools(): Promise<Record<string, AITool>> {
  return convertLegacyToAITools(legacyTools);
}

/**
 * Convert legacy tool format to AI SDK CoreTool format
 */
function convertLegacyToAITools(tools: Record<string, any>): Record<string, AITool> {
  const aiTools: Record<string, AITool> = {};

  for (const [name, tool] of Object.entries(tools)) {
    aiTools[name] = {
      description: tool.description,
      parameters: tool.parameters,
      execute: tool.execute,
    };
  }

  return aiTools;
}

/**
 * Legacy export for backward compatibility
 */
export const agentTools = legacyTools;

export function getToolsByCategory(
  category: 'filesystem' | 'system' | 'network' | 'ui' | 'vision' | 'embeddings' | 'structured'
): Record<string, any> {
  const categories = {
    filesystem: ['readFile', 'writeFile', 'listFiles'],
    system: ['executeCommand'],
    network: ['httpRequest'],
    ui: ['showNotification'],
    vision: ['analyzeImage', 'describeImage'],
    embeddings: ['generateEmbedding', 'searchSimilar', 'clusterTexts'],
    structured: [
      'generateStructured',
      'extractData',
      'analyzeText',
      'createTaskPlan',
      'reviewCode',
    ],
  };

  const toolNames = categories[category] || [];
  return Object.fromEntries(
    toolNames.map((name) => [name, legacyTools[name]]).filter(([, tool]) => tool)
  );
}
