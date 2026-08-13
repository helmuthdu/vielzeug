import { defaultReconnectDelay, sleep } from './_utils';
import { PulseConnectionError, PulseDisposedError } from './errors';
import type { PulseStatus, ReconnectOptions } from './types';

type ConnectionCallbacks = {
  onClose(): void;
  onError(error: PulseConnectionError): void;
  onMessage(event: MessageEvent): void;
  onOpen(): void;
  onStatus(status: PulseStatus): void;
};

export type ConnectionController = {
  connect(): Promise<void>;
  disconnect(code?: number, reason?: string): void;
  dispose(): void;
  forceReconnect(code: number, reason: string): void;
  readonly open: boolean;
  send(frame: string): void;
};

type Opening = {
  promise: Promise<void>;
  reject(error: PulseConnectionError): void;
  resolve(): void;
  socket: WebSocket;
};

const DEFAULT_MAX_ATTEMPTS = 5;

/** Owns the one active socket and its retry loop. @internal */
export function createConnection(
  url: string,
  protocols: string | string[] | undefined,
  reconnect: boolean | ReconnectOptions | undefined,
  callbacks: ConnectionCallbacks,
): ConnectionController {
  const options: ReconnectOptions | undefined = reconnect === true ? {} : reconnect || undefined;
  const maxAttempts = options ? (options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS) : 0;
  const configuredDelay = options?.delay;
  const delay: (attempt: number) => number =
    typeof configuredDelay === 'function'
      ? configuredDelay
      : typeof configuredDelay === 'number'
        ? () => configuredDelay
        : defaultReconnectDelay;

  let disposed = false;
  let desired = false;
  let retrying = false;
  let retryCtrl: AbortController | undefined;
  let socket: WebSocket | undefined;
  let opening: Opening | undefined;
  const waiters = new Set<{ reject(error: Error): void; resolve(): void }>();

  function setStatus(status: PulseStatus): void {
    callbacks.onStatus(status);
  }

  function rejectWaiters(error: Error): void {
    for (const waiter of waiters) waiter.reject(error);
    waiters.clear();
  }

  function resolveWaiters(): void {
    for (const waiter of waiters) waiter.resolve();
    waiters.clear();
  }

  function rejectOpening(socketToReject: WebSocket, error: PulseConnectionError): void {
    if (opening?.socket !== socketToReject) return;

    opening.reject(error);
    opening = undefined;
  }

  function openSocket(): Promise<void> {
    if (socket?.readyState === WebSocket.OPEN) return Promise.resolve();

    if (opening) return opening.promise;

    const nextSocket = new WebSocket(url, protocols);

    socket = nextSocket;

    let resolveOpening: () => void;
    let rejectOpeningPromise: (error: PulseConnectionError) => void;
    const promise = new Promise<void>((resolve, reject) => {
      resolveOpening = resolve;
      rejectOpeningPromise = reject;
    });

    opening = { promise, reject: rejectOpeningPromise!, resolve: resolveOpening!, socket: nextSocket };

    nextSocket.onopen = (): void => {
      if (socket !== nextSocket || !desired) {
        nextSocket.close(1000, 'stale connection');

        return;
      }

      if (opening?.socket === nextSocket) {
        opening.resolve();
        opening = undefined;
      }

      setStatus('open');
      callbacks.onOpen();
      resolveWaiters();
    };

    nextSocket.onmessage = (event: MessageEvent): void => {
      if (socket === nextSocket) callbacks.onMessage(event);
    };

    nextSocket.onerror = (): void => {
      if (socket !== nextSocket) return;

      const error = new PulseConnectionError('WebSocket error', url);

      callbacks.onError(error);
      rejectOpening(nextSocket, error);
      rejectWaiters(error);
    };

    nextSocket.onclose = (): void => {
      if (socket !== nextSocket) return;

      socket = undefined;
      callbacks.onClose();

      const error = new PulseConnectionError('Connection closed', url);

      rejectOpening(nextSocket, error);

      if (!desired || disposed) {
        setStatus('closed');

        return;
      }

      if (!retrying) void reconnectLoop();
    };

    return promise;
  }

  async function reconnectLoop(): Promise<void> {
    if (retrying || disposed || !desired) return;

    retrying = true;

    const controller = new AbortController();

    retryCtrl = controller;
    setStatus('reconnecting');

    let lastError: PulseConnectionError | undefined;

    for (let attempt = 0; attempt < maxAttempts && desired && !disposed; attempt++) {
      await sleep(delay(attempt), controller.signal);

      if (controller.signal.aborted || !desired || disposed) break;

      try {
        await openSocket();
        retrying = false;

        return;
      } catch (error) {
        lastError = error instanceof PulseConnectionError ? error : new PulseConnectionError('Reconnect failed', url);
      }
    }

    if (!controller.signal.aborted && desired && !disposed) {
      desired = false;
      setStatus('closed');
      callbacks.onError(lastError ?? new PulseConnectionError('Reconnect budget exhausted', url));
      rejectWaiters(lastError ?? new PulseConnectionError('Reconnect budget exhausted', url));
    }

    if (retryCtrl === controller) retryCtrl = undefined;

    retrying = false;
  }

  function cancelRetry(): void {
    retryCtrl?.abort();
    retryCtrl = undefined;
    retrying = false;
  }

  return {
    connect(): Promise<void> {
      if (disposed) return Promise.reject(new PulseDisposedError());

      desired = true;

      if (socket?.readyState === WebSocket.OPEN) return Promise.resolve();

      const connected = new Promise<void>((resolve, reject) => {
        waiters.add({ reject, resolve });
      });

      if (!opening && !retrying) {
        setStatus('connecting');
        void openSocket().catch(() => {});
      }

      return connected;
    },

    disconnect(code = 1000, reason = ''): void {
      desired = false;
      cancelRetry();
      rejectWaiters(new PulseConnectionError('Connection closed', url));
      setStatus('closed');
      socket?.close(code, reason);
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      desired = false;
      cancelRetry();
      rejectWaiters(new PulseDisposedError());
      socket?.close(1000, 'disposed');
      socket = undefined;
      opening = undefined;
      setStatus('closed');
    },

    forceReconnect(code: number, reason: string): void {
      if (desired && socket?.readyState === WebSocket.OPEN) socket.close(code, reason);
    },

    get open() {
      return socket?.readyState === WebSocket.OPEN;
    },

    send(frame: string): void {
      if (socket?.readyState !== WebSocket.OPEN) {
        throw new PulseConnectionError('Connection is not open', url);
      }

      socket.send(frame);
    },
  };
}
