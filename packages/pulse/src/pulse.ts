import { createConnection } from './_connection';
import { createStore } from './_store';
import { createWaitPromise } from './_wait';
import { createChannel } from './channel';
import { PulseConnectionError, PulseDisposedError, PulseError, PulseProtocolError } from './errors';
import { createHeartbeat, type HeartbeatHandle } from './heartbeat';
import { type DecodedInFrame, decodeValidated, encode } from './protocol';
import { createRoomRegistry, type RoomRegistry } from './room';
import type {
  ChannelMap,
  ClientEvents,
  EventKey,
  Pulse,
  PulseEvent,
  PulseOptions,
  PulseSchema,
  PulseStatus,
  RoomMap,
  RoomOptions,
  RoomScope,
  ServerEvents,
  Unsubscribe,
} from './types';

type Handler = (payload: unknown) => void;

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
export function createPulse<S extends PulseSchema = PulseSchema>(url: string, options: PulseOptions = {}): Pulse<S> {
  const disposalCtrl = new AbortController();
  const listeners = new ListenerMap();
  const channelReferences = new Map<string, number>();
  const tappers = new Set<(event: PulseEvent) => void>();

  let disposed = false;
  let transportClosed = true;
  let lastStatus: PulseStatus = 'closed';

  function emitTap(event: PulseEvent): void {
    if (tappers.size === 0) return;
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect pulse behavior.
      }
    }
  }

  function report(error: PulseError): void {
    emitTap({ error, type: 'error' });
  }

  const reportStoreError = (cause: unknown): void =>
    report(new PulseError('External store subscriber threw', { cause }));
  const status = createStore<PulseStatus>('closed', reportStoreError);

  function sendInternal(frame: string): void {
    connection.send(frame);
  }

  const rooms: RoomRegistry = createRoomRegistry({
    disposalSignal: disposalCtrl.signal,
    isOpen: () => connection.open,
    onStoreError: reportStoreError,
    send: sendInternal,
  });

  function restoreSession(): void {
    for (const channel of channelReferences.keys()) {
      sendInternal(encode({ channel, type: 'subscribe' }));
    }
    rooms.restore();
  }

  function resetRemoteSession(): void {
    rooms.reset();
  }

  function handleTransportClose(): void {
    if (transportClosed) return;
    transportClosed = true;
    heartbeat.stop();
    resetRemoteSession();
    rooms.rejectAll(new PulseConnectionError('Connection closed before room confirmation', url));
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
      transportClosed = false;
      try {
        restoreSession();
        heartbeat.start();
      } catch (error) {
        report(error instanceof PulseError ? error : new PulseConnectionError('Session restore failed', url));
      }
    },
    onStatus(nextStatus) {
      status.set(nextStatus);
      if (nextStatus !== lastStatus) {
        lastStatus = nextStatus;
        emitTap({ status: nextStatus, type: 'status-change' });
      }
    },
  });

  const heartbeat: HeartbeatHandle = createHeartbeat(
    options.heartbeat,
    (frame) => {
      if (connection.open) sendInternal(frame);
    },
    () => connection.forceReconnect(4000, 'heartbeat timeout'),
  );

  function handleFrame(decoded: Extract<DecodedInFrame, { kind: 'known' }>): void {
    const frame = decoded.frame;

    switch (frame.type) {
      case 'error':
        report(new PulseProtocolError(`Server error [${frame.code}]: ${frame.message}`, frame));
        break;
      case 'joined':
        rooms.handleJoined(frame.room);
        break;
      case 'left':
        rooms.handleLeft(frame.room);
        break;
      case 'message':
        listeners.dispatch(frame.channel ?? null, frame.event, frame.payload);
        break;
      case 'pong':
        heartbeat.onPong();
        break;
      case 'presence_join':
        rooms.handlePresenceJoin(frame.room, frame.id, frame.state);
        break;
      case 'presence_leave':
        rooms.handlePresenceLeave(frame.room, frame.id);
        break;
      case 'presence_state':
        rooms.handlePresenceState(frame.room, frame.members);
        break;
      case 'subscribed':
      case 'unsubscribed':
        break;
    }
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

  const pulse: Pulse<S> = {
    channel<K extends keyof ChannelMap<S> & string>(name: K) {
      if (disposed) throw new PulseDisposedError();

      acquireChannel(name);

      return createChannel(
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
      transportClosed = true;
      rooms.reset();
      rooms.rejectAll(new PulseDisposedError());
      connection.dispose();
      channelReferences.clear();
      rooms.dispose();
      listeners.clear();
      emitTap({ type: 'dispose' });
      tappers.clear();
      disposalCtrl.abort();
    },

    get disposed() {
      return disposed;
    },

    on<K extends EventKey<ServerEvents<S>>>(event: K, handler: (payload: ServerEvents<S>[K]) => void): Unsubscribe {
      if (disposed) throw new PulseDisposedError();
      return listeners.add(null, event, handler as Handler);
    },

    once<K extends EventKey<ServerEvents<S>>>(event: K, handler: (payload: ServerEvents<S>[K]) => void): Unsubscribe {
      if (disposed) throw new PulseDisposedError();

      let unsubscribe: Unsubscribe = () => {};

      unsubscribe = listeners.add(null, event, (payload) => {
        unsubscribe();
        (handler as Handler)(payload);
      });

      return unsubscribe;
    },

    room<K extends keyof RoomMap<S> & string>(name: K, opts?: RoomOptions): RoomScope<RoomMap<S>[K]> {
      if (disposed) throw new PulseDisposedError();
      // Always create with presence machinery — the type-level RoomScope<R> narrows
      // the public surface so plain rooms don't expose presence members.
      return rooms.createScope(name, true, opts) as RoomScope<RoomMap<S>[K]>;
    },

    get rooms() {
      return rooms.rooms;
    },

    send<K extends EventKey<ClientEvents<S>>>(event: K, payload: ClientEvents<S>[K]): void {
      if (disposed) throw new PulseDisposedError();

      const transformed = options.transform ? options.transform({ event, payload }) : { event, payload };
      if (transformed === null) return;

      sendInternal(encode({ ...transformed, type: 'message' }));
    },

    get status() {
      return status;
    },

    tap(handler: (event: PulseEvent) => void, opts?: { signal?: AbortSignal }): Unsubscribe {
      if (disposed) throw new PulseDisposedError();
      tappers.add(handler);

      if (opts?.signal) {
        if (opts.signal.aborted) {
          tappers.delete(handler);
          return () => {};
        }
        const onAbort = () => tappers.delete(handler);
        opts.signal.addEventListener('abort', onAbort, { once: true });
        return () => {
          tappers.delete(handler);
          opts.signal?.removeEventListener('abort', onAbort);
        };
      }

      return () => tappers.delete(handler);
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    wait<K extends EventKey<ServerEvents<S>>>(
      event: K,
      opts?: { signal?: AbortSignal; timeout?: number },
    ): Promise<ServerEvents<S>[K]> {
      return createWaitPromise<ServerEvents<S>[K]>(event, disposalCtrl.signal, opts, (waitEvent, handler) =>
        listeners.add(null, waitEvent, handler),
      );
    },
  };

  return pulse;
}
