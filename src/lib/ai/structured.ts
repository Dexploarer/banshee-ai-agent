import { generateText } from 'ai';
import { type ZodSchema, z } from 'zod';
import { getModel } from './providers';

export interface StructuredConfig {
  providerId: string;
  modelId?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface StructuredResult<T> {
  object: T;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface StreamingStructuredResult<T> {
  objectStream: AsyncIterable<Partial<T>>;
  object: Promise<T>;
  usage?: Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
  finishReason?: Promise<string>;
}

/**
 * Generate structured output using JSON schema constraints
 * Simplified implementation that uses standard text generation with schema instructions
 */
export class StructuredGenerator {
  private config: Required<StructuredConfig>;

  constructor(config: StructuredConfig) {
    this.config = {
      providerId: config.providerId,
      modelId: config.modelId || 'gpt-4o-mini',
      temperature: config.temperature ?? 0.1,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * Generate structured object with schema validation using text generation
   */
  async generateObject<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: {
      system?: string;
      schemaName?: string;
      schemaDescription?: string;
    } = {}
  ): Promise<StructuredResult<T>> {
    const model = getModel(this.config.providerId, this.config.modelId);

    try {
      // Create schema-aware prompt
      const schemaInstructions = this.createSchemaInstructions(schema, options);
      const fullPrompt = `${schemaInstructions}\n\n${prompt}\n\nGenerate a JSON response that strictly follows the schema above.`;

      const result = await generateText({
        model: model as any,
        prompt: fullPrompt,
        system:
          options.system || 'You are a helpful assistant that generates structured JSON output.',
        temperature: this.config.temperature,
        maxRetries: this.config.maxRetries,
      });

      // Parse and validate the JSON response
      const parsedObject = this.parseAndValidateJson(result.text, schema);

      return {
        object: parsedObject,
        ...(result.usage && {
          usage: {
            promptTokens: (result.usage as any).promptTokens || 0,
            completionTokens: (result.usage as any).completionTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          },
        }),
        ...(result.finishReason && { finishReason: result.finishReason }),
      };
    } catch (error) {
      throw new Error(`Failed to generate structured object: ${error}`);
    }
  }

  /**
   * Stream structured object with schema validation using text streaming
   */
  async streamObject<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: {
      system?: string;
      schemaName?: string;
      schemaDescription?: string;
      onPartialObject?: (partialObject: Partial<T>) => void;
    } = {}
  ): Promise<StreamingStructuredResult<T>> {
    try {
      // For now, fall back to non-streaming generation
      // In production, this could be enhanced with actual streaming JSON parsing
      const result = await this.generateObject(prompt, schema, options);

      // Create a simple async iterable that yields the final object
      const objectStream = (async function* () {
        yield result.object;
      })();

      return {
        objectStream,
        object: Promise.resolve(result.object),
        ...(result.usage && {
          usage: Promise.resolve(result.usage),
        }),
        ...(result.finishReason && {
          finishReason: Promise.resolve(result.finishReason),
        }),
      };
    } catch (error) {
      throw new Error(`Failed to stream structured object: ${error}`);
    }
  }

  /**
   * Generate multiple structured objects
   */
  async generateObjects<T>(
    prompts: string[],
    schema: ZodSchema<T>,
    options: {
      system?: string;
      schemaName?: string;
      schemaDescription?: string;
      concurrency?: number;
    } = {}
  ): Promise<StructuredResult<T>[]> {
    const { concurrency = 3 } = options;
    const results: StructuredResult<T>[] = [];

    // Process in batches to respect rate limits
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency);
      const batchPromises = batch.map((prompt) => this.generateObject(prompt, schema, options));

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Validate and repair malformed JSON using structured generation
   */
  async repairJson<T>(
    malformedJson: string,
    schema: ZodSchema<T>,
    context?: string
  ): Promise<StructuredResult<T>> {
    const prompt = `
Repair this malformed JSON to match the required schema:

${malformedJson}

${context ? `Context: ${context}` : ''}

Fix any syntax errors, missing fields, or incorrect types while preserving the original intent.
`.trim();

    return this.generateObject(prompt, schema, {
      system:
        'You are a JSON repair specialist. Fix malformed JSON to match the required schema exactly.',
      schemaName: 'RepairedJson',
      schemaDescription: 'The corrected JSON object',
    });
  }

  /**
   * Create schema instructions for the AI model
   */
  private createSchemaInstructions<T>(
    schema: ZodSchema<T>,
    options: {
      schemaName?: string;
      schemaDescription?: string;
    }
  ): string {
    const schemaName = options.schemaName || 'GeneratedObject';
    const schemaDescription =
      options.schemaDescription || 'Object that follows the specified schema';

    // Convert Zod schema to JSON schema description
    const schemaDesc = this.zodToSchemaDescription(schema);

    return `You must generate a JSON object that follows this exact schema:

Schema Name: ${schemaName}
Description: ${schemaDescription}

Required Structure:
${schemaDesc}

IMPORTANT: 
- Return ONLY valid JSON, no additional text or formatting
- All required fields must be present
- Field types must match exactly
- Use null for optional fields that don't have values`;
  }

  /**
   * Convert Zod schema to human-readable description
   */
  private zodToSchemaDescription<T>(_schema: ZodSchema<T>): string {
    try {
      // For basic implementation, return a generic description
      // In production, this could be enhanced with actual Zod schema parsing
      return `Follow the TypeScript interface structure. All required fields must be present with correct types.`;
    } catch (error) {
      return 'Follow the provided schema structure exactly.';
    }
  }

  /**
   * Parse and validate JSON response against schema
   */
  private parseAndValidateJson<T>(text: string, schema: ZodSchema<T>): T {
    try {
      // Extract JSON from the response (handles cases where AI adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(jsonText);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON response: ${error.message}`);
      }
      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Pre-defined schemas for common use cases
 */
export const CommonSchemas = {
  // Data extraction
  personInfo: z.object({
    firstName: z.string().describe('First name'),
    lastName: z.string().describe('Last name'),
    email: z.string().email().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
    age: z.number().int().min(0).max(150).optional().describe('Age in years'),
  }),

  address: z.object({
    street: z.string().describe('Street address'),
    city: z.string().describe('City'),
    state: z.string().describe('State or province'),
    zipCode: z.string().describe('ZIP or postal code'),
    country: z.string().describe('Country'),
  }),

  // Text analysis
  sentiment: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']).describe('Overall sentiment'),
    confidence: z.number().min(0).max(1).describe('Confidence score'),
    reasoning: z.string().describe('Explanation of the sentiment classification'),
  }),

  summary: z.object({
    title: z.string().describe('Brief title or headline'),
    mainPoints: z.array(z.string()).describe('Key points or takeaways'),
    summary: z.string().describe('Comprehensive summary'),
    wordCount: z.number().int().describe('Original text word count'),
  }),

  // Code analysis
  codeReview: z.object({
    issues: z.array(
      z.object({
        type: z.enum(['bug', 'performance', 'style', 'security']).describe('Issue type'),
        severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Issue severity'),
        line: z.number().int().optional().describe('Line number'),
        description: z.string().describe('Issue description'),
        suggestion: z.string().describe('Suggested fix'),
      })
    ),
    overallScore: z.number().min(0).max(10).describe('Overall code quality score'),
    recommendations: z.array(z.string()).describe('General recommendations'),
  }),

  // Task planning
  taskBreakdown: z.object({
    tasks: z.array(
      z.object({
        id: z.string().describe('Unique task identifier'),
        title: z.string().describe('Task title'),
        description: z.string().describe('Detailed description'),
        estimatedHours: z.number().min(0).describe('Estimated time in hours'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Task priority'),
        dependencies: z.array(z.string()).describe('Task IDs this depends on'),
        tags: z.array(z.string()).describe('Relevant tags or categories'),
      })
    ),
    totalEstimate: z.number().min(0).describe('Total estimated hours'),
    criticalPath: z.array(z.string()).describe('Critical path task IDs'),
  }),

  // API response
  apiResponse: z.object({
    success: z.boolean().describe('Whether the operation was successful'),
    data: z.any().optional().describe('Response data'),
    error: z.string().optional().describe('Error message if failed'),
    timestamp: z.string().describe('Response timestamp'),
    metadata: z.record(z.any()).optional().describe('Additional metadata'),
  }),

  // Classification
  classification: z.object({
    category: z.string().describe('Primary category'),
    subcategory: z.string().optional().describe('Subcategory if applicable'),
    confidence: z.number().min(0).max(1).describe('Classification confidence'),
    alternatives: z
      .array(
        z.object({
          category: z.string(),
          confidence: z.number().min(0).max(1),
        })
      )
      .describe('Alternative classifications'),
    reasoning: z.string().describe('Explanation of classification'),
  }),
};

/**
 * Default structured generator instance
 */
export const structuredGenerator = new StructuredGenerator({
  providerId: 'openai',
  modelId: 'gpt-4o-mini',
});

/**
 * Utility functions for common structured tasks
 */

/**
 * Extract structured data from text
 */
export async function extractData<T>(
  text: string,
  schema: ZodSchema<T>,
  context?: string
): Promise<T> {
  const prompt = `
Extract structured data from the following text:

${text}

${context ? `Context: ${context}` : ''}

Extract all relevant information that matches the schema.
`.trim();

  const result = await structuredGenerator.generateObject(prompt, schema, {
    system: 'You are a data extraction specialist. Extract structured information accurately.',
    schemaName: 'ExtractedData',
  });

  return result.object;
}

/**
 * Stream structured data extraction from text
 */
export async function streamExtractData<T>(
  text: string,
  schema: ZodSchema<T>,
  context?: string,
  onPartialObject?: (partial: Partial<T>) => void
): Promise<StreamingStructuredResult<T>> {
  const prompt = `
Extract structured data from the following text:

${text}

${context ? `Context: ${context}` : ''}

Extract all relevant information that matches the schema.
`.trim();

  return structuredGenerator.streamObject(prompt, schema, {
    system: 'You are a data extraction specialist. Extract structured information accurately.',
    schemaName: 'ExtractedData',
    ...(onPartialObject && { onPartialObject }),
  });
}

/**
 * Analyze text and return structured insights
 */
export async function analyzeText(text: string): Promise<{
  sentiment: z.infer<typeof CommonSchemas.sentiment>;
  summary: z.infer<typeof CommonSchemas.summary>;
  classification: z.infer<typeof CommonSchemas.classification>;
}> {
  const [sentiment, summary, classification] = await Promise.all([
    extractData(text, CommonSchemas.sentiment, 'Analyze the sentiment of this text') as Promise<
      z.infer<typeof CommonSchemas.sentiment>
    >,
    extractData(text, CommonSchemas.summary, 'Summarize this text') as Promise<
      z.infer<typeof CommonSchemas.summary>
    >,
    extractData(
      text,
      CommonSchemas.classification,
      'Classify this text by topic/domain'
    ) as Promise<z.infer<typeof CommonSchemas.classification>>,
  ]);

  return { sentiment, summary, classification };
}

/**
 * Convert unstructured task description to structured plan
 */
export async function createTaskPlan(
  description: string
): Promise<z.infer<typeof CommonSchemas.taskBreakdown>> {
  const prompt = `
Break down this project or task description into a structured plan:

${description}

Create a comprehensive task breakdown with realistic time estimates, priorities, and dependencies.
`.trim();

  const result = await structuredGenerator.generateObject(prompt, CommonSchemas.taskBreakdown, {
    system: 'You are a project management expert. Create detailed, realistic task breakdowns.',
    schemaName: 'TaskPlan',
  });

  return result.object;
}

/**
 * Review code and return structured feedback
 */
export async function reviewCode(
  code: string,
  language?: string
): Promise<z.infer<typeof CommonSchemas.codeReview>> {
  const prompt = `
Review this ${language || 'code'} and provide structured feedback:

\`\`\`${language || ''}
${code}
\`\`\`

Analyze for bugs, performance issues, style problems, and security concerns.
`.trim();

  const result = await structuredGenerator.generateObject(prompt, CommonSchemas.codeReview, {
    system: 'You are a senior code reviewer. Provide thorough, actionable feedback.',
    schemaName: 'CodeReview',
  });

  return result.object;
}
