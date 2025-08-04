/**
 * Anthropic Subscription Plan Management
 *
 * Handles Claude Pro/Max subscription plan detection, usage limits, and model access
 */

import type { AuthConfig } from './types';

export interface SubscriptionPlan {
  type: 'pro' | 'max_5x' | 'max_20x';
  name: string;
  monthlyPrice: number;
  limits: {
    fiveHourMessages: number;
    fiveHourCodePrompts: number;
    weeklyHoursSonnet: number;
    weeklyHoursOpus?: number;
  };
  modelAccess: string[];
}

/**
 * Anthropic subscription plans as of August 2025
 */
export const ANTHROPIC_SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  pro: {
    type: 'pro',
    name: 'Claude Pro',
    monthlyPrice: 20,
    limits: {
      fiveHourMessages: 45,
      fiveHourCodePrompts: 40,
      weeklyHoursSonnet: 80, // 40-80 hours per week
    },
    modelAccess: ['claude-3-5-sonnet-20241022'], // Claude 3.5 Sonnet (Sonnet 4)
  },
  max_5x: {
    type: 'max_5x',
    name: 'Claude Max 5x Pro',
    monthlyPrice: 100,
    limits: {
      fiveHourMessages: 225,
      fiveHourCodePrompts: 200,
      weeklyHoursSonnet: 280, // 140-280 hours per week
      weeklyHoursOpus: 35, // 15-35 hours per week
    },
    modelAccess: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'], // Claude 3.5 Sonnet (Sonnet 4) + Claude 3 Opus
  },
  max_20x: {
    type: 'max_20x',
    name: 'Claude Max 20x Pro',
    monthlyPrice: 200,
    limits: {
      fiveHourMessages: 900,
      fiveHourCodePrompts: 800,
      weeklyHoursSonnet: 480, // 240-480 hours per week
      weeklyHoursOpus: 40, // 24-40 hours per week
    },
    modelAccess: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'], // Claude 3.5 Sonnet (Sonnet 4) + Claude 3 Opus
  },
};

/**
 * Detect subscription plan from OAuth token
 */
export async function detectSubscriptionPlan(
  _accessToken: string
): Promise<SubscriptionPlan | null> {
  try {
    // In a real implementation, this would make an API call to Anthropic
    // to get the user's subscription information
    // For now, we'll return a default Pro plan

    // Example API call (not real endpoint):
    // const response = await fetch('https://api.anthropic.com/v1/account/subscription', {
    //   headers: { Authorization: `Bearer ${accessToken}` }
    // });

    // Mock detection - in reality this would parse the API response
    // For demonstration, we'll assume Pro plan
    const proPlan = ANTHROPIC_SUBSCRIPTION_PLANS.pro;
    return proPlan ?? null;
  } catch (error) {
    console.error('Failed to detect subscription plan:', error);
    return null;
  }
}

/**
 * Create AuthConfig with subscription information
 */
export function createSubscriptionAuthConfig(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  plan: SubscriptionPlan
): AuthConfig {
  return {
    method: 'oauth2',
    credentials: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
    expires_at: Date.now() + expiresIn * 1000,
    subscription_info: {
      plan_type: plan.type,
      plan_name: plan.name,
      usage_limits: {
        five_hour_limit: plan.limits.fiveHourCodePrompts,
        weekly_limit: plan.limits.weeklyHoursSonnet,
        model_access: plan.modelAccess,
      },
    },
  };
}

/**
 * Check if a model is accessible with the current subscription
 */
export function isModelAccessible(modelId: string, authConfig: AuthConfig): boolean {
  if (authConfig.method !== 'oauth2' || !authConfig.subscription_info) {
    // For API key authentication, assume all models are accessible
    return true;
  }

  return authConfig.subscription_info.usage_limits.model_access.includes(modelId);
}

/**
 * Get recommended model for subscription plan
 */
export function getRecommendedModel(_plan: SubscriptionPlan): string {
  // Always recommend Claude 3.5 Sonnet (Sonnet 4) as the primary model
  return 'claude-3-5-sonnet-20241022';
}

/**
 * Calculate usage percentage for rate limiting
 */
export function calculateUsagePercentage(
  used: number,
  limit: number
): { percentage: number; status: 'safe' | 'warning' | 'critical' } {
  const percentage = (used / limit) * 100;

  if (percentage >= 90) return { percentage, status: 'critical' };
  if (percentage >= 75) return { percentage, status: 'warning' };
  return { percentage, status: 'safe' };
}

/**
 * Format subscription plan display name
 */
export function formatPlanName(plan: SubscriptionPlan): string {
  return `${plan.name} ($${plan.monthlyPrice}/month)`;
}
