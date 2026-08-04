import type { EventKey, MessageMap, PresenceChannel, Pulse } from '@vielzeug/pulse';

import type { Stream } from '../types';

import { stream } from '../core';

export function fromPulse<T extends MessageMap, K extends EventKey<T>>(pulse: Pulse<T>, event: K): Stream<T[K]> {
  return stream((sink) => pulse.on(event, (payload) => sink.next(payload)));
}

export function fromPresence<T>(presence: PresenceChannel<T>): Stream<ReadonlyMap<string, T>> {
  return stream((sink) => {
    sink.next(presence.state.value);

    const stopJoin = presence.onJoin(() => sink.next(presence.state.value));
    const stopLeave = presence.onLeave(() => sink.next(presence.state.value));

    return () => {
      stopJoin();
      stopLeave();
    };
  });
}
