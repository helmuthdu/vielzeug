import { type Signal, signal } from '@vielzeug/ripple';
import { combineSignals, deriveAbortController } from './_utils';
import { PulseAbortError, PulseConnectionError, PulseDisposedError, PulseError, PulseRoomTimeoutError } from './errors';
import { encode } from './protocol';
import type { PresenceRoomScope, RoomOptions, RoomScopeBase, Unsubscribe } from './types';

type PresenceHandlers = {
  onState(members: Record<string, unknown>): void;
  onJoin(id: string, state: unknown): void;
  onLeave(id: string): void;
  reset(): void;
};

type RoomState = {
  refs: number;
  confirmed: boolean;
  joinSent: boolean;
  leaveAfterJoin: boolean;
  localPresence: unknown | undefined;
  scopes: Set<ScopeInternal>;
};

type ScopeInternal = {
  readonly name: string;
  readonly joined: Promise<void>;
  resolveJoined(): void;
  rejectJoined(error: PulseError): void;
  isSettled(): boolean;
  presenceHandlers?: PresenceHandlers;
};

type RegistryOptions = {
  isOpen: () => boolean;
  send: (frame: string) => void;
  disposalSignal: AbortSignal;
};

export type RoomRegistry = {
  readonly rooms: Signal<ReadonlySet<string>>;
  createScope(name: string, hasPresence: boolean, opts: RoomOptions | undefined): RoomScopeBase | PresenceRoomScope;
  handleJoined(room: string): void;
  handleLeft(room: string): void;
  handlePresenceState(room: string, members: Record<string, unknown>): void;
  handlePresenceJoin(room: string, id: string, state: unknown): void;
  handlePresenceLeave(room: string, id: string): void;
  restore(): void;
  reset(): void;
  rejectAll(error: PulseError): void;
  dispose(): void;
};

/**
 * Manages ref-counted room memberships, pending join tracking, and presence state.
 * @internal
 */
