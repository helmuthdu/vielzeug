/**
 * Reactive update flushing utilities for test environments.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Options for flushing pending reactive updates.
 */
export interface FlushOptions {
  /**
   * Maximum number of microtask drain turns.
   * Default: 12, which covers worst-case reactive propagation depth
   * (effect → queueMicrotask → nested updates + buffer for computed chains).
   */
  maxTurns?: number;
  /**
   * Enable debug logging to console showing each turn and timing.
   * Useful for diagnosing timing issues or unexpected update order.
   */
  debug?: boolean;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Flush pending reactive updates.
 * Drains several microtask turns, then yields one animation frame and
 * one final microtask pass for rAF-scheduled work.
 *
 * The default drain count (12) covers the worst-case reactive propagation depth in
 * craftit components: effect → queueMicrotask (onMounted) → nested reactive
 * updates, with buffer for computed chains and batched writes.
 *
 * @example
 * ```ts
 * // Standard flush for most tests
 * await flush();
 *
 * // Shorter flush for simple updates
 * await flush({ maxTurns: 4 });
 *
 * // Debug timing issues
 * await flush({ debug: true });
 * ```
 */
export async function flush(options: FlushOptions = {}): Promise<void> {
  const { debug = false, maxTurns = 12 } = options;

  const drainMicrotasks = async (turns: number, label: string): Promise<void> => {
    for (let i = 0; i < turns; i++) {
      if (debug) console.debug(`[flush] ${label} turn ${i + 1}/${turns}`);

      await Promise.resolve();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    }
  };

  if (debug) console.debug(`[flush] starting with maxTurns=${maxTurns}`);

  await drainMicrotasks(maxTurns, 'microtask');

  if (debug) console.debug('[flush] draining requestAnimationFrame');

  await new Promise<void>((resolve) =>
    typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : resolve(),
  );

  if (debug) console.debug('[flush] final microtask pass');

  await drainMicrotasks(2, 'final');

  if (debug) console.debug('[flush] complete');
}

/**
 * Register auto-cleanup after each test. Call once in your test setup file.
 *
 * @example
 * // vitest.setup.ts
 * import { afterEach } from 'vitest';
 * import { install } from '@vielzeug/craftit/testing';
 * install(afterEach);
 */
export function install(afterEachHook: (fn: () => void) => void, cleanupFn: () => void): void {
  afterEachHook(cleanupFn);
}

// Note: prefer the `install` re-export from testing/testing.ts or testing/index which wires cleanup automatically.
