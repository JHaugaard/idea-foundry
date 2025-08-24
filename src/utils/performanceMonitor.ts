import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SearchMetrics {
  queryText: string;
  queryType: 'fuzzy' | 'semantic' | 'hybrid';
  resultsCount: number;
  searchDuration: number;
  clickedResultId?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  // Start timing an operation
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now()
      });
    };
  }

  // Record a metric
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }
  }

  // Get metrics for a specific operation
  getMetrics(operation?: string): PerformanceMetrics[] {
    if (!operation) return [...this.metrics];
    return this.metrics.filter(m => m.operation === operation);
  }

  // Get average duration for an operation
  getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetrics(operation);
    if (operationMetrics.length === 0) return 0;
    
    const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / operationMetrics.length;
  }

  // Track search analytics in database
  async trackSearchMetrics(metrics: SearchMetrics): Promise<void> {
    try {
      await supabase.rpc('log_search_analytics', {
        p_query_text: metrics.queryText,
        p_query_type: metrics.queryType,
        p_results_count: metrics.resultsCount,
        p_search_duration_ms: Math.round(metrics.searchDuration),
        p_clicked_result_id: metrics.clickedResultId || null
      });
    } catch (error) {
      console.warn('Failed to track search metrics:', error);
    }
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  // Get performance summary
  getSummary(): Record<string, { count: number; avgDuration: number; maxDuration: number }> {
    const summary: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};
    
    for (const metric of this.metrics) {
      if (!summary[metric.operation]) {
        summary[metric.operation] = { count: 0, avgDuration: 0, maxDuration: 0 };
      }
      
      const op = summary[metric.operation];
      op.count++;
      op.maxDuration = Math.max(op.maxDuration, metric.duration);
      op.avgDuration = (op.avgDuration * (op.count - 1) + metric.duration) / op.count;
    }
    
    return summary;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    startTiming: performanceMonitor.startTiming.bind(performanceMonitor),
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAverageDuration: performanceMonitor.getAverageDuration.bind(performanceMonitor),
    trackSearchMetrics: performanceMonitor.trackSearchMetrics.bind(performanceMonitor),
    getSummary: performanceMonitor.getSummary.bind(performanceMonitor),
    exportMetrics: performanceMonitor.exportMetrics.bind(performanceMonitor)
  };
}
