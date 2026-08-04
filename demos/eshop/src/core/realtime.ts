import { fromPresence } from '@vielzeug/flux/pulse';
import { toSignal } from '@vielzeug/flux/ripple';
import { createPulse } from '@vielzeug/pulse';
import { computed } from '@vielzeug/ripple';

export interface PresenceShopper {
  name: string;
}

/**
 * A scripted mock WebSocket simulating other shoppers browsing the showroom concurrently.
 * Installed as `globalThis.WebSocket` before `createPulse()` runs so pulse's internal
 * `new WebSocket(url, protocols)` picks it up — same technique as
 * demos/kanban/src/core/realtime.ts's `MockWebSocket`. Wire protocol matches pulse's `InFrame`
 * shapes: `presence_state` (snapshot), `presence_join`, `presence_leave`.
 */
class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static CONNECTING = 0;

  readyState = 1;

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  private _timeout: ReturnType<typeof setTimeout> | null = null;
  private _thirdShopperPresent = false;

  constructor(_url: string, _protocols?: string | string[]) {
    setTimeout(() => this.onopen?.(new Event('open')), 0);
    setTimeout(() => this._sendPresenceState(), 50);
    this._scheduleNextActivity();
  }

  send(_data: string): void {}

  close(_code?: number, _reason?: string): void {
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  /** Jittered 4–15s re-schedule (not a fixed `setInterval`) — a metronomically exact cadence is
   * the tell that gives away a scripted "N shoppers configuring" presence count; a randomized
   * gap reads as organic activity instead. */
  private _scheduleNextActivity(): void {
    const jitterMs = 4000 + Math.random() * 11000;

    this._timeout = setTimeout(() => {
      this._simulateActivity();
      this._scheduleNextActivity();
    }, jitterMs);
  }

  private _emit(frame: object): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }));
  }

  private _sendPresenceState(): void {
    this._emit({
      members: {
        'shopper-jana': { name: 'Jana' },
        'shopper-tom': { name: 'Tom' },
      },
      room: 'showroom',
      type: 'presence_state',
    });
  }

  private _simulateActivity(): void {
    if (this._thirdShopperPresent) {
      this._emit({ id: 'shopper-noor', room: 'showroom', type: 'presence_leave' });
      this._thirdShopperPresent = false;
    } else {
      this._emit({ id: 'shopper-noor', room: 'showroom', state: { name: 'Noor' }, type: 'presence_join' });
      this._thirdShopperPresent = true;
    }
  }
}

const EMPTY_MAP: ReadonlyMap<string, PresenceShopper> = new Map();

let _presenceBinding: ReturnType<typeof toSignal<ReadonlyMap<string, PresenceShopper>>> | null = null;

/** `memberId → PresenceShopper` for the global 'showroom' room; empty until `setupRealtime()` runs. */
export const presenceSignal = {
  get value(): ReadonlyMap<string, PresenceShopper> {
    return _presenceBinding ? _presenceBinding.value : EMPTY_MAP;
  },
} as const;

export const presenceCount = computed(() => presenceSignal.value.size);

/** Install the mock WebSocket, connect Pulse, and wire up the reactive presence signal. Call once at startup. */
export function setupRealtime(): void {
  (globalThis as Record<string, unknown>).WebSocket = MockWebSocket;

  const pulse = createPulse<Record<string, never>>('wss://argentum-motors-demo/ws');
  const presenceChannel = pulse.presence<PresenceShopper>('showroom');
  const presence$ = fromPresence(presenceChannel);

  _presenceBinding = toSignal(presence$, { initial: new Map<string, PresenceShopper>() });
}
