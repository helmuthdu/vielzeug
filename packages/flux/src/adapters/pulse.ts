import type { EventKey, MessageMap, PresenceChannel, Pulse } from '@vielzeug/pulse';

import type { Flux } from '../types';

import { flux } from '../core';

/**
 * Create a `Flux` that emits whenever a Pulse connection fires `event`.
 *
 * @example
 * const messages$ = fromPulse(pulse, 'chat:message');
 * messages$.subscribe((msg) => console.log(msg));
 */
export function fromPulse<T extends MessageMap, K extends EventKey<T>>(pulse: Pulse<T>, event: K): Flux<T[K]> {
  return flux<T[K]>((observer) => {
    const unsub = pulse.on(event, (payload) => observer.next(payload));

    return unsub;
  });
}

/**
 * Create a `Flux` from a `PresenceChannel`. Emits the full member map whenever
 * any member joins or leaves.
 *
 * The current state is emitted immediately on subscribe.
 *
 * @example
 * const members$ = fromPresence(pulse.presence('lobby'));
 * members$.subscribe((map) => console.log([...map.keys()]));
 */
export function fromPresence<T>(presence: PresenceChannel<T>): Flux<ReadonlyMap<string, T>> {
  return flux<ReadonlyMap<string, T>>((observer) => {
    observer.next(presence.state.value);

    const unsubJoin = presence.onJoin(() => {
      observer.next(presence.state.value);
    });

    const unsubLeave = presence.onLeave(() => {
      observer.next(presence.state.value);
    });

    return () => {
      unsubJoin();
      unsubLeave();
    };
  });
}
