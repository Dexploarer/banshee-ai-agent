import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { invoke } from '@tauri-apps/api/core';
import { generateText } from 'ai';

export interface ImageGenerationConfig {
  providerId: string;
  modelId?: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  responseFormat?: 'url' | 'b64_json';
}

export interface ImageGenerationResult {
  url?: string;
  b64_json?: string;
  revisedPrompt?: string;
  usage?: {
    promptTokens: number;
    completionTokens?: number;
    totalTokens: number;
  };
}

export interface ImageAnalysisResult {
  description: string;
  objects: string[];
  colors: string[];
  mood: string;
  confidence: number;
  usage?:
    | {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    | undefined;
}

/**
 * AI-powered image generation and analysis
 */
export class ImageService {
  private config: Required<ImageGenerationConfig>;

  constructor(config: ImageGenerationConfig) {
    this.config = {
      providerId: config.providerId,
      modelId: config.modelId || 'dall-e-3',
      size: config.size || '1024x1024',
      quality: config.quality || 'standard',
      style: config.style || 'vivid',
      responseFormat: config.responseFormat || 'url',
    };
  }

  /**
   * Generate image using AI models
   */
  async generateImage(
    prompt: string,
    options: Partial<ImageGenerationConfig> = {}
  ): Promise<ImageGenerationResult> {
    const finalConfig = { ...this.config, ...options };

    try {
      if (finalConfig.providerId === 'openai') {
        return this.generateWithOpenAI(prompt, finalConfig);
      }
      // For other providers, use text-to-image via Tauri command
      return this.generateWithTauri(prompt, finalConfig);
    } catch (error) {
      throw new Error(`Failed to generate image: ${error}`);
    }
  }

  /**
   * Generate image using OpenAI DALL-E
   */
  private async generateWithOpenAI(
    prompt: string,
    config: Required<ImageGenerationConfig>
  ): Promise<ImageGenerationResult> {
    try {
      // For now, we'll use a placeholder since generateImage from AI SDK might not be available
      // In production, this would use the native AI SDK generateImage function
      const result = await invoke<{
        url?: string;
        b64_json?: string;
        revised_prompt?: string;
      }>('generate_image_command', {
        prompt,
        model: config.modelId,
        size: config.size,
        quality: config.quality,
        style: config.style,
        response_format: config.responseFormat,
        provider: 'openai',
      });

      return {
        ...(result.url && { url: result.url }),
        ...(result.b64_json && { b64_json: result.b64_json }),
        ...(result.revised_prompt && { revisedPrompt: result.revised_prompt }),
        usage: {
          promptTokens: prompt.length / 4, // Rough estimate
          totalTokens: prompt.length / 4,
        },
      };
    } catch (error) {
      throw new Error(`OpenAI image generation failed: ${error}`);
    }
  }

  /**
   * Generate image using Tauri backend
   */
  private async generateWithTauri(
    prompt: string,
    config: Required<ImageGenerationConfig>
  ): Promise<ImageGenerationResult> {
    try {
      const result = await invoke<{
        url?: string;
        b64_json?: string;
        revised_prompt?: string;
      }>('generate_image_command', {
        prompt,
        model: config.modelId,
        size: config.size,
        quality: config.quality,
        style: config.style,
        response_format: config.responseFormat,
        provider: config.providerId,
      });

      return {
        ...(result.url && { url: result.url }),
        ...(result.b64_json && { b64_json: result.b64_json }),
        ...(result.revised_prompt && { revisedPrompt: result.revised_prompt }),
        usage: {
          promptTokens: prompt.length / 4,
          totalTokens: prompt.length / 4,
        },
      };
    } catch (error) {
      throw new Error(`Image generation failed: ${error}`);
    }
  }

  /**
   * Analyze image using vision models
   */
  async analyzeImage(
    imageUrl: string,
    analysisPrompt = 'Describe this image in detail, including objects, colors, mood, and overall composition.'
  ): Promise<ImageAnalysisResult> {
    try {
      const model = this.getVisionModel();

      const result = await generateText({
        model: model as LanguageModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              { type: 'image', image: imageUrl },
            ],
          },
        ],
      });

      // Extract structured information from the analysis
      const analysis = this.parseImageAnalysis(result.text);

