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
   * Default: 5, sufficient for normal reactive propagation depth.
   * For deep async chains use `FLUSH_DEEP` (12 turns).
   */
  maxTurns?: number;
  /**
   * Logger function called with each diagnostic message during the flush.
   * Pass `console.debug` or any `(msg: string) => void` to enable output.
   * Omit (or pass `undefined`) to disable all logging.
   *
   * Prefer `debugFlush()` from `@vielzeug/craft/debug` over wiring this manually.
   */
  logger?: (msg: string) => void;
}

/**
 * Pre-built flush options for deep async chains (async setup, nested effects).
 * Use when the default `flush()` isn't sufficient to drain all pending work.
 *
 * @example
 * ```ts
 * await flush(FLUSH_DEEP);
 * ```
 */
export const FLUSH_DEEP: FlushOptions = { maxTurns: 12 };

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Flush pending reactive updates.
 * Drains several microtask turns, then yields one animation frame and
 * one final microtask pass for rAF-scheduled work.
 *
 * The default drain count (5) covers typical reactive propagation depth in
 * craft components: effect → queueMicrotask (onMounted) → nested reactive
 * updates. For deeper async chains, use `FLUSH_DEEP`.
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
 * await flush({ logger: console.debug });
 * ```
 */
export async function flush(options: FlushOptions = {}): Promise<void> {
  const { logger, maxTurns = 5 } = options;

  const drainMicrotasks = async (turns: number, label: string): Promise<void> => {
    for (let i = 0; i < turns; i++) {
      logger?.(`[flush] ${label} turn ${i + 1}/${turns}`);

      await Promise.resolve();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    }
  };

  logger?.(`[flush] starting with maxTurns=${maxTurns}`);

  await drainMicrotasks(maxTurns, 'microtask');

  logger?.('[flush] draining requestAnimationFrame');

  await new Promise<void>((resolve) =>
    typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : resolve(),
  );

  logger?.('[flush] final microtask pass');

  await drainMicrotasks(2, 'final');

  logger?.('[flush] complete');
}
