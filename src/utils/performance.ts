/**
 * Performance Benchmarking Utilities
 * 
 * Provides utilities for measuring and benchmarking operation performance
 * to ensure operations meet performance targets.
 * 
 * @module utils/performance
 */

export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether the operation succeeded */
  success: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface BenchmarkResult {
  /** Operation name */
  operation: string;
  /** Number of iterations */
  iterations: number;
  /** Average duration in milliseconds */
  avgDurationMs: number;
  /** Minimum duration in milliseconds */
  minDurationMs: number;
  /** Maximum duration in milliseconds */
  maxDurationMs: number;
  /** Median duration in milliseconds */
  medianDurationMs: number;
  /** P95 duration in milliseconds */
  p95DurationMs: number;
  /** P99 duration in milliseconds */
  p99DurationMs: number;
  /** Whether all iterations succeeded */
  allSucceeded: boolean;
  /** Performance target in milliseconds (if set) */
  targetMs?: number;
  /** Whether target was met */
  targetMet?: boolean;
}

/**
 * Measure the performance of an async operation
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = performance.now() - start;
    return {
      result,
      metrics: {
        operation,
        durationMs,
        success: true,
        metadata
      }
    };
  } catch (error) {
    const durationMs = performance.now() - start;
    return {
      result: undefined as any,
      metrics: {
        operation,
        durationMs,
        success: false,
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    };
  }
}

/**
 * Measure the performance of a synchronous operation
 */
export function measurePerformanceSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): { result: T; metrics: PerformanceMetrics } {
  const start = performance.now();
  try {
    const result = fn();
    const durationMs = performance.now() - start;
    return {
      result,
      metrics: {
        operation,
        durationMs,
        success: true,
        metadata
      }
    };
  } catch (error) {
    const durationMs = performance.now() - start;
    return {
      result: undefined as any,
      metrics: {
        operation,
        durationMs,
        success: false,
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    };
  }
}

/**
 * Run a benchmark with multiple iterations
 */
export async function benchmark(
  operation: string,
  fn: () => Promise<any>,
  iterations: number = 10,
  targetMs?: number
): Promise<BenchmarkResult> {
  const durations: number[] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await fn();
      const duration = performance.now() - start;
      durations.push(duration);
      successCount++;
    } catch (error) {
      const duration = performance.now() - start;
      durations.push(duration);
    }
  }

  durations.sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avgDurationMs = sum / durations.length;
  const minDurationMs = durations[0];
  const maxDurationMs = durations[durations.length - 1];
  const medianDurationMs = durations[Math.floor(durations.length / 2)];
  const p95Index = Math.floor(durations.length * 0.95);
  const p95DurationMs = durations[p95Index];
  const p99Index = Math.floor(durations.length * 0.99);
  const p99DurationMs = durations[p99Index];

  return {
    operation,
    iterations,
    avgDurationMs,
    minDurationMs,
    maxDurationMs,
    medianDurationMs,
    p95DurationMs,
    p99DurationMs,
    allSucceeded: successCount === iterations,
    targetMs,
    targetMet: targetMs ? avgDurationMs <= targetMs : undefined
  };
}

/**
 * Performance targets for different operations
 */
export const PERFORMANCE_TARGETS = {
  /** Read operations should complete in < 100ms */
  READ_OPERATION: 100,
  /** Write operations should complete in < 500ms */
  WRITE_OPERATION: 500,
  /** Validation operations should complete in < 1000ms */
  VALIDATION_OPERATION: 1000,
  /** Model save operations should complete in < 2000ms */
  MODEL_SAVE: 2000
} as const;

/**
 * Format benchmark result as a readable string
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  const lines: string[] = [];
  lines.push(`\n=== Benchmark: ${result.operation} ===`);
  lines.push(`Iterations: ${result.iterations}`);
  lines.push(`Average: ${result.avgDurationMs.toFixed(2)}ms`);
  lines.push(`Min: ${result.minDurationMs.toFixed(2)}ms`);
  lines.push(`Max: ${result.maxDurationMs.toFixed(2)}ms`);
  lines.push(`Median: ${result.medianDurationMs.toFixed(2)}ms`);
  lines.push(`P95: ${result.p95DurationMs.toFixed(2)}ms`);
  lines.push(`P99: ${result.p99DurationMs.toFixed(2)}ms`);
  lines.push(`Success Rate: ${result.allSucceeded ? '100%' : '< 100%'}`);
  if (result.targetMs) {
    lines.push(`Target: ${result.targetMs}ms`);
    lines.push(`Target Met: ${result.targetMet ? '✅ YES' : '❌ NO'}`);
  }
  return lines.join('\n');
}
