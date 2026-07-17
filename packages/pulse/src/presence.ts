import { type Signal, signal } from '@vielzeug/ripple';

import type { PresenceChannel, Unsubscribe } from './types';

import { warn } from './_dev';
import { deriveAbortController } from './_utils';
import { type InPresenceJoinFrame, type InPresenceLeaveFrame, type InPresenceStateFrame, encode } from './protocol';

type RawSendFn = (frame: string) => void;

export type PresenceEvents = {
  onJoin(handler: (frame: InPresenceJoinFrame) => void): Unsubscribe;
  onLeave(handler: (frame: InPresenceLeaveFrame) => void): Unsubscribe;
  onState(handler: (frame: InPresenceStateFrame) => void): Unsubscribe;
};

/**
 * Create a presence channel that reactively tracks room member states.
 * @internal
 */
export function createPresence<T>(
  room: string,
  rawSend: RawSendFn,
  events: PresenceEvents,
  disposalSignal: AbortSignal,
  onDispose?: () => void,
): PresenceChannel<T> {
  const ctrl = deriveAbortController(disposalSignal);

  let disposed = ctrl.signal.aborted;

  ctrl.signal.addEventListener(
    'abort',
    () => {
      disposed = true;
    },
    { once: true },
  );

  const members: Signal<Map<string, T>> = signal(new Map<string, T>());
  const joinHandlers = new Set<(memberId: string, state: T) => void>();
  const leaveHandlers = new Set<(memberId: string) => void>();

  const unsubs: Array<() => void> = [
    events.onState((frame) => {
      if (frame.room !== room) return;

      const next = new Map<string, T>();

      for (const [id, state] of Object.entries(frame.members)) {
        next.set(id, state as T);
      }

      members.value = next;
    }),
    events.onJoin((frame) => {
      if (frame.room !== room) return;

      const next = new Map(members.value);

      next.set(frame.id, frame.state as T);
      members.value = next;

      for (const handler of joinHandlers) {
        handler(frame.id, frame.state as T);
      }
    }),
    events.onLeave((frame) => {
      if (frame.room !== room) return;

      const next = new Map(members.value);

      next.delete(frame.id);
      members.value = next;

      for (const handler of leaveHandlers) {
        handler(frame.id);
      }
    }),
  ];

  const presence: PresenceChannel<T> = {
    get disposalSignal() {
      return ctrl.signal;
    },

    dispose() {
      if (disposed) return;

      disposed = true;
      rawSend(encode({ room, type: 'leave' }));
      ctrl.abort();

      for (const unsub of unsubs) unsub();

      unsubs.length = 0;
      joinHandlers.clear();
      leaveHandlers.clear();
      members.dispose();
      onDispose?.();
    },

    get disposed() {
      return disposed;
    },

    onJoin(handler: (memberId: string, state: T) => void): Unsubscribe {
      if (disposed) {
        warn(`onJoin() called on a disposed presence channel '${room}' — listener ignored`);

        return () => {};
      }

      joinHandlers.add(handler);

      return () => joinHandlers.delete(handler);
    },

    onLeave(handler: (memberId: string) => void): Unsubscribe {
      if (disposed) {
        warn(`onLeave() called on a disposed presence channel '${room}' — listener ignored`);

        return () => {};
      }

      leaveHandlers.add(handler);

      return () => leaveHandlers.delete(handler);
    },

    get room() {
      return room;
    },

    get state() {
      return members;
    },

    [Symbol.dispose]() {
      this.dispose();
    },

    update(state: T): void {
      if (disposed) return;

      rawSend(encode({ room, state, type: 'presence' }));
    },
  };

  return presence;
}
