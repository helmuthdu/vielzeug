import type { EventKey, MessageMap, PulseChannel, Unsubscribe } from './types';

import { warn } from './_dev';
import { createWaitPromise } from './_wait';

type SendFn = (channel: string, event: string, payload: unknown) => void;
type SubscribeFn = (channel: string, event: string, handler: (payload: unknown) => void) => () => void;

/**
 * Create a typed channel object that scopes messaging to a named namespace.
 * @internal
 */
export function createChannel<TServer extends MessageMap, TClient extends MessageMap>(
  name: string,
  send: SendFn,
  subscribe: SubscribeFn,
  disposalSignal: AbortSignal,
  onDispose?: () => void,
): PulseChannel<TServer, TClient> {
  let disposed = false;

  const ctrl = new AbortController();
  const tracked = new Set<() => void>();

  disposalSignal.addEventListener('abort', () => ctrl.abort(disposalSignal.reason), { once: true });

  const channel: PulseChannel<TServer, TClient> = {
    get disposalSignal() {
      return ctrl.signal;
    },

    dispose() {
      if (disposed) return;

      disposed = true;
      ctrl.abort();

      for (const unsub of tracked) unsub();

      tracked.clear();
      onDispose?.();
    },

    get disposed() {
      return disposed;
    },

    get name() {
      return name;
    },

    on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe {
      if (disposed) {
        warn(`on('${String(event)}') called on a disposed channel '${name}' — listener ignored`);

        return () => {};
      }

      const unsub = subscribe(name, event, handler as (payload: unknown) => void);

      tracked.add(unsub);

      return () => {
        unsub();
        tracked.delete(unsub);
      };
    },

    once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe {
      if (disposed) {
        warn(`once('${String(event)}') called on a disposed channel '${name}' — listener ignored`);

        return () => {};
      }

      let unsub: Unsubscribe = () => {};

      const wrapped = (payload: unknown): void => {
        tracked.delete(unsub);
        unsub();
        (handler as (payload: unknown) => void)(payload);
      };

      unsub = subscribe(name, event, wrapped);
      tracked.add(unsub);

      return () => {
        tracked.delete(unsub);
        unsub();
      };
    },

    send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void {
      if (disposed) return;

      send(name, event, payload);
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    wait<K extends EventKey<TServer>>(
      event: K,
      opts?: { signal?: AbortSignal; timeout?: number },
    ): Promise<TServer[K]> {
      return createWaitPromise<TServer[K]>(event as string, ctrl.signal, opts, (ev, handler) =>
        subscribe(name, ev, handler),
      );
    },
  };

  return channel;
}
