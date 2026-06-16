import { type Signal, signal } from '@vielzeug/ripple';

import type { PresenceChannel, Unsubscribe } from './types';

import { type InPresenceJoinFrame, type InPresenceLeaveFrame, type InPresenceStateFrame, encode } from './protocol';

type RawSubscribeFn = (channel: string | null, event: string, handler: (payload: unknown) => void) => () => void;
type RawSendFn = (frame: string) => void;

/**
 * Create a presence channel that reactively tracks room member states.
 * @internal
 */
export function createPresence<T>(
  room: string,
  rawSend: RawSendFn,
  rawSubscribe: RawSubscribeFn,
  disposalSignal: AbortSignal,
): PresenceChannel<T> {
  let disposed = false;

  const ctrl = new AbortController();

  disposalSignal.addEventListener('abort', () => ctrl.abort(disposalSignal.reason), { once: true });

  const members: Signal<Map<string, T>> = signal(new Map<string, T>());
  const joinHandlers = new Set<(memberId: string, state: T) => void>();
  const leaveHandlers = new Set<(memberId: string) => void>();

  const unsubs: Array<() => void> = [];

  unsubs.push(
    rawSubscribe(null, 'presence_state', (payload) => {
      const frame = payload as InPresenceStateFrame;

      if (frame.room !== room) return;

      const next = new Map<string, T>();

      for (const [id, state] of Object.entries(frame.members)) {
        next.set(id, state as T);
      }

      members.value = next;
    }),
  );

  unsubs.push(
    rawSubscribe(null, 'presence_join', (payload) => {
      const frame = payload as InPresenceJoinFrame;

      if (frame.room !== room) return;

      const next = new Map(members.value);

      next.set(frame.id, frame.state as T);
      members.value = next;

      for (const handler of joinHandlers) {
        handler(frame.id, frame.state as T);
      }
    }),
  );

  unsubs.push(
    rawSubscribe(null, 'presence_leave', (payload) => {
      const frame = payload as InPresenceLeaveFrame;

      if (frame.room !== room) return;

      const next = new Map(members.value);

      next.delete(frame.id);
      members.value = next;

      for (const handler of leaveHandlers) {
        handler(frame.id);
      }
    }),
  );

  const presence: PresenceChannel<T> = {
    dispose() {
      if (disposed) return;

      disposed = true;
      ctrl.abort();

      for (const unsub of unsubs) unsub();

      unsubs.length = 0;
      joinHandlers.clear();
      leaveHandlers.clear();
      members.dispose();
    },

    get disposed() {
      return disposed;
    },

    onJoin(handler: (memberId: string, state: T) => void): Unsubscribe {
      if (disposed) return () => {};

      joinHandlers.add(handler);

      return () => joinHandlers.delete(handler);
    },

    onLeave(handler: (memberId: string) => void): Unsubscribe {
      if (disposed) return () => {};

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
