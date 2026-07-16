import { fromPresence, toSignal } from '@vielzeug/flux';
import { createPulse } from '@vielzeug/pulse';
import { computed } from '@vielzeug/ripple';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresenceUser {
  name: string;
}

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

/**
 * A scripted mock WebSocket that simulates 2 users viewing the board.
 * Installed as globalThis.WebSocket before createPulse() is called so that
 * pulse's internal `new WebSocket(url, protocols)` call picks it up.
 *
 * Wire protocol matches pulse's InFrame shapes from protocol.ts:
 *   presence_state  — full snapshot of current members
 *   presence_join   — a member joined
 *   presence_leave  — a member left
 */
class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static CONNECTING = 0;

  readyState = 1; // always OPEN — the mock is never "connecting"

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  private _interval: ReturnType<typeof setInterval> | null = null;
  private _charliePresent = false;

  constructor(_url: string, _protocols?: string | string[]) {
    // Fire onopen on the next tick so pulse has time to assign the handlers.
    setTimeout(() => this.onopen?.(new Event('open')), 0);

    // After open, send the initial presence snapshot.
    setTimeout(() => this._sendPresenceState(), 50);

    // Every 5 s, toggle a third user (Charlie) to demonstrate live presence.
    this._interval = setInterval(() => this._simulateActivity(), 5000);
  }

  /** Pulse sends outgoing frames here; the mock ignores them. */
  send(_data: string): void {}

  close(_code?: number, _reason?: string): void {
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _emit(frame: object): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }));
  }

  /** Send the full presence snapshot (presence_state). */
  private _sendPresenceState(): void {
    this._emit({
      members: {
        'user-alice': { name: 'Alice' },
        'user-bob': { name: 'Bob' },
      },
      room: 'board',
      type: 'presence_state',
    });
  }

  /** Toggle Charlie's presence every 5 s to simulate live activity. */
  private _simulateActivity(): void {
    if (this._charliePresent) {
      this._emit({ id: 'user-charlie', room: 'board', type: 'presence_leave' });
      this._charliePresent = false;
    } else {
      this._emit({
        id: 'user-charlie',
        room: 'board',
        state: { name: 'Charlie' },
        type: 'presence_join',
      });
      this._charliePresent = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Reactive presence — module-level singletons created by setupRealtime()
// ---------------------------------------------------------------------------

// Sentinel empty map used before setupRealtime() is called.
const EMPTY_MAP: ReadonlyMap<string, PresenceUser> = new Map();

// The toSignal binding; kept so callers can dispose it if needed.
let _presenceBinding: ReturnType<typeof toSignal<ReadonlyMap<string, PresenceUser>>> | null = null;

/**
 * A reactive signal of `memberId → PresenceUser` for the 'board' room.
 * Populated after `setupRealtime()` is called; holds an empty Map before that.
 */
export const presenceSignal = {
  get value(): ReadonlyMap<string, PresenceUser> {
    return _presenceBinding ? _presenceBinding.value : EMPTY_MAP;
  },
} as const;

/**
 * Reactive count of users currently viewing the board.
 * Derived from `presenceSignal` via ripple `computed()`.
 */
export const presenceCount = computed(() => presenceSignal.value.size);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Install the mock WebSocket, create a Pulse connection, subscribe to
 * presence on the 'board' room, and wire up the reactive `presenceSignal`.
 *
 * Call once at application startup (e.g. from main.ts).
 */
export function setupRealtime(): void {
  // Replace the real WebSocket with the mock BEFORE createPulse() constructs one.
  (globalThis as Record<string, unknown>).WebSocket = MockWebSocket;

  const pulse = createPulse<Record<string, never>>('wss://kanban-demo/ws');

  const presenceChannel = pulse.presence<PresenceUser>('board');

  const presence$ = fromPresence(presenceChannel);

  _presenceBinding = toSignal(presence$, { initial: new Map<string, PresenceUser>() });
}
