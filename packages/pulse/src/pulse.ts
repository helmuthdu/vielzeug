import { signal } from '@vielzeug/ripple';

import type {
  ChannelDefinitions,
  EventKey,
  MessageMap,
  PresenceChannel,
  PresenceDefinitions,
  Pulse,
  PulseChannel,
  PulseOptions,
  PulseStatus,
  Unsubscribe,
} from './types';

import { createConnection } from './_connection';
import { createWaitPromise } from './_wait';
import { createChannel } from './channel';
import {
  PulseAbortError,
  PulseConnectionError,
  PulseDisposedError,
  PulseError,
  PulseProtocolError,
  PulseTimeoutError,
} from './errors';
import { createHeartbeat, type HeartbeatHandle } from './heartbeat';
import { createPresence } from './presence';
import {
  type DecodedInFrame,
  type InPresenceJoinFrame,
  type InPresenceLeaveFrame,
  type InPresenceStateFrame,
  decodeValidated,
  encode,
} from './protocol';

type Handler = (payload: unknown) => void;
type RoomOperation = 'join' | 'leave';
type RoomWaiter = { reject(error: PulseError): void; resolve(): void };
type PendingRoom = { callbacks: Set<RoomWaiter>; next?: PendingRoom; operation: RoomOperation };

class ListenerMap {
  private readonly map = new Map<string | null, Map<string, Set<Handler>>>();

