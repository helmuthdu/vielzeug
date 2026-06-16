import type { EventKey, MessageMap, PulseChannel, Unsubscribe } from './types';

import { warn } from './_warn';
import { AbortError, TimeoutError } from './errors';
import { combineSignals } from './utils';

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
): PulseChannel<TServer, TClient> {
  let disposed = false;

  const ctrl = new AbortController();
  const tracked = new Set<() => void>();

  disposalSignal.addEventListener('abort', () => ctrl.abort(disposalSignal.reason), { once: true });

  const channel: PulseChannel<TServer, TClient> = {
    dispose() {
      if (disposed) return;

      disposed = true;
      ctrl.abort();

      for (const unsub of tracked) unsub();

      tracked.clear();
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
      return new Promise((resolve, reject) => {
        const signals: AbortSignal[] = [ctrl.signal];

        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        if (opts?.signal) signals.push(opts.signal);

        if (opts?.timeout !== undefined) {
          const timeoutCtrl = new AbortController();

          timeoutId = setTimeout(() => {
            timeoutCtrl.abort(new TimeoutError(event as string));
          }, opts.timeout);
          signals.push(timeoutCtrl.signal);
        }

        const combined = signals.length === 1 ? signals[0]! : combineSignals(signals[0]!, ...signals.slice(1));

        if (combined.aborted) {
          const reason = combined.reason instanceof TimeoutError ? combined.reason : new AbortError();

          reject(reason);

          return;
        }

        let unsub: Unsubscribe = () => {};

        const onAbort = (): void => {
          clearTimeout(timeoutId);
          unsub();

          const reason = combined.reason instanceof TimeoutError ? combined.reason : new AbortError();

          reject(reason);
        };

        combined.addEventListener('abort', onAbort, { once: true });

        unsub = subscribe(name, event, (payload) => {
          clearTimeout(timeoutId);
          combined.removeEventListener('abort', onAbort);
          resolve(payload as TServer[K]);
        });
      });
    },
  };

  return channel;
}
