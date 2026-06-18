import { signal } from '@vielzeug/ripple';

import type {
  EventKey,
  MessageMap,
  Middleware,
  PresenceChannel,
  Pulse,
  PulseChannel,
  PulseOptions,
  PulseStatus,
  Unsubscribe,
} from './types';

import { createWaitPromise } from './_wait';
import { warn } from './_warn';
import { createChannel } from './channel';
import { AbortError, ConnectionError, DisposedError } from './errors';
import { createHeartbeat } from './heartbeat';
import { createPresence } from './presence';
import { type InFrame, decode, encode } from './protocol';
import { createReconnect } from './reconnect';
import { combineSignals } from './utils';

// ─── Internal routing map ─────────────────────────────────────────────────────

type Handler = (payload: unknown) => void;

/**
 * A two-level listener map: channel (null = root) → event → Set<handler>.
 * @internal
 */
class ListenerMap {
  private readonly map = new Map<string | null, Map<string, Set<Handler>>>();

  add(channel: string | null, event: string, handler: Handler): () => void {
    let events = this.map.get(channel);

    if (!events) {
      events = new Map();
      this.map.set(channel, events);
    }

    let handlers = events.get(event);

    if (!handlers) {
      handlers = new Set();
      events.set(event, handlers);
    }

    handlers.add(handler);

    return () => {
      handlers.delete(handler);

      if (handlers.size === 0) events.delete(event);

      if (events.size === 0) this.map.delete(channel);
    };
  }

  dispatch(channel: string | null, event: string, payload: unknown): void {
    this.map
      .get(channel)
      ?.get(event)
      ?.forEach((h) => h(payload));
  }

  clear(): void {
    this.map.clear();
  }
}

// ─── createPulse ──────────────────────────────────────────────────────────────

/**
 * Create a managed WebSocket connection with typed messaging, channels,
 * rooms, and presence.
 *
 * @example
 * ```ts
 * const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
 *   reconnect: true,
 *   heartbeat: true,
 * });
 * pulse.on('message', (data) => console.log(data));
 * ```
 */