  add(channel: string | null, event: string, handler: Handler): Unsubscribe {
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

  clear(): void {
    this.map.clear();
  }

  dispatch(channel: string | null, event: string, payload: unknown): void {
    for (const handler of this.map.get(channel)?.get(event) ?? []) handler(payload);
  }
}

/**
 * Create a typed, explicitly connected WebSocket client with scoped channels,
 * rooms, presence, reconnect, and heartbeat support.
 */
export function createPulse<
  TServer extends MessageMap = MessageMap,
  TClient extends MessageMap = MessageMap,
  TChannels extends ChannelDefinitions = ChannelDefinitions,
  TPresence extends PresenceDefinitions = PresenceDefinitions,
>(url: string, options: PulseOptions = {}): Pulse<TServer, TClient, TChannels, TPresence> {
  const disposalCtrl = new AbortController();
  const status = signal<PulseStatus>('closed');
  const rooms = signal<ReadonlySet<string>>(new Set());
  const listeners = new ListenerMap();
  const channelReferences = new Map<string, number>();
  const presenceReferences = new Map<string, number>();
  const manualRooms = new Set<string>();
  const localPresence = new Map<string, unknown>();
  const presenceResetters = new Map<string, Set<() => void>>();
  const pendingRooms = new Map<string, PendingRoom>();

  let disposed = false;

  function report(error: PulseError): void {
    options.onError?.(error);
  }

  function sendInternal(frame: string): void {
    connection.send(frame);
  }

  function desiredRoom(room: string): boolean {
    return manualRooms.has(room) || (presenceReferences.get(room) ?? 0) > 0;
  }

  function setRoom(room: string, joined: boolean): void {
    const next = new Set(rooms.value);

    if (joined) next.add(room);
    else next.delete(room);

    rooms.value = next;
  }

  function resetRemoteSession(): void {
    rooms.value = new Set();

    for (const resetters of presenceResetters.values()) {
      for (const reset of resetters) reset();
    }
  }

  function rejectPendingRooms(error: PulseError, reportFailure = true): void {
    let rejected = false;

    for (const [room, firstPending] of pendingRooms) {
      let pending: PendingRoom | undefined = firstPending;

      while (pending) {
        if (pending.operation === 'join') manualRooms.delete(room);

        for (const waiter of pending.callbacks) {
          waiter.reject(error);
          rejected = true;
        }

        pending = pending.next;
      }
    }

    pendingRooms.clear();

    if (rejected && reportFailure) report(error);
  }

  function handleTransportClose(): void {
    heartbeat.stop();
    resetRemoteSession();
    rejectPendingRooms(new PulseConnectionError('Connection closed before room confirmation', url));
  }

  function restoreSession(): void {
    for (const channel of channelReferences.keys()) {
      sendInternal(encode({ channel, type: 'subscribe' }));
    }

    for (const room of new Set([...manualRooms, ...presenceReferences.keys()])) {
      if (desiredRoom(room)) sendInternal(encode({ room, type: 'join' }));
    }

    for (const [room, state] of localPresence) {
      if (desiredRoom(room)) sendInternal(encode({ room, state, type: 'presence' }));
    }
  }

  const connection = createConnection(url, options.protocols, options.reconnect, {
    onClose() {
      handleTransportClose();
    },
    onError: report,
    onMessage(event) {
      let decoded: DecodedInFrame;

      try {
        decoded = decodeValidated(event.data);
      } catch (error) {
        report(
          error instanceof PulseProtocolError ? error : new PulseProtocolError('Failed to decode frame', event.data),
        );

        return;
      }

      if (decoded.kind === 'unknown') {
        report(new PulseProtocolError(`Unknown frame type "${decoded.type}"`, event.data));

        return;
      }

      try {
        handleFrame(decoded);
      } catch (error) {
        report(new PulseProtocolError('Frame handler threw', decoded.frame, { cause: error }));
      }
    },
    onOpen() {
      restoreSession();
      heartbeat.start();
    },
    onStatus(nextStatus) {
      status.value = nextStatus;
    },
  });

  const heartbeat: HeartbeatHandle = createHeartbeat(
    options.heartbeat,
    (frame) => {
      if (connection.open) sendInternal(frame);
    },
    () => connection.forceReconnect(4000, 'heartbeat timeout'),
  );

  function resolvePendingRoom(room: string, operation: RoomOperation): void {
    const pending = pendingRooms.get(room);

    if (!pending || pending.operation !== operation) return;

    for (const waiter of pending.callbacks) waiter.resolve();

    const nextPending = pending.next;

    if (!nextPending) {
      pendingRooms.delete(room);

      const followUpOperation =
        operation === 'join' && !desiredRoom(room)
          ? 'leave'
          : operation === 'leave' && desiredRoom(room)
            ? 'join'
            : undefined;

      if (followUpOperation) {
        const followUpPending: PendingRoom = { callbacks: new Set<RoomWaiter>(), operation: followUpOperation };

        pendingRooms.set(room, followUpPending);

        try {
          sendInternal(encode({ room, type: followUpOperation }));
        } catch (error) {
          pendingRooms.delete(room);

          if (followUpOperation === 'join') manualRooms.delete(room);

          report(error instanceof PulseError ? error : new PulseConnectionError('Failed to send room request', url));
        }
      }

      return;
    }

    pendingRooms.set(room, nextPending);

    try {
      sendInternal(encode({ room, type: nextPending.operation }));
    } catch (error) {
      pendingRooms.delete(room);

      if (nextPending.operation === 'join') manualRooms.delete(room);

      for (const waiter of nextPending.callbacks) {
        waiter.reject(
          error instanceof PulseError ? error : new PulseConnectionError('Failed to send room request', url),
        );
      }
    }
  }

  function handleFrame(decoded: Extract<DecodedInFrame, { kind: 'known' }>): void {
    const frame = decoded.frame;

    switch (frame.type) {
      case 'error':
        report(new PulseProtocolError(`Server error [${frame.code}]: ${frame.message}`, frame));

        break;
      case 'joined':
        if (desiredRoom(frame.room)) setRoom(frame.room, true);

        resolvePendingRoom(frame.room, 'join');

        break;
      case 'left':
        setRoom(frame.room, false);
        resolvePendingRoom(frame.room, 'leave');

        break;
      case 'message':
        listeners.dispatch(frame.channel ?? null, frame.event, frame.payload);

        break;
      case 'pong':
        heartbeat.onPong();

        break;
      case 'presence_join':
      case 'presence_leave':
      case 'presence_state':
        listeners.dispatch(null, frame.type, frame);

        break;
      case 'subscribed':
      case 'unsubscribed':
        break;
    }
  }

  function awaitRoom(
    room: string,
    operation: RoomOperation,
    opts?: { signal?: AbortSignal; timeout?: number },
  ): Promise<void> {
    if (disposed) {
      if (operation === 'join') manualRooms.delete(room);

      return Promise.reject(new PulseDisposedError());
    }

    if (!connection.open) {
      if (operation === 'join') manualRooms.delete(room);

      return Promise.reject(new PulseConnectionError('Connection is not open', url));
    }

    const existing = pendingRooms.get(room);

    if (operation === 'join' && rooms.value.has(room) && !existing) return Promise.resolve();

    if (operation === 'leave' && !rooms.value.has(room) && !existing) return Promise.resolve();

    let pending = existing;

    if (pending) {
      while (pending.next) pending = pending.next;

      if (pending.operation !== operation) {
        const nextPending: PendingRoom = { callbacks: new Set<RoomWaiter>(), operation };

        pending.next = nextPending;
        pending = nextPending;
      }
    } else {
      pending = { callbacks: new Set<RoomWaiter>(), operation };
    }

    return new Promise((resolve, reject) => {
      const timeoutCtrl = opts?.timeout === undefined ? undefined : new AbortController();
      const signal =
        opts?.signal && timeoutCtrl
          ? AbortSignal.any([opts.signal, timeoutCtrl.signal])
          : (opts?.signal ?? timeoutCtrl?.signal);
      const timeoutId = opts?.timeout === undefined ? undefined : setTimeout(() => timeoutCtrl?.abort(), opts.timeout);
      const waiter: RoomWaiter = {
        reject(error) {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', rejectRoom);
          reject(error);
        },
        resolve() {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', rejectRoom);
          resolve();
        },
      };
      const rejectRoom = (): void => {
        pending.callbacks.delete(waiter);

        if (pending.callbacks.size === 0 && operation === 'join') manualRooms.delete(room);

        waiter.reject(timeoutCtrl?.signal.aborted ? new PulseTimeoutError(operation) : new PulseAbortError());
      };

      if (signal?.aborted) {
        rejectRoom();

        return;
      }

      pending.callbacks.add(waiter);
      signal?.addEventListener('abort', rejectRoom, { once: true });

      if (existing) return;

      pendingRooms.set(room, pending);

      try {
        sendInternal(encode({ room, type: operation }));
      } catch (error) {
        pending.callbacks.delete(waiter);

        if (pending.callbacks.size === 0) pendingRooms.delete(room);

        waiter.reject(
          error instanceof PulseError ? error : new PulseConnectionError('Failed to send room request', url),
        );
      }
    });
  }

  function acquireChannel(name: string): void {
    const references = channelReferences.get(name) ?? 0;

    channelReferences.set(name, references + 1);

    if (references === 0 && connection.open) sendInternal(encode({ channel: name, type: 'subscribe' }));
  }

  function releaseChannel(name: string): void {
    const references = channelReferences.get(name);

    if (!references) return;

    if (references > 1) {
      channelReferences.set(name, references - 1);

      return;
    }

    channelReferences.delete(name);

    if (connection.open) sendInternal(encode({ channel: name, type: 'unsubscribe' }));
  }

  function acquirePresence(room: string, reset: () => void): void {
    const references = presenceReferences.get(room) ?? 0;
    const resetters = presenceResetters.get(room) ?? new Set<() => void>();

    resetters.add(reset);
    presenceResetters.set(room, resetters);
    presenceReferences.set(room, references + 1);

    if (references === 0 && connection.open) sendInternal(encode({ room, type: 'join' }));
  }

  function releasePresence(room: string, reset: () => void): void {
    presenceResetters.get(room)?.delete(reset);

    if (presenceResetters.get(room)?.size === 0) presenceResetters.delete(room);

    const references = presenceReferences.get(room);

    if (!references) return;

    if (references > 1) {
      presenceReferences.set(room, references - 1);

      return;
    }

    presenceReferences.delete(room);
    localPresence.delete(room);

    if (!manualRooms.has(room) && connection.open) sendInternal(encode({ room, type: 'leave' }));
  }

  const pulse: Pulse<TServer, TClient, TChannels, TPresence> = {
    channel<K extends keyof TChannels & string>(name: K): PulseChannel<TChannels[K]['server'], TChannels[K]['client']> {
      if (disposed) throw new PulseDisposedError();

      acquireChannel(name);

      return createChannel<TChannels[K]['server'], TChannels[K]['client']>(
        name,
        (channel, event, payload) => {
          const transformed = options.transform
            ? options.transform({ channel, event, payload })
            : { channel, event, payload };

          if (transformed === null) return;

          sendInternal(encode({ ...transformed, type: 'message' }));
        },
        (channel, event, handler) => listeners.add(channel, event, handler),
        disposalCtrl.signal,
        () => releaseChannel(name),
      );
    },

    connect(): Promise<void> {
      if (disposed) return Promise.reject(new PulseDisposedError());

      return connection.connect();
    },

    disconnect(code = 1000, reason = ''): void {
      if (disposed) return;

      handleTransportClose();
      connection.disconnect(code, reason);
    },

    get disposalSignal() {
      return disposalCtrl.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      heartbeat.stop();
      resetRemoteSession();
      rejectPendingRooms(new PulseDisposedError(), false);
      connection.dispose();
      channelReferences.clear();
      presenceReferences.clear();
      manualRooms.clear();
      localPresence.clear();
      presenceResetters.clear();
      pendingRooms.clear();
      listeners.clear();
      disposalCtrl.abort();
    },

    get disposed() {
      return disposed;
    },

    join(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void> {
      manualRooms.add(room);

      return awaitRoom(room, 'join', opts);
    },

    leave(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void> {
      manualRooms.delete(room);

      if (desiredRoom(room)) return Promise.resolve();

      return awaitRoom(room, 'leave', opts);
    },

    on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe {
      if (disposed) throw new PulseDisposedError();

      return listeners.add(null, event, handler as Handler);
    },

    once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe {
      if (disposed) throw new PulseDisposedError();

      let unsubscribe: Unsubscribe = () => {};

      unsubscribe = listeners.add(null, event, (payload) => {
        unsubscribe();
        (handler as Handler)(payload);
      });

      return unsubscribe;
    },

    presence<K extends keyof TPresence & string>(room: K): PresenceChannel<TPresence[K]> {
      if (disposed) throw new PulseDisposedError();

      let reset: (() => void) | undefined;

      const presence = createPresence<TPresence[K]>(
        room,
        (presenceRoom, state) => {
          sendInternal(encode({ room: presenceRoom, state, type: 'presence' }));
          localPresence.set(presenceRoom, state);
        },
        {
          onJoin: (handler) => listeners.add(null, 'presence_join', (value) => handler(value as InPresenceJoinFrame)),
          onLeave: (handler) =>
            listeners.add(null, 'presence_leave', (value) => handler(value as InPresenceLeaveFrame)),
          onState: (handler) =>
            listeners.add(null, 'presence_state', (value) => handler(value as InPresenceStateFrame)),
        },
        disposalCtrl.signal,
        (createdReset) => {
          reset = createdReset;
        },
        () => release(),
      );

      const resetPresence = reset;

      if (!resetPresence) throw new Error('Presence reset callback was not initialized');

      const release = () => releasePresence(room, resetPresence);

      acquirePresence(room, resetPresence);

      return presence;
    },

    get rooms() {
      return rooms;
    },

    send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void {
      if (disposed) throw new PulseDisposedError();

      const transformed = options.transform ? options.transform({ event, payload }) : { event, payload };

      if (transformed === null) return;

      sendInternal(encode({ ...transformed, type: 'message' }));
    },

    get status() {
      return status;
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    wait<K extends EventKey<TServer>>(
      event: K,
      opts?: { signal?: AbortSignal; timeout?: number },
    ): Promise<TServer[K]> {
      return createWaitPromise<TServer[K]>(event, disposalCtrl.signal, opts, (waitEvent, handler) =>
        listeners.add(null, waitEvent, handler),
      );
    },
  };

  return pulse;
}
