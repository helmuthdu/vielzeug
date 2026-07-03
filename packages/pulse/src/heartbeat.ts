import type { HeartbeatOptions } from './types';

import { warn } from './_dev';
import { encode } from './protocol';

const DEFAULT_INTERVAL = 30_000;
const DEFAULT_TIMEOUT = 5_000;

export type HeartbeatHandle = {
  /** Called when a `pong` frame is received. Resets the timeout timer. */
  onPong(): void;
  /** Start the heartbeat loop. */
  start(): void;
  /** Stop the heartbeat loop and cancel any pending timers. */
  stop(): void;
};

/**
 * Create a heartbeat manager that sends periodic pings and expects pong replies.
 * Calls `onDead` when a pong is not received within the timeout window.
 * @internal
 */
export function createHeartbeat(
  opts: boolean | HeartbeatOptions | undefined,
  send: (frame: string) => void,
  onDead: () => void,
): HeartbeatHandle {
  if (!opts) {
    return { onPong() {}, start() {}, stop() {} };
  }

  const options: HeartbeatOptions = opts === true ? {} : opts;
  const interval = options.interval ?? DEFAULT_INTERVAL;
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  let pingTimer: ReturnType<typeof setTimeout> | undefined;
  let pongTimer: ReturnType<typeof setTimeout> | undefined;
  let running = false;

  function schedulePing(): void {
    pingTimer = setTimeout(() => {
      const ts = Date.now();

      send(encode({ ts, type: 'ping' }));

      pongTimer = setTimeout(() => {
        warn(`Heartbeat timed out after ${timeout}ms — treating connection as dead`);
        onDead();
      }, timeout);
    }, interval);
  }

  return {
    onPong() {
      clearTimeout(pongTimer);
      pongTimer = undefined;

      if (running) schedulePing();
    },

    start() {
      running = true;
      schedulePing();
    },

    stop() {
      running = false;
      clearTimeout(pingTimer);
      clearTimeout(pongTimer);
      pingTimer = undefined;
      pongTimer = undefined;
    },
  };
}