export function createRoomRegistry(opts: RegistryOptions): RoomRegistry {
  const rooms = signal<ReadonlySet<string>>(new Set());
  const states = new Map<string, RoomState>();

  function getOrCreate(name: string): RoomState {
    let state = states.get(name);

    if (!state) {
      state = {
        confirmed: false,
        joinSent: false,
        leaveAfterJoin: false,
        localPresence: undefined,
        refs: 0,
        scopes: new Set(),
      };
      states.set(name, state);
    }

    return state;
  }

  function setRoom(name: string, joined: boolean): void {
    const next = new Set(rooms.value);
    if (joined) next.add(name);
    else next.delete(name);
    rooms.value = next;
  }

  function sendJoin(name: string): void {
    opts.send(encode({ room: name, type: 'join' }));
  }

  function sendLeave(name: string): void {
    opts.send(encode({ room: name, type: 'leave' }));
  }

  function updatePresence(name: string, state: unknown): void {
    const roomState = states.get(name);
    if (!roomState) throw new PulseDisposedError(`Room "${name}"`);
    if (!opts.isOpen()) throw new PulseConnectionError('Connection is not open', name);
    opts.send(encode({ room: name, state, type: 'presence' }));
    roomState.localPresence = state;
  }

  function releaseScope(name: string, scope: ScopeInternal): void {
    const state = states.get(name);
    if (!state || !state.scopes.has(scope)) return;

    state.scopes.delete(scope);
    state.refs--;

    if (state.refs === 0) {
      if (state.confirmed) {
        state.confirmed = false;
        state.localPresence = undefined;
        setRoom(name, false);
        if (opts.isOpen()) sendLeave(name);
        states.delete(name);
      } else if (state.joinSent) {
        state.leaveAfterJoin = true;
        // Keep state alive until handleJoined processes the compensating leave
      } else {
        states.delete(name);
      }
    }
  }

  return {
    createScope(name, hasPresence, joinOpts) {
      if (opts.disposalSignal.aborted) {
        return createDeadScope(name, hasPresence);
      }

      const state = getOrCreate(name);
      const ctrl = deriveAbortController(opts.disposalSignal);

      let resolveJoined!: () => void;
      let rejectJoined!: (error: PulseError) => void;
      let settled = false;

      const joined = new Promise<void>((resolve, reject) => {
        resolveJoined = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          combined.removeEventListener('abort', onAbort);
          resolve();
        };
        rejectJoined = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          combined.removeEventListener('abort', onAbort);
          reject(error);
        };
      });
      // Suppress unhandled rejection when joined is never awaited
      joined.catch(() => {});

      // Timeout + abort handling
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const signals: AbortSignal[] = [ctrl.signal];

      if (joinOpts?.signal) signals.push(joinOpts.signal);

      if (joinOpts?.timeout !== undefined) {
        const timeoutCtrl = new AbortController();
        timeoutId = setTimeout(() => timeoutCtrl.abort(new PulseRoomTimeoutError(name)), joinOpts.timeout);
        signals.push(timeoutCtrl.signal);
      }

      const combined = signals.length === 1 ? signals[0]! : combineSignals(signals[0]!, ...signals.slice(1));

      // Presence state
      let presenceSignal: Signal<Map<string, unknown>> | undefined;
      let presenceHandlers: PresenceHandlers | undefined;
      const joinHandlers = new Set<(memberId: string, state: unknown) => void>();
      const leaveHandlers = new Set<(memberId: string) => void>();

      if (hasPresence) {
        presenceSignal = signal(new Map<string, unknown>());
        presenceHandlers = {
          onJoin(id, memberState) {
            const next = new Map(presenceSignal!.value);
            next.set(id, memberState);
            presenceSignal!.value = next;
            for (const handler of joinHandlers) handler(id, memberState);
          },
          onLeave(id) {
            const next = new Map(presenceSignal!.value);
            next.delete(id);
            presenceSignal!.value = next;
            for (const handler of leaveHandlers) handler(id);
          },
          onState(members) {
            const next = new Map<string, unknown>();
            for (const [id, memberState] of Object.entries(members)) next.set(id, memberState);
            presenceSignal!.value = next;
          },
          reset() {
            presenceSignal!.value = new Map();
          },
        };
      }

      const scope: ScopeInternal = {
        isSettled: () => settled,
        joined,
        name,
        presenceHandlers,
        rejectJoined,
        resolveJoined,
      };

      // Abort handler — rejects joined and auto-disposes
      const onAbort = (): void => {
        clearTimeout(timeoutId);
        ctrl.abort();
        const reason = combined.reason;
        const error = reason instanceof PulseError ? reason : new PulseAbortError();
        scope.rejectJoined(error);
        releaseScope(name, scope);
      };

      // Register scope BEFORE setting up abort, so releaseScope is safe
      state.refs++;
      state.scopes.add(scope);

      if (combined.aborted) {
        onAbort();
        return buildPublicScope(scope, ctrl.signal, presenceSignal, joinHandlers, leaveHandlers, name, updatePresence);
      }

      combined.addEventListener('abort', onAbort, { once: true });

      // Start join
      if (state.confirmed) {
        scope.resolveJoined();
      } else if (!state.joinSent && opts.isOpen()) {
        state.joinSent = true;
        try {
          sendJoin(name);
        } catch (error) {
          state.joinSent = false;
          scope.rejectJoined(
            error instanceof PulseError ? error : new PulseConnectionError('Failed to send join', name),
          );
        }
      }

      // Build dispose function
      const disposeScope = (): void => {
        if (ctrl.signal.aborted) return;
        clearTimeout(timeoutId);
        combined.removeEventListener('abort', onAbort);
        ctrl.abort();
        if (!settled) scope.rejectJoined(new PulseDisposedError(`Room "${name}"`));
        releaseScope(name, scope);
      };

      return buildPublicScope(
        scope,
        ctrl.signal,
        presenceSignal,
        joinHandlers,
        leaveHandlers,
        name,
        updatePresence,
        disposeScope,
      );
    },

    dispose() {
      rooms.value = new Set();
      states.clear();
    },

    handleJoined(room) {
      const state = states.get(room);
      if (!state) return;

      state.confirmed = true;
      state.joinSent = false;
      setRoom(room, true);

      if (state.leaveAfterJoin) {
        state.leaveAfterJoin = false;
        state.confirmed = false;
        setRoom(room, false);
        if (opts.isOpen()) sendLeave(room);
        states.delete(room);
        return;
      }

      for (const scope of state.scopes) {
        if (!scope.isSettled()) scope.resolveJoined();
      }
    },

    handleLeft(room) {
      const state = states.get(room);
      if (!state) return;

      state.confirmed = false;
      state.joinSent = false;
      setRoom(room, false);
    },

    handlePresenceJoin(room, id, memberState) {
      const state = states.get(room);
      if (!state) return;
      for (const scope of state.scopes) scope.presenceHandlers?.onJoin(id, memberState);
    },

    handlePresenceLeave(room, id) {
      const state = states.get(room);
      if (!state) return;
      for (const scope of state.scopes) scope.presenceHandlers?.onLeave(id);
    },

    handlePresenceState(room, members) {
      const state = states.get(room);
      if (!state) return;
      for (const scope of state.scopes) scope.presenceHandlers?.onState(members);
    },

    rejectAll(error) {
      for (const state of states.values()) {
        for (const scope of state.scopes) {
          if (!scope.isSettled()) scope.rejectJoined(error);
        }
      }
    },

    reset() {
      rooms.value = new Set();
      for (const [name, state] of states) {
        if (state.refs === 0) {
          states.delete(name);
          continue;
        }
        state.confirmed = false;
        state.joinSent = false;
        for (const scope of state.scopes) scope.presenceHandlers?.reset();
      }
    },

    restore() {
      for (const [name, state] of states) {
        if (state.refs === 0) continue;

        state.confirmed = false;
        state.joinSent = true;

        try {
          sendJoin(name);
        } catch {
          state.joinSent = false;
        }

        if (state.localPresence !== undefined) {
          try {
            opts.send(encode({ room: name, state: state.localPresence, type: 'presence' }));
          } catch {
            // non-fatal; next updatePresence retries
          }
        }
      }
    },
    rooms,
  };
}

