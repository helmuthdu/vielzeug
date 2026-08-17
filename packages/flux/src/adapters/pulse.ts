import type { EventKey, PresenceRoomScope, Pulse, PulseSchema, ServerEvents } from '@vielzeug/pulse';
import { stream } from '../core';
import type { Stream } from '../types';

export function fromPulse<S extends PulseSchema, K extends EventKey<ServerEvents<S>>>(
  pulse: Pulse<S>,
  event: K,
): Stream<ServerEvents<S>[K]> {
  return stream((sink) => pulse.on(event, (payload) => sink.next(payload)));
}

export function fromRoomPresence<T>(room: PresenceRoomScope<T>): Stream<ReadonlyMap<string, T>> {
  return stream((sink) => {
    sink.next(room.presence.value);

    const stopJoin = room.onJoin(() => sink.next(room.presence.value));
    const stopLeave = room.onLeave(() => sink.next(room.presence.value));

    return () => {
      stopJoin();
      stopLeave();
    };
  });
}
