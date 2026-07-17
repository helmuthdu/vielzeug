import type { ReconnectOptions } from './types';

import { defaultReconnectDelay, sleep } from './_utils';

const DEFAULT_MAX_ATTEMPTS = 5;

export type ReconnectHandle = {
  /**
   * Attempt a reconnect. Waits for the computed delay then calls `connect`.
   * Returns outcome details including success and, when available, the failure reason.
   */
  attempt(
    connect: () => Promise<void>,
    signal: AbortSignal,
    onReconnect?: (attempt: number) => void,
  ): Promise<{ error?: unknown; ok: boolean }>;
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
      attempt: async () => ({ ok: false }),
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
    ): Promise<{ error?: unknown; ok: boolean }> {
      if (attempts >= maxAttempts) return { ok: false };

      const delay = delayFn(attempts);

      attempts++;
      onReconnect?.(attempts);

      await sleep(delay, signal);

      if (signal.aborted) return { ok: false };

      try {
        await connect();

        attempts = 0;

        return { ok: true };
      } catch (error) {
        return { error, ok: false };
      }
    },

    reset() {
      attempts = 0;
    },
  };
}
