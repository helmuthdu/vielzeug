/**
 * Reactive update flushing utilities for test environments.
 */

import { OreTimeoutError } from '../errors';
import { hasPendingWork } from '../runtime';

// Defensive cap against a genuine bug (e.g. an onMounted callback that always registers
// another onMounted, looping forever) — not a "how much is normally enough" guess like the
// old fixed turn count was. Microtask polls are cheap, so this is generous.
const MAX_FLUSH_ITERATIONS = 1000;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Options for flushing pending reactive updates.
 */
export interface FlushOptions {
  /**
   * Logger function called with each diagnostic message during the flush.
   * Pass `console.debug` or any `(msg: string) => void` to enable output.
   * Omit (or pass `undefined`) to disable all logging.
   *
   * Prefer `debugFlush()` (also from `@vielzeug/ore/testing`) over wiring this manually.
   */
  logger?: (msg: string) => void;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Flush pending reactive updates: waits for every tracked in-flight component
 * operation (scheduled `onMounted` microtasks — including ones registered by other
 * `onMounted` callbacks) to settle, then yields one animation frame and one final
 * microtask pass for rAF-scheduled work.
 *
 * This is deterministic, not a fixed number of guessed turns — `@vielzeug/ripple`'s
 * reactive graph itself settles synchronously on every signal write, so the only real
 * asynchrony to wait for is ore's own component scheduling (see `runtime.ts`'s
 * `hasPendingWork()`). There is no "deep" variant to reach for anymore: `flush()` waits
 * for exactly as much work as is actually pending, however deep that turns out to be.
 *
 * @example
 * ```ts
 * // Standard flush — waits for whatever is actually pending, shallow or deep
 * await flush();
 *
 * // Debug timing issues
 * await flush({ logger: console.debug });
 * ```
 *
 * @throws `OreTimeoutError` if pending work never settles within {@link MAX_FLUSH_ITERATIONS}
 * microtask turns — almost always a sign of a genuine bug (e.g. an `onMounted` callback that
 * keeps re-registering itself), not a case for raising a limit.
 */
export async function flush(options: FlushOptions = {}): Promise<void> {
  const { logger } = options;

  logger?.('[flush] draining pending component work (scheduled mount callbacks)');

  let turns = 0;

  while (hasPendingWork()) {
    if (++turns > MAX_FLUSH_ITERATIONS) {
      throw new OreTimeoutError(
        `flush(): pending component work did not settle after ${MAX_FLUSH_ITERATIONS} microtask turns — ` +
          `check for a component whose onMounted callback keeps re-registering itself.`,
      );
    }

    logger?.(`[flush] pending work remains, turn ${turns}`);
    await Promise.resolve();
  }

  logger?.('[flush] draining requestAnimationFrame');

  await new Promise<void>((resolve) =>
    typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : resolve(),
  );

  logger?.('[flush] final microtask pass');

  await Promise.resolve();

  logger?.('[flush] complete');
}

/**
 * `flush()` with debug logging pre-wired to `console.debug`. Logs each phase and pending-work
 * turn so you can diagnose unexpected update order or timing issues.
 *
 * @example
 * ```ts
 * import { debugFlush } from '@vielzeug/ore/testing';
 *
 * // in a test
 * await debugFlush();
 * // [flush] draining pending component work (scheduled mount callbacks)
 * // [flush] pending work remains, turn 1
 * // ...
 * ```
 */
export async function debugFlush(): Promise<void> {
  return flush({ logger: console.debug });
}
