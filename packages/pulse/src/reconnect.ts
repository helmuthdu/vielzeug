import type { ReconnectOptions } from './types';

import { defaultReconnectDelay, sleep } from './utils';

const DEFAULT_MAX_ATTEMPTS = 5;

export type ReconnectHandle = {
  /**
   * Attempt a reconnect. Waits for the computed delay then calls `connect`.
   * Returns `true` if `connect` succeeded, `false` if attempts are exhausted or aborted.
   */
  attempt(connect: () => Promise<void>, signal: AbortSignal, onReconnect?: (attempt: number) => void): Promise<boolean>;
  /** Cancel any pending reconnect attempt and reset the counter. */
  reset(): void;
};

/**
 * Create a stateful reconnect manager.
 * @internal
 */
export function createReconnect(opts: boolean | ReconnectOptions | undefined): ReconnectHandle {
  if (!opts) {
    return {
      attempt: async () => false,
      reset() {},
    };
  }

  const options: ReconnectOptions = opts === true ? {} : opts;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const delayFn: (attempt: number) => number =
    typeof options.delay === 'function'
      ? options.delay
      : typeof options.delay === 'number'
        ? () => options.delay as number
        : defaultReconnectDelay;

  let attempts = 0;

  return {
    async attempt(
      connect: () => Promise<void>,
      signal: AbortSignal,
      onReconnect?: (attempt: number) => void,
    ): Promise<boolean> {
      if (attempts >= maxAttempts) return false;

      const delay = delayFn(attempts);

      attempts++;
      onReconnect?.(attempts);

      await sleep(delay, signal);

      if (signal.aborted) return false;

      try {
        await connect();

        attempts = 0;

        return true;
      } catch {
        return false;
      }
    },

    reset() {
      attempts = 0;
    },
  };
}
