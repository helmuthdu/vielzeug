import { createPulse } from '@vielzeug/pulse';
import { MockWebSocket } from '@vielzeug/pulse/testing';
import type { Readable } from '@vielzeug/ripple';
import { computed, fromSubscribable } from '@vielzeug/ripple';

export interface PresenceShopper {
  name: string;
}

type Schema = {
  rooms: {
    showroom: { presence: PresenceShopper };
  };
};

/**
 * A scripted mock WebSocket simulating other shoppers browsing the showroom concurrently.
 * Installed as `globalThis.WebSocket` before `createPulse()` runs so pulse's internal
 * `new WebSocket(url, protocols)` picks it up. The wire-protocol stub comes from
 * `@vielzeug/pulse/testing`; this class only adds the scripted presence frames. Wire protocol
 * matches pulse's `InFrame` shapes: `presence_state` (snapshot), `presence_join`, `presence_leave`.
 */
class ScriptedWebSocket extends MockWebSocket {
  #thirdShopperPresent = false;
  #timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, protocols?: string | string[]) {
    super(url, protocols, { autoOpen: true });
    setTimeout(() => {
      this.receive({ room: 'showroom', type: 'joined' });
      this.receive({
        members: { 'shopper-jana': { name: 'Jana' }, 'shopper-tom': { name: 'Tom' } },
        room: 'showroom',
        type: 'presence_state',
      });
    }, 50);
    this.#scheduleNextActivity();
  }

  override close(code?: number, reason?: string): void {
    if (this.#timeout !== null) {
      clearTimeout(this.#timeout);
      this.#timeout = null;
    }
    super.close(code, reason);
  }

  /** Jittered 4–15s re-schedule (not a fixed `setInterval`) — a metronomically exact cadence is
   * the tell that gives away a scripted "N shoppers configuring" presence count; a randomized
   * gap reads as organic activity instead. */
  #scheduleNextActivity(): void {
    const jitterMs = 4000 + Math.random() * 11000;

    this.#timeout = setTimeout(() => {
      this.#simulateActivity();
      this.#scheduleNextActivity();
    }, jitterMs);
  }

  #simulateActivity(): void {
    if (this.#thirdShopperPresent) {
      this.receive({ id: 'shopper-noor', room: 'showroom', type: 'presence_leave' });
      this.#thirdShopperPresent = false;
    } else {
      this.receive({ id: 'shopper-noor', room: 'showroom', state: { name: 'Noor' }, type: 'presence_join' });
      this.#thirdShopperPresent = true;
    }
  }
}

const EMPTY_MAP: ReadonlyMap<string, PresenceShopper> = new Map();

let _presenceBinding: Readable<ReadonlyMap<string, PresenceShopper>> | null = null;

/** `memberId → PresenceShopper` for the global 'showroom' room; empty until `setupRealtime()` runs. */
export const presenceSignal = {
  get value(): ReadonlyMap<string, PresenceShopper> {
    return _presenceBinding ? _presenceBinding.value : EMPTY_MAP;
  },
} as const;

export const presenceCount = computed(() => presenceSignal.value.size);

/** Install the mock WebSocket, connect Pulse, and wire up the reactive presence signal. Call once at startup. */
export function setupRealtime(): void {
  (globalThis as Record<string, unknown>).WebSocket = ScriptedWebSocket;

  const pulse = createPulse<Schema>('wss://argentum-motors-demo/ws');

  void pulse.connect().catch(console.error);

  const showroom = pulse.room('showroom');

  // Bridge Pulse's framework-neutral presence store into the Ripple graph.
  _presenceBinding = fromSubscribable(showroom.presence);
}
