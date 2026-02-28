/**
 * Craftit - Development Debugging Utilities
 * Tools for debugging components, signals, and renders (dev mode only)
 */

import type { ComputedSignal, Signal } from '../core/signal';
import { effect } from '../core/signal';

/**
 * Check if we're in development mode
 */
const isDev = (): boolean => {
  // Check globalThis for environment flag
  if (typeof globalThis !== 'undefined' && (globalThis as any).__DEV__) {
    return true;
  }
  // Default to true in development (can be overridden in production builds)
  return true;
};

/**
 * Render tracking state
 */
interface RenderTracker {
  component: string;
  count: number;
  lastRender: number;
  averageTime: number;
  renders: number[];
}

const renderTrackers = new Map<string, RenderTracker>();

/**
 * Signal tracking state
 */
interface SignalTracker {
  signal: Signal<any> | ComputedSignal<any>;
  label: string;
  changes: Array<{
    value: any;
    timestamp: number;
  }>;
}

const signalTrackers = new WeakMap<Signal<any> | ComputedSignal<any>, SignalTracker>();

/**
 * Debug utilities for development
 */
export const debug = {
  /**
   * Clear all tracking data
   */
  clear(): void {
    if (!isDev()) return;
    renderTrackers.clear();
    console.log('%c[Debug]%c Cleared all tracking data', 'color: #ef4444; font-weight: bold', 'color: inherit');
  },

  /**
   * Enable warnings for common mistakes
   */
  enableWarnings(): void {
    if (!isDev()) return;

    console.log(
      '%c[Debug Warnings]%c Enabled - will warn about common mistakes',
      'color: #f59e0b; font-weight: bold',
      'color: inherit',
    );

    // Could add checks for:
    // - Mutating signals outside effects
    // - Accessing signals without reading .value
    // - Creating too many effects
    // etc.
  },

  /**
   * Get render statistics for a component
   */
  getRenderStats(componentName: string): RenderTracker | null {
    if (!isDev()) return null;
    return renderTrackers.get(componentName) || null;
  },

  /**
   * Get signal history if tracked
   */
  getSignalHistory<T>(signal: Signal<T> | ComputedSignal<T>): SignalTracker['changes'] | null {
    if (!isDev()) return null;
    return signalTrackers.get(signal)?.changes || null;
  },

  /**
   * Inspect a component's reactive state
   * Shows all signals and their current values
   *
   * @example
   * const state = { count: signal(0), name: signal('') };
   * debug.inspectState(state, 'MyComponent');
   */
  inspectState(state: Record<string, any>, label = 'State'): void {
    if (!isDev()) return;

    console.group(`%c[${label}]`, 'color: #8b5cf6; font-weight: bold');

    Object.entries(state).forEach(([key, value]) => {
      if (value && typeof value === 'object' && 'value' in value) {
        // It's a signal or computed
        console.log(`%c${key}:%c`, 'color: #3b82f6; font-weight: bold', 'color: inherit', value.value);
      } else {
        console.log(`%c${key}:%c`, 'color: #6b7280', 'color: inherit', value);
      }
    });

    console.groupEnd();
  },

  /**
   * Log all render statistics
   */
  logAllRenderStats(): void {
    if (!isDev()) return;

    console.group('%c[Render Statistics]', 'color: #10b981; font-weight: bold; font-size: 1.1em');

    renderTrackers.forEach((tracker, name) => {
      console.log(
        `%c${name}:%c ${tracker.count} renders, avg: ${tracker.averageTime.toFixed(1)}ms`,
        'font-weight: bold',
        'color: inherit',
      );
    });

    console.groupEnd();
  },

  /**
   * Enable render logging for a component
   * Logs every time the component renders
   *
   * @example
   * define('my-component', () => {
   *   debug.logRenders('my-component');
   *   return html`...`;
   * });
   */
  logRenders(componentName = 'Component'): void {
    if (!isDev()) return;

    const tracker: RenderTracker = {
      averageTime: 0,
      component: componentName,
      count: 0,
      lastRender: Date.now(),
      renders: [],
    };

    renderTrackers.set(componentName, tracker);

    console.log(
      `%c[Render Tracking]%c Enabled for ${componentName}`,
      'color: #10b981; font-weight: bold',
      'color: inherit',
    );
  },

  /**
   * Log all signal changes for a component
   * Useful for debugging reactive updates
   *
   * @example
   * debug.logSignalChanges([count, name], 'MyComponent');
   */
  logSignalChanges(signals: Array<Signal<any> | ComputedSignal<any>>, componentName = 'Component'): () => void {
    if (!isDev()) {
      return () => {};
    }

    const cleanups = signals.map((sig, index) => {
      return debug.trace(sig, `${componentName}[${index}]`);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  },

  /**
   * Create a performance mark for profiling
   *
   * @example
   * debug.mark('start-expensive-operation');
   * // ... expensive operation
   * debug.mark('end-expensive-operation');
   * debug.measure('expensive-operation', 'start-expensive-operation', 'end-expensive-operation');
   */
  mark(name: string): void {
    if (!isDev() || typeof performance === 'undefined') return;
    performance.mark(name);
  },

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark: string): void {
    if (!isDev() || typeof performance === 'undefined') return;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];

      console.log(
        `%c[Performance]%c ${name}: ${measure.duration.toFixed(2)}ms`,
        'color: #f59e0b; font-weight: bold',
        'color: inherit',
      );
    } catch (e) {
      console.warn(`Failed to measure ${name}:`, e);
    }
  },

  /**
   * Record a render for tracking
   * Called internally by the component system
   */
  recordRender(componentName: string): void {
    if (!isDev()) return;

    const tracker = renderTrackers.get(componentName);
    if (!tracker) return;

    const now = Date.now();
    const timeSinceLastRender = now - tracker.lastRender;

    tracker.count++;
    tracker.lastRender = now;
    tracker.renders.push(timeSinceLastRender);

    // Keep only last 100 renders
    if (tracker.renders.length > 100) {
      tracker.renders.shift();
    }

    // Calculate average
    tracker.averageTime = tracker.renders.reduce((a, b) => a + b, 0) / tracker.renders.length;

    console.log(
      `%c[Render #${tracker.count}]%c ${componentName} %c(${timeSinceLastRender}ms, avg: ${tracker.averageTime.toFixed(1)}ms)`,
      'color: #10b981; font-weight: bold',
      'color: inherit',
      'color: #6b7280; font-size: 0.9em',
    );
  },
  /**
   * Trace signal value changes
   * Logs to console whenever the signal changes
   *
   * @example
   * const count = signal(0);
   * debug.trace(count, 'count');
   * count.value++; // Logs: [Signal: count] 0 → 1
   */
  trace<T>(signal: Signal<T> | ComputedSignal<T>, label = 'Signal'): () => void {
    if (!isDev()) {
      return () => {}; // No-op in production
    }

    let previousValue = signal.value;

    const cleanup = effect(() => {
      const currentValue = signal.value;

      console.log(
        `%c[Signal: ${label}]%c ${JSON.stringify(previousValue)} → ${JSON.stringify(currentValue)}`,
        'color: #3b82f6; font-weight: bold',
        'color: inherit',
      );

      previousValue = currentValue;
    });

    return cleanup;
  },

  /**
   * Track a signal and store its history
   * Useful for debugging state changes over time
   *
   * @example
   * debug.trackSignal(count, 'count');
   * // Later: debug.getSignalHistory(count)
   */
  trackSignal<T>(signal: Signal<T> | ComputedSignal<T>, label = 'Signal'): () => void {
    if (!isDev()) {
      return () => {};
    }

    const tracker: SignalTracker = {
      changes: [
        {
          timestamp: Date.now(),
          value: signal.value,
        },
      ],
      label,
      signal,
    };

    signalTrackers.set(signal, tracker);

    const cleanup = effect(() => {
      const value = signal.value;
      tracker.changes.push({
        timestamp: Date.now(),
        value,
      });

      // Keep only the last 100 changes to prevent memory leaks
      if (tracker.changes.length > 100) {
        tracker.changes.shift();
      }
    });

    return cleanup;
  },
};

/**
 * Create a debug logger for a specific component
 * Returns a scoped logger with the component name pre-filled
 *
 * @example
 * const log = createDebugLogger('MyComponent');
 * log.trace(count, 'count');
 * log.logRenders();
 */
export function createDebugLogger(componentName: string) {
  return {
    inspectState: (state: Record<string, any>) => debug.inspectState(state, componentName),

    logRenders: () => debug.logRenders(componentName),

    mark: (name: string) => debug.mark(`${componentName}.${name}`),

    measure: (name: string, start: string, end: string) =>
      debug.measure(`${componentName}.${name}`, `${componentName}.${start}`, `${componentName}.${end}`),
    trace: <T>(signal: Signal<T> | ComputedSignal<T>, label?: string) =>
      debug.trace(signal, label || `${componentName}.signal`),

    trackSignal: <T>(signal: Signal<T> | ComputedSignal<T>, label?: string) =>
      debug.trackSignal(signal, label || `${componentName}.signal`),
  };
}