function buildPublicScope(
  scope: ScopeInternal,
  disposalSignal: AbortSignal,
  presenceSignal: Signal<Map<string, unknown>> | undefined,
  joinHandlers: Set<(memberId: string, state: unknown) => void>,
  leaveHandlers: Set<(memberId: string) => void>,
  name: string,
  updatePresence: (name: string, state: unknown) => void,
  disposeFn?: () => void,
): RoomScopeBase | PresenceRoomScope {
  const dispose = disposeFn ?? (() => {});

  if (presenceSignal) {
    const publicScope: PresenceRoomScope = {
      get disposalSignal() {
        return disposalSignal;
      },
      dispose,
      get disposed() {
        return disposalSignal.aborted;
      },
      get joined() {
        return scope.joined;
      },
      get name() {
        return scope.name;
      },
      onJoin(handler: (memberId: string, state: unknown) => void): Unsubscribe {
        if (disposalSignal.aborted) throw new PulseDisposedError(`Room "${name}"`);
        joinHandlers.add(handler);
        return () => joinHandlers.delete(handler);
      },
      onLeave(handler: (memberId: string) => void): Unsubscribe {
        if (disposalSignal.aborted) throw new PulseDisposedError(`Room "${name}"`);
        leaveHandlers.add(handler);
        return () => leaveHandlers.delete(handler);
      },
      get presence() {
        return presenceSignal;
      },
      updatePresence(state: unknown) {
        updatePresence(name, state);
      },
      [Symbol.dispose]: dispose,
    };
    return publicScope;
  }

  const publicScope: RoomScopeBase = {
    get disposalSignal() {
      return disposalSignal;
    },
    dispose,
    get disposed() {
      return disposalSignal.aborted;
    },
    get joined() {
      return scope.joined;
    },
    get name() {
      return scope.name;
    },
    [Symbol.dispose]: dispose,
  };
  return publicScope;
}

function createDeadScope(name: string, hasPresence: boolean): RoomScopeBase | PresenceRoomScope {
  const disposalCtrl = new AbortController();
  disposalCtrl.abort(new PulseDisposedError());

  const joined = Promise.reject(new PulseDisposedError(`Room "${name}"`));
  joined.catch(() => {});

  if (hasPresence) {
    return {
      disposalSignal: disposalCtrl.signal,
      dispose() {},
      disposed: true,
      joined,
      name,
      onJoin() {
        throw new PulseDisposedError(`Room "${name}"`);
      },
      onLeave() {
        throw new PulseDisposedError(`Room "${name}"`);
      },
      presence: signal(new Map()),
      updatePresence() {
        throw new PulseDisposedError(`Room "${name}"`);
      },
      [Symbol.dispose]() {},
    };
  }

  return {
    disposalSignal: disposalCtrl.signal,
    dispose() {},
    disposed: true,
    joined,
    name,
    [Symbol.dispose]() {},
  };
}
