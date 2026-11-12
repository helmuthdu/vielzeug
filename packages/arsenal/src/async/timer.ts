export type Timer = {
  /** (Re)starts the timer: any pending run is cancelled first, so at most one run is ever scheduled. */
  arm(ms: number): void;
  /** Cancels the pending run, if any. Safe to call repeatedly. */
  cancel(): void;
  /** `true` while a run is scheduled and has not fired yet. */
  readonly pending: boolean;
};

/**
 * Creates a single-slot, re-armable timeout around `fn`.
 * Replaces the `let id; clearTimeout(id); id = setTimeout(...)` bookkeeping for one-shot timers
 * such as idle flushes, open timeouts, and wake-ups.
 *
 * @example
 * ```ts
 * const idle = timer(() => flush());
 * idle.arm(500); // schedules
 * idle.arm(500); // reschedules (debounce behavior)
 * idle.cancel(); // nothing runs
 * ```
 *
 * @param fn - Callback to run when the armed delay elapses. `pending` is already `false` inside it.
 */
export function timer(fn: () => void): Timer {
  let id: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    if (id === undefined) return;

    clearTimeout(id);
    id = undefined;
  };

  return {
    arm(ms) {
      cancel();
      id = setTimeout(() => {
        id = undefined;
        fn();
      }, ms);
    },
    cancel,
    get pending() {
      return id !== undefined;
    },
  };
}
