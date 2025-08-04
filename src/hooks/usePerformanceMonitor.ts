import { useCallback, useEffect, useRef, useState } from 'react';
import { apiCache, computationCache, defaultCache } from '@/lib/cache';

export interface PerformanceMetrics {
  cacheHitRate: number;
  memoryUsage: number;
  renderTime: number;
  scrollPerformance: number;
  apiResponseTime: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  cacheHitRate: number;
  memoryUsage: number;
  renderTime: number;
  scrollPerformance: number;
  apiResponseTime: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  timestamp: number;
}

export function usePerformanceMonitor(
  thresholds: Partial<PerformanceThresholds> = {}
) {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Limit stored metrics to prevent memory leaks
  const MAX_METRICS_STORED = 100;
  const MAX_ALERTS_STORED = 50;
  
  const defaultThresholds: PerformanceThresholds = {
    cacheHitRate: 0.8, // 80% hit rate
    memoryUsage: 50 * 1024 * 1024, // 50MB
    renderTime: 16, // 16ms (60fps)
    scrollPerformance: 16, // 16ms per scroll event
    apiResponseTime: 1000, // 1 second
  };

  const finalThresholds = { ...defaultThresholds, ...thresholds };
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const renderStartTimeRef = useRef<number>(0);

  // Measure render performance
  const measureRender = useCallback(() => {
    const startTime = performance.now();
    renderStartTimeRef.current = startTime;
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => [...prev, {
        ...prev[prev.length - 1],
        renderTime,
        timestamp: Date.now(),
      }]);
      
      // Check threshold
      if (renderTime > finalThresholds.renderTime) {
        setAlerts(prev => [...prev, {
          type: 'warning',
          message: `Render time ${renderTime.toFixed(2)}ms exceeds threshold of ${finalThresholds.renderTime}ms`,
          metric: 'renderTime',
          value: renderTime,
          threshold: finalThresholds.renderTime,
          timestamp: Date.now(),
        }]);
      }
    };
  }, [finalThresholds.renderTime]);

  // Measure scroll performance
  const measureScroll = useCallback((scrollTop: number) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const scrollTime = endTime - startTime;
      
      setMetrics(prev => [...prev, {
        ...prev[prev.length - 1],
        scrollPerformance: scrollTime,
        timestamp: Date.now(),
      }]);
      
      if (scrollTime > finalThresholds.scrollPerformance) {
        setAlerts(prev => [...prev, {
          type: 'warning',
          message: `Scroll performance ${scrollTime.toFixed(2)}ms exceeds threshold of ${finalThresholds.scrollPerformance}ms`,
          metric: 'scrollPerformance',
          value: scrollTime,
          threshold: finalThresholds.scrollPerformance,
          timestamp: Date.now(),
        }]);
      }
    };
  }, [finalThresholds.scrollPerformance]);

  // Collect cache metrics
  const collectCacheMetrics = useCallback(() => {
    const apiStats = apiCache.getStats();
    const computationStats = computationCache.getStats();
    const defaultStats = defaultCache.getStats();
    
    // Calculate overall cache hit rate
    const totalHits = apiStats.hits + computationStats.hits + defaultStats.hits;
    const totalRequests = totalHits + apiStats.misses + computationStats.misses + defaultStats.misses;
    const cacheHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    
    // Calculate total memory usage
    const memoryUsage = (apiStats.memoryUsage || 0) + 
                       (computationStats.memoryUsage || 0) + 
                       (defaultStats.memoryUsage || 0);
    
    return { cacheHitRate, memoryUsage };
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    monitoringIntervalRef.current = setInterval(() => {
      const { cacheHitRate, memoryUsage } = collectCacheMetrics();
      
      setMetrics(prev => {
        const newMetrics = [...prev, {
          cacheHitRate,
          memoryUsage,
          renderTime: 0,
          scrollPerformance: 0,
          apiResponseTime: 0,
          timestamp: Date.now(),
        }];
        
        // Limit stored metrics to prevent memory leaks
        return newMetrics.slice(-MAX_METRICS_STORED);
      });
      
      // Check cache hit rate threshold
      if (cacheHitRate < finalThresholds.cacheHitRate) {
        setAlerts(prev => {
          const newAlerts = [...prev, {
            type: 'warning',
            message: `Cache hit rate ${(cacheHitRate * 100).toFixed(1)}% is below threshold of ${(finalThresholds.cacheHitRate * 100).toFixed(1)}%`,
            metric: 'cacheHitRate',
            value: cacheHitRate,
            threshold: finalThresholds.cacheHitRate,
            timestamp: Date.now(),
          }];
          
          // Limit stored alerts to prevent memory leaks
          return newAlerts.slice(-MAX_ALERTS_STORED);
        });
      }
      
      // Check memory usage threshold
      if (memoryUsage > finalThresholds.memoryUsage) {
        setAlerts(prev => {
          const newAlerts = [...prev, {
            type: 'error',
            message: `Memory usage ${(memoryUsage / 1024 / 1024).toFixed(1)}MB exceeds threshold of ${(finalThresholds.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
            metric: 'memoryUsage',
            value: memoryUsage,
            threshold: finalThresholds.memoryUsage,
            timestamp: Date.now(),
          }];
          
          // Limit stored alerts to prevent memory leaks
          return newAlerts.slice(-MAX_ALERTS_STORED);
        });
      }
    }, 5000); // Collect metrics every 5 seconds
  }, [isMonitoring, collectCacheMetrics, finalThresholds]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Clear metrics and alerts
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    setAlerts([]);
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    if (metrics.length === 0) return null;
    
    const latest = metrics[metrics.length - 1];
    const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;
    const avgScrollPerformance = metrics.reduce((sum, m) => sum + m.scrollPerformance, 0) / metrics.length;
    
    return {
      current: latest,
      averages: {
        renderTime: avgRenderTime,
        scrollPerformance: avgScrollPerformance,
        cacheHitRate: latest.cacheHitRate,
        memoryUsage: latest.memoryUsage,
      },
      alerts: alerts.length,
      monitoring: isMonitoring,
    };
  }, [metrics, alerts, isMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    measureRender,
    measureScroll,
    getPerformanceSummary,
  };
}

// Hook for measuring specific component performance
export function useComponentPerformance(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [totalRenderTime, setTotalRenderTime] = useState(0);
  const renderStartTimeRef = useRef<number>(0);

  const measureRender = useCallback(() => {
    renderStartTimeRef.current = performance.now();
    setRenderCount(prev => prev + 1);
    
    return () => {
      const renderTime = performance.now() - renderStartTimeRef.current;
      setTotalRenderTime(prev => prev + renderTime);
      
      // Log slow renders
      if (renderTime > 16) {
        console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  const avgRenderTime = renderCount > 0 ? totalRenderTime / renderCount : 0;

  return {
    renderCount,
    totalRenderTime,
    avgRenderTime,
    measureRender,
  };
}

// Hook for measuring API performance
export function useAPIPerformance() {
  const [apiMetrics, setApiMetrics] = useState<{
    [endpoint: string]: {
      count: number;
      totalTime: number;
      avgTime: number;
      errors: number;
    };
  }>({});

  const measureAPI = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      setApiMetrics(prev => {
        const current = prev[endpoint] || { count: 0, totalTime: 0, avgTime: 0, errors: 0 };
        const newCount = current.count + 1;
        const newTotalTime = current.totalTime + duration;
        
        return {
          ...prev,
          [endpoint]: {
            count: newCount,
            totalTime: newTotalTime,
            avgTime: newTotalTime / newCount,
            errors: current.errors,
          },
        };
      });
      
      return result;
    } catch (error) {
      setApiMetrics(prev => {
        const current = prev[endpoint] || { count: 0, totalTime: 0, avgTime: 0, errors: 0 };
        
        return {
          ...prev,
          [endpoint]: {
            ...current,
            errors: current.errors + 1,
          },
        };
      });
      
      throw error;
    }
  }, []);

  return {
    apiMetrics,
    measureAPI,
  };
} 