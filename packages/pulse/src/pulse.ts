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

import { warn } from './_dev';
import { combineSignals } from './_utils';
import { createWaitPromise } from './_wait';
import { createChannel } from './channel';
import { PulseAbortError, PulseConnectionError, PulseDisposedError, PulseTimeoutError } from './errors';
import { createHeartbeat } from './heartbeat';
import { createPresence } from './presence';
import {
  type InFrame,
  type InPresenceJoinFrame,
  type InPresenceLeaveFrame,
  type InPresenceStateFrame,
  decode,
  encode,
} from './protocol';
import { createReconnect } from './reconnect';

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

  const pendingJoins = new Map<string, Set<() => void>>();
  const pendingLeaves = new Map<string, Set<() => void>>();

  let ws: WebSocket | null = null;
  let disposed = false;
  let intentionalClose = false;

  const pendingOpens: Array<{ reject: (e: Error) => void; resolve: () => void }> = [];

  // Memoized channel cache — same name returns the same object
  const channelCache = new Map<string, PulseChannel<MessageMap, MessageMap>>();

  // Message buffer (null = disabled)
  const bufferCfg = opts.buffer;
  const buffer: string[] | null = bufferCfg ? [] : null;
  const bufferMaxSize: number = typeof bufferCfg === 'object' && bufferCfg !== null ? (bufferCfg.maxSize ?? 50) : 50;

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
    } else if (buffer !== null) {
      if (buffer.length >= bufferMaxSize) buffer.shift();

      buffer.push(frame);
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

      if (buffer && buffer.length > 0) {
        const queued = buffer.splice(0);

        for (const f of queued) ws!.send(f);
      }

      for (const name of channelCache.keys()) {
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

      try {
        handleFrame(frame);
      } catch (err) {
        warn(`Frame handling error: ${String(err)}`);
      }
    };

    ws.onerror = (): void => {
      if (opts.onError) {
        opts.onError(new PulseConnectionError('WebSocket error', url));
      } else {
        warn('WebSocket error — pass onError to observe it (see onClose for recovery logic)');
      }

      const pending = pendingOpens.splice(0);

      for (const p of pending) p.reject(new PulseConnectionError('WebSocket error', url));
    };

    ws.onclose = (ev: CloseEvent): void => {
      heartbeat.stop();
      opts.onClose?.(ev.code, ev.reason);

      const pending = pendingOpens.splice(0);

      for (const p of pending) p.reject(new PulseConnectionError('Connection closed before open', url));

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

      default: {
        const unrecognized: { type: unknown } = frame;

        warn(`Received frame with an unrecognized type: ${String(unrecognized.type)}`);

        break;
      }
    }
  }

  // ── Shared room confirmation helper ───────────────────────────────────────

  function awaitRoomConfirmation(
    pending: Map<string, Set<() => void>>,
    room: string,
    frameType: 'join' | 'leave',
    roomOpts?: { signal?: AbortSignal; timeout?: number },
  ): Promise<void> {
    if (disposed) return Promise.reject(new PulseDisposedError());

    return new Promise((resolve, reject) => {
      const extraSignals: AbortSignal[] = [];

      if (roomOpts?.signal) extraSignals.push(roomOpts.signal);

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (roomOpts?.timeout !== undefined) {
        const tc = new AbortController();

        timeoutId = setTimeout(() => tc.abort(new PulseTimeoutError(frameType)), roomOpts.timeout);
        extraSignals.push(tc.signal);
      }

      const sig =
        extraSignals.length === 0 ? disposalCtrl.signal : combineSignals(disposalCtrl.signal, ...extraSignals);

      if (sig.aborted) {
        clearTimeout(timeoutId);
        reject(sig.reason instanceof PulseTimeoutError ? sig.reason : new PulseAbortError());

        return;
      }

      let onAbort: () => void = () => {};

      const onConfirm = (): void => {
        clearTimeout(timeoutId);
        sig.removeEventListener('abort', onAbort);
        resolve();
      };

      onAbort = (): void => {
        clearTimeout(timeoutId);

        const set = pending.get(room);

        set?.delete(onConfirm);

        if (set?.size === 0) pending.delete(room);

        reject(sig.reason instanceof PulseTimeoutError ? sig.reason : new PulseAbortError());
      };

      let pendingSet = pending.get(room);

      if (!pendingSet) {
        pendingSet = new Set();
        pending.set(room, pendingSet);
      }

      pendingSet.add(onConfirm);
      sig.addEventListener('abort', onAbort, { once: true });

      const sendFrame = (): void => rawSend(encode({ room, type: frameType }));

      if (ws?.readyState === WebSocket.OPEN) {
        sendFrame();
      } else {
        pulse
          .connect()
          .then(sendFrame)
          .catch((err: unknown) => {
            clearTimeout(timeoutId);
            sig.removeEventListener('abort', onAbort);

            const set = pending.get(room);

            set?.delete(onConfirm);

            if (set?.size === 0) pending.delete(room);

            reject(err);
          });
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const pulse: Pulse<TServer, TClient> = {
    channel<TChServer extends MessageMap = TServer, TChClient extends MessageMap = TClient>(
      name: string,
    ): PulseChannel<TChServer, TChClient> {
      const cached = channelCache.get(name);

      if (cached) return cached as PulseChannel<TChServer, TChClient>;

      if (disposed) {
        warn(`channel('${name}') called on a disposed Pulse — returning an already-disposed channel`);
      }

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
          channelCache.delete(name);
          rawSend(encode({ channel: name, type: 'unsubscribe' }));
        },
      );

      if (!disposed) channelCache.set(name, ch as PulseChannel<MessageMap, MessageMap>);

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(encode({ channel: name, type: 'subscribe' }));
      }

      return ch;
    },

    connect(): Promise<void> {
      if (disposed) return Promise.reject(new PulseDisposedError());

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

      for (const p of pending) p.reject(new PulseDisposedError());

      channelCache.clear();
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

    join(room: string, roomOpts?: { signal?: AbortSignal; timeout?: number }): Promise<void> {
      return awaitRoomConfirmation(pendingJoins, room, 'join', roomOpts);
    },

    leave(room: string, roomOpts?: { signal?: AbortSignal; timeout?: number }): Promise<void> {
      return awaitRoomConfirmation(pendingLeaves, room, 'leave', roomOpts);
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
        {
          onJoin: (handler) => listeners.add(null, 'presence_join', (p) => handler(p as InPresenceJoinFrame)),
          onLeave: (handler) => listeners.add(null, 'presence_leave', (p) => handler(p as InPresenceLeaveFrame)),
          onState: (handler) => listeners.add(null, 'presence_state', (p) => handler(p as InPresenceStateFrame)),
        },
        disposalCtrl.signal,
      );

      if (disposed) {
        warn(`presence('${room}') called on a disposed Pulse — returning an already-disposed presence channel`);
      } else {
        pulse.join(room).catch((err: unknown) => {
          warn(`presence() join failed for room '${room}': ${String(err)}`);
        });
      }

      return ch;
    },

    get rooms() {
      return rooms;
    },

    send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void {
      if (disposed) {
        warn(`send('${String(event)}') called on a disposed Pulse — message dropped`);

        return;
      }

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

  if (!opts.lazy) openSocket();

  return pulse;
}