export function createPulse<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap>(
  url: string,
  opts: PulseOptions = {},
): Pulse<TServer, TClient> {
  // ── State ──────────────────────────────────────────────────────────────────

  const disposalCtrl = new AbortController();
  const status = signal<PulseStatus>('connecting');
  const rooms = signal<ReadonlySet<string>>(new Set());
  const listeners = new ListenerMap();
  const middleware: readonly Middleware[] = opts.middleware ?? [];

  // Private one-shot resolver sets for room join/leave confirmations.
  const pendingJoins = new Map<string, Set<() => void>>();
  const pendingLeaves = new Map<string, Set<() => void>>();

  let ws: WebSocket | null = null;
  let disposed = false;
  let intentionalClose = false;

  const pendingOpens: Array<{ reject: (e: Error) => void; resolve: () => void }> = [];
  const activeChannels = new Map<string, number>();

  // ── Reconnect / Heartbeat ──────────────────────────────────────────────────

  const reconnect = createReconnect(opts.reconnect);

  const heartbeat = createHeartbeat(
    opts.heartbeat,
    (frame) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(frame);
    },
    () => {
      warn('Heartbeat dead — closing socket for reconnect');
      ws?.close(4000, 'heartbeat timeout');
    },
  );

  // ── Raw send helper ────────────────────────────────────────────────────────

  function rawSend(frame: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(frame);
    } else {
      warn(`send() called while connection is ${status.value} — message dropped`);
    }
  }

  // ── Middleware pipeline ────────────────────────────────────────────────────

  function runMiddleware(event: string, payload: unknown, final: () => void): void {
    let idx = 0;

    function next(): void {
      if (idx >= middleware.length) {
        final();

        return;
      }

      const mw = middleware[idx++]!;

      mw(event, payload, next);
    }

    next();
  }

  // ── WebSocket lifecycle ────────────────────────────────────────────────────

  function openSocket(): void {
    if (disposed) return;

    ws = new WebSocket(url, opts.protocols);

    ws.onopen = (): void => {
      intentionalClose = false;
      status.value = 'open';
      reconnect.reset();
      heartbeat.start();
      opts.onOpen?.();

      const pending = pendingOpens.splice(0);

      for (const p of pending) p.resolve();

      for (const name of activeChannels.keys()) {
        ws!.send(encode({ channel: name, type: 'subscribe' }));
      }
    };

    ws.onmessage = (ev: MessageEvent): void => {
      opts.onMessage?.(ev);

      let frame: InFrame;

      try {
        frame = decode(ev.data);
      } catch (err) {
        warn(`Protocol error: ${String(err)}`);

        return;
      }

      handleFrame(frame);
    };

    ws.onerror = (): void => {
      opts.onError?.(new ConnectionError('WebSocket error', url));

      const pending = pendingOpens.splice(0);

      for (const p of pending) p.reject(new ConnectionError('WebSocket error', url));
    };

    ws.onclose = (ev: CloseEvent): void => {
      heartbeat.stop();
      opts.onClose?.(ev.code, ev.reason);

      const pending = pendingOpens.splice(0);

      for (const p of pending) p.reject(new ConnectionError('Connection closed before open', url));

      if (intentionalClose || disposed) {
        status.value = 'closed';

        return;
      }

      handleUnexpectedClose();
    };
  }

  async function handleUnexpectedClose(): Promise<void> {
    status.value = 'reconnecting';

    const ok = await reconnect.attempt(
      () =>
        new Promise<void>((resolve, reject) => {
          pendingOpens.push({ reject, resolve });
          openSocket();
        }),
      disposalCtrl.signal,
      opts.onReconnect,
    );

    if (!ok && !disposed) {
      warn('Reconnect budget exhausted — connection permanently closed');
      status.value = 'closed';
    }
  }

  // ── Frame routing ──────────────────────────────────────────────────────────

  function handleFrame(frame: InFrame): void {
    switch (frame.type) {
      case 'error':
        warn(`Server error [${frame.code}]: ${frame.message}`);

        break;

      case 'joined': {
        const next = new Set(rooms.value);

        next.add(frame.room);
        rooms.value = next;

        const joinCbs = pendingJoins.get(frame.room);

        if (joinCbs) {
          pendingJoins.delete(frame.room);

          for (const cb of joinCbs) cb();
        }

        break;
      }

      case 'left': {
        const next = new Set(rooms.value);

        next.delete(frame.room);
        rooms.value = next;

        const leaveCbs = pendingLeaves.get(frame.room);

        if (leaveCbs) {
          pendingLeaves.delete(frame.room);

          for (const cb of leaveCbs) cb();
        }

        break;
      }

      case 'message':
        listeners.dispatch(frame.channel ?? null, frame.event, frame.payload);

        break;

      case 'pong':
        heartbeat.onPong();

        break;

      case 'presence_join':
        listeners.dispatch(null, frame.type, frame);

        break;

      case 'presence_leave':
        listeners.dispatch(null, frame.type, frame);

        break;

      case 'presence_state':
        listeners.dispatch(null, frame.type, frame);

        break;

      case 'subscribed':
      case 'unsubscribed':
        break;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const pulse: Pulse<TServer, TClient> = {
    channel<TChServer extends MessageMap = TServer, TChClient extends MessageMap = TClient>(
      name: string,
    ): PulseChannel<TChServer, TChClient> {
      activeChannels.set(name, (activeChannels.get(name) ?? 0) + 1);

      const ch = createChannel<TChServer, TChClient>(
        name,
        (chan, event, payload) => {
          runMiddleware(event, payload, () => {
            rawSend(encode({ channel: chan, event, payload, type: 'message' }));
          });
        },
        (chan, event, handler) => listeners.add(chan, event, handler),
        disposalCtrl.signal,
        () => {
          const count = (activeChannels.get(name) ?? 1) - 1;

          if (count <= 0) {
            activeChannels.delete(name);
            rawSend(encode({ channel: name, type: 'unsubscribe' }));
          } else {
            activeChannels.set(name, count);
          }
        },
      );

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(encode({ channel: name, type: 'subscribe' }));
      }

      return ch;
    },

    connect(): Promise<void> {
      if (disposed) return Promise.reject(new DisposedError());

      if (ws?.readyState === WebSocket.OPEN) return Promise.resolve();

      return new Promise((resolve, reject) => {
        pendingOpens.push({ reject, resolve });

        if (!ws || ws.readyState > WebSocket.OPEN) openSocket();
      });
    },

    disconnect(code = 1000, reason = ''): void {
      intentionalClose = true;
      ws?.close(code, reason);
    },

    get disposalSignal() {
      return disposalCtrl.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      intentionalClose = true;
      heartbeat.stop();
      ws?.close(1000, 'disposed');
      ws = null;

      const pending = pendingOpens.splice(0);

      for (const p of pending) p.reject(new DisposedError());

      activeChannels.clear();
      pendingJoins.clear();
      pendingLeaves.clear();
      status.dispose();
      rooms.dispose();
      listeners.clear();
      disposalCtrl.abort();
    },

    get disposed() {
      return disposed;
    },

    join(room: string, roomOpts?: { signal?: AbortSignal }): Promise<void> {
      if (disposed) return Promise.reject(new DisposedError());

      return new Promise((resolve, reject) => {
        const sig = roomOpts?.signal ? combineSignals(disposalCtrl.signal, roomOpts.signal) : disposalCtrl.signal;

        if (sig.aborted) {
          reject(new AbortError());

          return;
        }

        let registered = false;
        let onAbort: () => void = () => {};

        const onConfirm = (): void => {
          sig.removeEventListener('abort', onAbort);
          resolve();
        };

        onAbort = (): void => {
          if (registered) {
            const set = pendingJoins.get(room);

            set?.delete(onConfirm);

            if (set?.size === 0) pendingJoins.delete(room);
          }

          reject(new AbortError());
        };

        let joinSet = pendingJoins.get(room);

        if (!joinSet) {
          joinSet = new Set();
          pendingJoins.set(room, joinSet);
        }

        joinSet.add(onConfirm);
        registered = true;
        sig.addEventListener('abort', onAbort, { once: true });

        if (ws?.readyState === WebSocket.OPEN) {
          rawSend(encode({ room, type: 'join' }));
        } else {
          pulse
            .connect()
            .then(() => rawSend(encode({ room, type: 'join' })))
            .catch((err: unknown) => {
              sig.removeEventListener('abort', onAbort);

              if (registered) {
                const set = pendingJoins.get(room);

                set?.delete(onConfirm);

                if (set?.size === 0) pendingJoins.delete(room);
              }

              reject(err);
            });
        }
      });
    },

    leave(room: string, roomOpts?: { signal?: AbortSignal }): Promise<void> {
      if (disposed) return Promise.reject(new DisposedError());

      return new Promise((resolve, reject) => {
        const sig = roomOpts?.signal ? combineSignals(disposalCtrl.signal, roomOpts.signal) : disposalCtrl.signal;

        if (sig.aborted) {
          reject(new AbortError());

          return;
        }

        let registered = false;
        let onAbort: () => void = () => {};

        const onConfirm = (): void => {
          sig.removeEventListener('abort', onAbort);
          resolve();
        };

        onAbort = (): void => {
          if (registered) {
            const set = pendingLeaves.get(room);

            set?.delete(onConfirm);

            if (set?.size === 0) pendingLeaves.delete(room);
          }

          reject(new AbortError());
        };

        let leaveSet = pendingLeaves.get(room);

        if (!leaveSet) {
          leaveSet = new Set();
          pendingLeaves.set(room, leaveSet);
        }

        leaveSet.add(onConfirm);
        registered = true;
        sig.addEventListener('abort', onAbort, { once: true });

        if (ws?.readyState === WebSocket.OPEN) {
          rawSend(encode({ room, type: 'leave' }));
        } else {
          pulse
            .connect()
            .then(() => rawSend(encode({ room, type: 'leave' })))
            .catch((err: unknown) => {
              sig.removeEventListener('abort', onAbort);

              if (registered) {
                const set = pendingLeaves.get(room);

                set?.delete(onConfirm);

                if (set?.size === 0) pendingLeaves.delete(room);
              }

              reject(err);
            });
        }
      });
    },

    on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe {
      if (disposed) {
        warn(`on('${String(event)}') called on a disposed Pulse — listener ignored`);

        return () => {};
      }

      return listeners.add(null, event, handler as Handler);
    },

    once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe {
      if (disposed) {
        warn(`once('${String(event)}') called on a disposed Pulse — listener ignored`);

        return () => {};
      }

      let unsub: Unsubscribe = () => {};

      const wrapped: Handler = (payload) => {
        unsub();
        (handler as Handler)(payload);
      };

      unsub = listeners.add(null, event, wrapped);

      return unsub;
    },

    presence<T>(room: string): PresenceChannel<T> {
      const ch = createPresence<T>(
        room,
        rawSend,
        (chan, event, handler) => listeners.add(chan, event, handler),
        disposalCtrl.signal,
      );

      pulse.join(room).catch((err: unknown) => {
        warn(`presence() join failed for room '${room}': ${String(err)}`);
      });

      return ch;
    },

    get rooms() {
      return rooms;
    },

    send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void {
      if (disposed) return;

      runMiddleware(event, payload, () => {
        rawSend(encode({ event, payload, type: 'message' }));
      });
    },

    get status() {
      return status;
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    wait<K extends EventKey<TServer>>(
      event: K,
      waitOpts?: { signal?: AbortSignal; timeout?: number },
    ): Promise<TServer[K]> {
      return createWaitPromise<TServer[K]>(event as string, disposalCtrl.signal, waitOpts, (ev, handler) =>
        listeners.add(null, ev, handler),
      );
    },
  };

  openSocket();

  return pulse;
}
