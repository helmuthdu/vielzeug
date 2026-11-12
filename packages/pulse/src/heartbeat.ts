import { timer } from '@vielzeug/arsenal';
import { encode } from './protocol';
import type { HeartbeatOptions } from './types';

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

  const pongTimer = timer(onDead);
  const pingTimer = timer(() => {
    send(encode({ ts: Date.now(), type: 'ping' }));
    pongTimer.arm(timeout);
  });
  let running = false;

  function schedulePing(): void {
    pingTimer.arm(interval);
  }

  return {
    onPong() {
      pongTimer.cancel();

      if (running) schedulePing();
    },

    start() {
      running = true;
      pongTimer.cancel();
      schedulePing();
    },

    stop() {
      running = false;
      pingTimer.cancel();
      pongTimer.cancel();
    },
  };
}