      return {
        description: result.text,
        objects: analysis.objects,
        colors: analysis.colors,
        mood: analysis.mood,
        confidence: analysis.confidence,
        usage: result.usage
          ? {
              promptTokens: (result.usage as { promptTokens: number }).promptTokens || 0,
              completionTokens:
                (result.usage as { completionTokens: number }).completionTokens || 0,
              totalTokens: result.usage.totalTokens || 0,
            }
          : undefined,
      };
    } catch (error) {
      throw new Error(`Image analysis failed: ${error}`);
    }
  }

  /**
   * Get appropriate vision model
   */
  private getVisionModel() {
    switch (this.config.providerId) {
      case 'openai':
        return openai('gpt-4o');
      case 'anthropic':
        return anthropic('claude-3-5-sonnet-20241022');
      default:
        return openai('gpt-4o'); // Default fallback
    }
  }

  /**
   * Parse image analysis text to extract structured data
   */
  private parseImageAnalysis(text: string): {
    objects: string[];
    colors: string[];
    mood: string;
    confidence: number;
  } {
    // Simple text parsing - in production, this could use structured output
    const objects = this.extractObjects(text);
    const colors = this.extractColors(text);
    const mood = this.extractMood(text);
    const confidence = this.estimateConfidence(text);

    return { objects, colors, mood, confidence };
  }

  private extractObjects(text: string): string[] {
    // Extract common objects mentioned in the description
    const objectKeywords = [
      'person',
      'people',
      'man',
      'woman',
      'child',
      'car',
      'building',
      'tree',
      'sky',
      'water',
      'mountain',
      'flower',
      'animal',
      'dog',
      'cat',
      'bird',
      'house',
      'road',
      'book',
      'chair',
      'table',
      'window',
      'door',
      'computer',
      'phone',
      'food',
    ];

    return objectKeywords.filter((keyword) => text.toLowerCase().includes(keyword));
  }

  private extractColors(text: string): string[] {
    const colorKeywords = [
      'red',
      'blue',
      'green',
      'yellow',
      'orange',
      'purple',
      'pink',
      'brown',
      'black',
      'white',
      'gray',
      'grey',
      'gold',
      'silver',
      'cyan',
      'magenta',
    ];

    return colorKeywords.filter((color) => text.toLowerCase().includes(color));
  }

  private extractMood(text: string): string {
    const moodKeywords = {
      happy: ['happy', 'joyful', 'cheerful', 'bright', 'vibrant', 'lively'],
      sad: ['sad', 'melancholy', 'dark', 'gloomy', 'somber'],
      calm: ['calm', 'peaceful', 'serene', 'tranquil', 'quiet'],
      energetic: ['energetic', 'dynamic', 'active', 'busy', 'exciting'],
      mysterious: ['mysterious', 'enigmatic', 'shadowy', 'hidden'],
    };

    const lowerText = text.toLowerCase();

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        return mood;
      }
    }

    return 'neutral';
  }

  private estimateConfidence(text: string): number {
    // Simple confidence estimation based on text length and descriptive words
    const descriptiveWords = ['detailed', 'clear', 'visible', 'prominent', 'obvious'];
    const uncertainWords = ['might', 'could', 'possibly', 'perhaps', 'seems'];

    const hasDescriptive = descriptiveWords.some((word) => text.toLowerCase().includes(word));
    const hasUncertain = uncertainWords.some((word) => text.toLowerCase().includes(word));

    let confidence = 0.7; // Base confidence

    if (hasDescriptive) confidence += 0.2;
    if (hasUncertain) confidence -= 0.2;
    if (text.length > 200) confidence += 0.1; // Longer descriptions usually indicate confidence

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate variations of an existing image
   */
  async generateImageVariations(
    imageUrl: string,
    options: Partial<ImageGenerationConfig> = {}
  ): Promise<ImageGenerationResult[]> {
    const finalConfig = { ...this.config, ...options };

    try {
      const result = await invoke<
        Array<{
          url?: string;
          b64_json?: string;
        }>
      >('generate_image_variations_command', {
        imageUrl,
        model: finalConfig.modelId,
        size: finalConfig.size,
        response_format: finalConfig.responseFormat,
        provider: finalConfig.providerId,
      });

      return result.map((item) => ({
        ...(item.url && { url: item.url }),
        ...(item.b64_json && { b64_json: item.b64_json }),
        usage: {
          promptTokens: 0,
          totalTokens: 0,
        },
      }));
    } catch (error) {
      throw new Error(`Image variation generation failed: ${error}`);
    }
  }

  /**
   * Edit an image using AI
   */
  async editImage(
    imageUrl: string,
    maskUrl: string,
    prompt: string,
    options: Partial<ImageGenerationConfig> = {}
  ): Promise<ImageGenerationResult> {
    const finalConfig = { ...this.config, ...options };

    try {
      const result = await invoke<{
        url?: string;
        b64_json?: string;
        revised_prompt?: string;
      }>('edit_image_command', {
        imageUrl,
        maskUrl,
        prompt,
        model: finalConfig.modelId,
        size: finalConfig.size,
        response_format: finalConfig.responseFormat,
        provider: finalConfig.providerId,
      });

      return {
        ...(result.url && { url: result.url }),
        ...(result.b64_json && { b64_json: result.b64_json }),
        ...(result.revised_prompt && { revisedPrompt: result.revised_prompt }),
        usage: {
          promptTokens: prompt.length / 4,
          totalTokens: prompt.length / 4,
        },
      };
    } catch (error) {
      throw new Error(`Image editing failed: ${error}`);
    }
  }
}

/**
 * Default image service instance
 */
export const imageService = new ImageService({
  providerId: 'openai',
  modelId: 'dall-e-3',
});

/**
 * Utility functions
 */

/**
 * Generate image with simple interface
 */
export async function generateImage(
  prompt: string,
  options: Partial<ImageGenerationConfig> = {}
): Promise<ImageGenerationResult> {
  const service = new ImageService({
    providerId: 'openai',
    ...options,
  });

  return service.generateImage(prompt, options);
}

/**
 * Analyze image with simple interface
 */
export async function analyzeImage(
  imageUrl: string,
  prompt?: string
): Promise<ImageAnalysisResult> {
  return imageService.analyzeImage(imageUrl, prompt);
}
