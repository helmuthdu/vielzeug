import type { Bus, EventKey, EventMap } from '@vielzeug/herald';

import type { Flux, Operator } from '../types';

import { flux } from '../core';

/**
 * Create a `Flux` that emits whenever `bus` fires `event`.
 *
 * @example
 * const clicks$ = fromBus(appBus, 'button:click');
 * clicks$.subscribe((payload) => console.log(payload));
 */
export function fromBus<T extends EventMap, K extends EventKey<T>>(bus: Bus<T>, event: K): Flux<T[K]> {
  return flux<T[K]>((observer) => {
    const unsub = bus.on(event, (payload) => observer.next(payload));

    return unsub;
  });
}

/**
 * Operator that pipes each emission to `bus` under `event`.
 * Returns the source unchanged (pass-through for side effects).
 *
 * @example
 * clicks$.pipe(toBus(appBus, 'forwarded:click'));
 */
export function toBus<T extends EventMap, K extends EventKey<T>>(bus: Bus<T>, event: K): Operator<T[K], T[K]> {
  return (source) =>
    flux<T[K]>((observer) =>
      source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          bus.emit(event, ...((v === undefined ? [] : [v]) as T[K] extends void ? [] : [T[K]]));
          observer.next(v);
        },
      }),
    );
}
