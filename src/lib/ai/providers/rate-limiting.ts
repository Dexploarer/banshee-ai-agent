/**
 * Rate Limiting System for Anthropic Subscriptions (2025)
 *
 * Implements both 5-hour rolling windows and weekly rate limits
 */

import type { AuthConfig } from './types';

export interface UsageWindow {
  start: number;
  end: number;
  requests: number;
  estimatedHours: number;
}

export interface RateLimitStatus {
  fiveHour: {
    used: number;
    limit: number;
    resetTime: number;
    percentage: number;
  };
  weekly: {
    used: number;
    limit: number;
    resetTime: number;
    percentage: number;
  };
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
}

export class AnthropicRateLimiter {
  private usageHistory: Map<string, UsageWindow[]> = new Map();
  private readonly FIVE_HOUR_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  private readonly WEEKLY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Record a new usage event
   */
  recordUsage(providerId: string, modelId: string, estimatedHours = 0.1): void {
    const key = `${providerId}:${modelId}`;
    const now = Date.now();

    const history = this.usageHistory.get(key) || [];

    // Add new usage
    history.push({
      start: now,
      end: now,
      requests: 1,
      estimatedHours,
    });

    // Clean up old entries (beyond weekly window)
    const weeklyThreshold = now - this.WEEKLY_MS;
    const filteredHistory = history.filter((usage) => usage.start > weeklyThreshold);

    this.usageHistory.set(key, filteredHistory);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(providerId: string, modelId: string, authConfig: AuthConfig): RateLimitStatus {
    const key = `${providerId}:${modelId}`;
    const now = Date.now();
    const history = this.usageHistory.get(key) || [];

    // Calculate 5-hour window usage
    const fiveHourThreshold = now - this.FIVE_HOUR_MS;
    const fiveHourUsage = history
      .filter((usage) => usage.start > fiveHourThreshold)
      .reduce((sum, usage) => sum + usage.requests, 0);

    // Calculate weekly usage in hours
    const weeklyThreshold = now - this.WEEKLY_MS;
    const weeklyUsageHours = history
      .filter((usage) => usage.start > weeklyThreshold)
      .reduce((sum, usage) => sum + usage.estimatedHours, 0);

    // Get limits from subscription info
    const subscriptionInfo = authConfig.subscription_info;
    const fiveHourLimit = subscriptionInfo?.usage_limits.five_hour_limit || 100;
    const weeklyLimit = subscriptionInfo?.usage_limits.weekly_limit || 80;

    // Calculate percentages
    const fiveHourPercentage = (fiveHourUsage / fiveHourLimit) * 100;
    const weeklyPercentage = (weeklyUsageHours / weeklyLimit) * 100;

    // Determine overall status
    const maxPercentage = Math.max(fiveHourPercentage, weeklyPercentage);
    let status: RateLimitStatus['status'];
    if (maxPercentage >= 100) status = 'exceeded';
    else if (maxPercentage >= 90) status = 'critical';
    else if (maxPercentage >= 75) status = 'warning';
    else status = 'safe';

    return {
      fiveHour: {
        used: fiveHourUsage,
        limit: fiveHourLimit,
        resetTime: this.getNextFiveHourReset(now),
        percentage: fiveHourPercentage,
      },
      weekly: {
        used: Math.round(weeklyUsageHours * 10) / 10, // Round to 1 decimal
        limit: weeklyLimit,
        resetTime: this.getNextWeeklyReset(now),
        percentage: weeklyPercentage,
      },
      status,
    };
  }

  /**
   * Check if request would exceed rate limits
   */
  canMakeRequest(
    providerId: string,
    modelId: string,
    authConfig: AuthConfig,
    estimatedHours = 0.1
  ): { allowed: boolean; reason?: string } {
    const status = this.getRateLimitStatus(providerId, modelId, authConfig);

    if (status.status === 'exceeded') {
      const nextReset = Math.min(status.fiveHour.resetTime, status.weekly.resetTime);
      const resetTime = new Date(nextReset).toLocaleTimeString();
      return {
        allowed: false,
        reason: `Rate limit exceeded. Next reset at ${resetTime}`,
      };
    }

    // Check if this request would push us over the limit
    const projectedFiveHour = status.fiveHour.used + 1;
    const projectedWeekly = status.weekly.used + estimatedHours;

    if (projectedFiveHour > status.fiveHour.limit) {
      const resetTime = new Date(status.fiveHour.resetTime).toLocaleTimeString();
      return {
        allowed: false,
        reason: `5-hour request limit would be exceeded. Resets at ${resetTime}`,
      };
    }

    if (projectedWeekly > status.weekly.limit) {
      const resetTime = new Date(status.weekly.resetTime).toLocaleDateString();
      return {
        allowed: false,
        reason: `Weekly usage limit would be exceeded. Resets on ${resetTime}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get next 5-hour reset time
   */
  private getNextFiveHourReset(now: number): number {
    // 5-hour windows reset every 5 hours from midnight
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const hoursSinceMidnight = (now - midnight.getTime()) / (60 * 60 * 1000);
    const nextResetHours = Math.ceil(hoursSinceMidnight / 5) * 5;

    return midnight.getTime() + nextResetHours * 60 * 60 * 1000;
  }

  /**
   * Get next weekly reset time (every Monday at midnight)
   */
  private getNextWeeklyReset(now: number): number {
    const date = new Date(now);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextMonday = new Date(date);
    nextMonday.setDate(date.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    return nextMonday.getTime();
  }

  /**
   * Get formatted rate limit summary
   */
  getUsageSummary(providerId: string, modelId: string, authConfig: AuthConfig): string {
    const status = this.getRateLimitStatus(providerId, modelId, authConfig);
    const planName = authConfig.subscription_info?.plan_name || 'Subscription';

    return `${planName} Usage:
• 5-hour: ${status.fiveHour.used}/${status.fiveHour.limit} requests (${Math.round(status.fiveHour.percentage)}%)
• Weekly: ${status.weekly.used}h/${status.weekly.limit}h (${Math.round(status.weekly.percentage)}%)`;
  }

  /**
   * Clear usage history (for testing)
   */
  clearHistory(): void {
    this.usageHistory.clear();
  }
}

// Global rate limiter instance
export const globalRateLimiter = new AnthropicRateLimiter();
