import { effect } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import {
  assign,
  defineMachine,
  interpret,
  MachineError,
  resolveTransition,
  type MachineConfig,
  type MachineEvent,
  type MachineSnapshot,
} from '../index.js';

type TrafficEvent = { type: 'NEXT' };

const trafficDefinition = defineMachine<'green' | 'red' | 'yellow', Record<string, never>, TrafficEvent>({
  initial: 'green',
  states: {
    // Shorthand (single object) transition syntax
    green: { on: { NEXT: { target: 'yellow' } } },
    red: { on: { NEXT: { target: 'green' } } },
    yellow: { on: { NEXT: { target: 'red' } } },
  },
});

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('core runtime', () => {
  it('starts in initial state and transitions', () => {
    const m = interpret(trafficDefinition);

    expect(m.state.value).toBe('green');
    expect(m.send({ type: 'NEXT' })).toBe(true);
    expect(m.state.value).toBe('yellow');
  });

  it('state signal is readonly', () => {
    const m = interpret(trafficDefinition);

    expect(() => {
      // @ts-expect-error readonly signal
      m.state.value = 'red';
    }).toThrow();
  });

  it('state updates are reactive', () => {
    const m = interpret(trafficDefinition);
    const states: string[] = [];

    effect(() => {
      states.push(m.state.value);
    });

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(states).toEqual(['green', 'yellow', 'red']);
  });

  it('send returns false for unknown event', () => {
    const m = interpret(trafficDefinition);

    // @ts-expect-error invalid event type
    expect(m.send({ type: 'UNKNOWN' })).toBe(false);
  });

  it('dispose prevents can/send', () => {
    const m = interpret(trafficDefinition);

    m[Symbol.dispose]();

    expect(m.can({ type: 'NEXT' })).toBe(false);
    expect(m.send({ type: 'NEXT' })).toBe(false);
  });

  it('processes multiple transitions from queued events', () => {
    type Event = { type: 'INC' };

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [{ actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }],
          },
        },
      },
    });

    const m = interpret(machine);

    m.send({ type: 'INC' });
    m.send({ type: 'INC' });
    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(3);
  });

  it('matches() returns true for current state, false for others', () => {
    const m = interpret(trafficDefinition);

    expect(m.matches('green')).toBe(true);
    expect(m.matches('red', 'yellow')).toBe(false);
    expect(m.matches('green', 'red')).toBe(true);

    m.send({ type: 'NEXT' });

    expect(m.matches('yellow')).toBe(true);
    expect(m.matches('green')).toBe(false);
  });

  it('matches() returns false after dispose', () => {
    const m = interpret(trafficDefinition);

    m[Symbol.dispose]();

    expect(m.matches('green')).toBe(false);
  });

  it('self-transition updates context and re-runs entry/exit', () => {
    type Event = { type: 'INC' };

    const exitSpy = vi.fn();
    const entrySpy = vi.fn();

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          entry: entrySpy,
          exit: exitSpy,
          on: {
            INC: [{ actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }],
          },
        },
      },
    });

    const m = interpret(machine);

    // entry called once on init
    expect(entrySpy).toHaveBeenCalledTimes(1);

    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(entrySpy).toHaveBeenCalledTimes(2);
  });

  it('exit → actions → entry ordering is preserved', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const machine = defineMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 0 },
      initial: 'a',
      states: {
        a: {
          entry: () => {
            order.push('a:entry');
          },
          exit: () => {
            order.push('a:exit');
          },
          on: {
            GO: [
              {
                actions: [
                  () => {
                    order.push('action');
                  },
                ],
                target: 'b',
              },
            ],
          },
        },
        b: {
          entry: () => {
            order.push('b:entry');
          },
          exit: () => {
            order.push('b:exit');
          },
          on: { GO: [{ target: 'a' }] },
        },
      },
    });

    const m = interpret(machine);

    order.length = 0; // clear init entry

    m.send({ type: 'GO' });

    expect(order).toEqual(['a:exit', 'action', 'b:entry']);
  });

  it('context validation failure during transition throws MachineError', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', { count: number }, Event>({
      context: { count: 0 },
      initial: 'a',
      states: {
        a: { on: { GO: [{ actions: [assign(() => ({ count: -1 }))], target: 'b' }] } },
        b: {},
      },
      validateContext: (ctx): ctx is { count: number } =>
        typeof ctx === 'object' && ctx !== null && (ctx as { count: number }).count >= 0,
    });

    const m = interpret(machine);

    expect(() => m.send({ type: 'GO' })).toThrow(MachineError);
    // Machine must be unchanged after a validation failure
    expect(m.state.value).toBe('a');
    expect(m.context.value.count).toBe(0);
  });
});

describe('shorthand transition syntax', () => {
  it('single object transition (no array) works identically to array syntax', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine);

    expect(m.send({ type: 'GO' })).toBe(true);
    expect(m.state.value).toBe('b');
  });

  it('can() works with shorthand transitions', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.ok, target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine);

    expect(m.can({ type: 'GO' })).toBe(false);
  });

  it('resolveTransition works with shorthand', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const result = resolveTransition(machine, { context: {}, event: { type: 'GO' }, state: 'a' });

    expect(result?.target).toBe('b');
  });
});

describe('snapshot cloning and hydration', () => {
  it('snapshot context is deep-cloned and cannot corrupt live state', () => {
    type Event = { type: 'SET'; value: number };

    const machine = defineMachine<'idle', { nested: { value: number } }, Event>({
      context: { nested: { value: 1 } },
      initial: 'idle',
      states: {
        idle: {
          on: {
            SET: [{ actions: [assign(({ event }) => ({ nested: { value: event.value } }))], target: 'idle' }],
          },
        },
      },
    });

    const m = interpret(machine);
    const snap = m.getSnapshot();

    expect(snap.context.nested.value).toBe(1);

    (snap.context as { nested: { value: number } }).nested.value = 999;
    expect(m.context.value.nested.value).toBe(1);
  });

  it('hydrates from snapshot and skips initial entry', () => {
    type Event = { type: 'NOOP' };

    const entrySpy = vi.fn();

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          entry: entrySpy,
          on: { NOOP: [{ target: 'idle' }] },
        },
      },
    });

    const m = interpret(machine, { snapshot: { context: { count: 10 }, state: 'idle' } });

    expect(m.context.value.count).toBe(10);
    expect(entrySpy).not.toHaveBeenCalled();
  });

  it('invokes run after hydration even though entry is skipped', async () => {
    type Event = { type: 'LOADED' };

    const machine = defineMachine<'idle' | 'loading', { loaded: boolean }, Event>({
      context: { loaded: false },
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          invoke: [{ onDone: () => ({ type: 'LOADED' }), src: async () => {} }],
          on: { LOADED: [{ actions: [assign(() => ({ loaded: true }))], target: 'idle' }] },
        },
      },
    });

    const m = interpret(machine, { snapshot: { context: { loaded: false }, state: 'loading' } });

    await flush();

    expect(m.state.value).toBe('idle');
    expect(m.context.value.loaded).toBe(true);
  });

  it('can validate hydrated context with validateSnapshot hook', () => {
    type Event = { type: 'NOOP' };

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: { idle: { on: { NOOP: [{ target: 'idle' }] } } },
    });

    expect(() => {
      interpret(machine, {
        snapshot: { context: { count: -1 }, state: 'idle' },
        validateSnapshot: (value): value is { count: number } =>
          typeof value === 'object' && value !== null && (value as { count?: number }).count === 0,
      });
    }).toThrowError(MachineError);
  });
});

describe('typed event unions and pure resolver', () => {
  it('enforces payload types via discriminated event union', () => {
    type Event = { type: 'INC' } | { type: 'SET'; value: number };

    const machine = defineMachine<'idle', { value: number }, Event>({
      context: { value: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [{ actions: [assign(({ context }) => ({ value: context.value + 1 }))], target: 'idle' }],
            SET: [{ actions: [assign(({ event }) => ({ value: event.value }))], target: 'idle' }],
          },
        },
      },
    });

    const m = interpret(machine);

    m.send({ type: 'INC' });
    m.send({ type: 'SET', value: 7 });

    // @ts-expect-error missing value for SET
    const _invalid: Event = { type: 'SET' };

    expect(m.context.value.value).toBe(7);
  });

  it('resolveTransition works as pure transition selector', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: true },
      initial: 'a',
      states: {
        a: {
          on: {
            GO: [{ guard: ({ context }) => context.ok, target: 'b' }],
          },
        },
        b: {},
      },
    });

    const result = resolveTransition(machine, {
      context: { ok: true },
      event: { type: 'GO' },
      state: 'a',
    });

    expect(result?.target).toBe('b');
  });
});

describe('invoke support and queued event processing', () => {
  it('maps onDone result to event and transitions', async () => {
    type Event = { type: 'RESOLVE'; value: number };

    const machine = defineMachine<'done' | 'loading', { value: number }, Event>({
      context: { value: 0 },
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: (result) => ({ type: 'RESOLVE', value: result as number }), src: async () => 5 }],
          on: { RESOLVE: [{ actions: [assign(({ event }) => ({ value: event.value }))], target: 'done' }] },
        },
      },
    });

    const m = interpret(machine);

    await flush();

    expect(m.state.value).toBe('done');
    expect(m.context.value.value).toBe(5);
  });

  it('maps onError to event and transitions', async () => {
    type Event = { reason: string; type: 'FAIL' };

    const machine = defineMachine<'failed' | 'loading', { reason: string }, Event>({
      context: { reason: '' },
      initial: 'loading',
      states: {
        failed: {},
        loading: {
          invoke: [
            {
              onError: (error) => ({ reason: String(error), type: 'FAIL' }),
              src: async () => {
                throw new Error('network');
              },
            },
          ],
          on: { FAIL: [{ actions: [assign(({ event }) => ({ reason: event.reason }))], target: 'failed' }] },
        },
      },
    });

    const m = interpret(machine);

    await flush();

    expect(m.state.value).toBe('failed');
    expect(m.context.value.reason).toContain('network');
  });

  it('aborts running invokes on state exit', async () => {
    type Event = { type: 'CANCEL' } | { type: 'RESOLVE' };

    let resolveWork: (() => void) | undefined;

    const machine = defineMachine<'idle' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          invoke: [
            {
              onDone: () => ({ type: 'RESOLVE' }),
              src: async ({ signal }) =>
                new Promise<void>((resolve) => {
                  resolveWork = () => {
                    if (!signal.aborted) resolve();
                  };
                }),
            },
          ],
          on: {
            CANCEL: [{ target: 'idle' }],
            RESOLVE: [{ target: 'loading' }],
          },
        },
      },
    });

    const m = interpret(machine);

    m.send({ type: 'CANCEL' });
    resolveWork?.();
    await flush();

    expect(m.state.value).toBe('idle');
  });

  it('validates maxTransitionsPerFlush option', () => {
    expect(() => {
      interpret(trafficDefinition, { maxTransitionsPerFlush: 0 });
    }).toThrowError(MachineError);
  });

  it('does not transition after dispose even when invoke resolves', async () => {
    type Event = { type: 'DONE' };

    const machine = defineMachine<'done' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: () => ({ type: 'DONE' }), src: async () => {} }],
          on: { DONE: [{ target: 'done' }] },
        },
      },
    });

    const m = interpret(machine);

    m[Symbol.dispose]();
    await flush();

    expect(m.state.value).toBe('loading');
  });

  it('uses custom clone function instead of structuredClone', () => {
    type Event = { type: 'INC' };

    const customClone = vi.fn((v: unknown) => JSON.parse(JSON.stringify(v)));

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: { INC: [{ actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }] },
        },
      },
    });

    const m = interpret(machine, { clone: customClone as <T>(v: T) => T });

    m.send({ type: 'INC' });

    expect(customClone).toHaveBeenCalled();
    expect(m.context.value.count).toBe(1);
  });
});

describe('onTransition callback in InterpretOptions', () => {
  it('calls onTransition after each successful transition', () => {
    const onTransition = vi.fn();
    const m = interpret(trafficDefinition, { onTransition });

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(onTransition).toHaveBeenCalledTimes(2);
    expect(onTransition).toHaveBeenNthCalledWith(1, { event: { type: 'NEXT' }, from: 'green', to: 'yellow' });
    expect(onTransition).toHaveBeenNthCalledWith(2, { event: { type: 'NEXT' }, from: 'yellow', to: 'red' });
  });

  it('does not call onTransition when guard fails', () => {
    type Event = { type: 'GO' };

    const onTransition = vi.fn();

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.ok, target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine, { onTransition });

    m.send({ type: 'GO' });

    expect(onTransition).not.toHaveBeenCalled();
  });
});

describe('debug hooks, trace mode, and persistence adapter', () => {
  it('calls debug hooks and records transition trace', () => {
    type Event = { type: 'GO' };

    const onEvaluateGuard = vi.fn();
    const onTransitionSkipped = vi.fn();

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    });

    const m = interpret(machine, {
      debug: { onEvaluateGuard, onTransitionSkipped },
      traceLimit: 10,
    });

    expect(m.send({ type: 'GO' })).toBe(false);
    expect(onEvaluateGuard).toHaveBeenCalled();
    expect(onTransitionSkipped).toHaveBeenCalledWith({ event: { type: 'GO' }, from: 'a' });

    (m.context.value as { ok: boolean }).ok = true;
    m.send({ type: 'GO' });

    const trace = m.getTrace();

    expect(trace).toHaveLength(1);
    expect(trace[0].from).toBe('a');
    expect(trace[0].to).toBe('b');
  });

  it('trace buffer behaves as circular ring buffer — oldest entries are dropped', () => {
    type Event = { type: 'NEXT' };

    const m = interpret(trafficDefinition, { traceLimit: 2 });

    m.send({ type: 'NEXT' }); // green→yellow
    m.send({ type: 'NEXT' }); // yellow→red
    m.send({ type: 'NEXT' }); // red→green (oldest: green→yellow dropped)

    const trace = m.getTrace();

    expect(trace).toHaveLength(2);
    expect(trace[0].from).toBe('yellow');
    expect(trace[1].from).toBe('red');
  });

  it('uses persistence adapter load/save — does NOT clear on dispose', () => {
    type Event = { type: 'NEXT' };

    const save = vi.fn();
    const clear = vi.fn();

    const snapshot: MachineSnapshot<'a' | 'b', { n: number }> = {
      context: { n: 2 },
      state: 'a',
    };

    const machine = defineMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 0 },
      initial: 'a',
      states: {
        a: { on: { NEXT: [{ actions: [assign(({ context }) => ({ n: context.n + 1 }))], target: 'b' }] } },
        b: {},
      },
    });

    const m = interpret(machine, {
      persistence: { clear, load: () => snapshot, save },
    });

    expect(m.context.value.n).toBe(2);

    m.send({ type: 'NEXT' });

    expect(save).toHaveBeenCalled();

    m[Symbol.dispose]();

    // Disposal must NOT call persistence.clear() — that destroys data unexpectedly
    expect(clear).not.toHaveBeenCalled();
  });

  it('clearPersistence() explicitly clears persisted state', () => {
    type Event = { type: 'NEXT' };

    const clear = vi.fn();

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { NEXT: { target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine, { persistence: { clear } });

    m.clearPersistence();

    expect(clear).toHaveBeenCalledOnce();
  });
});

describe('validation and typed errors', () => {
  it('throws MachineError (not MachinitError) for unknown initial state', () => {
    const error = (() => {
      try {
        defineMachine({
          initial: 'missing',
          states: { idle: {} },
        } as unknown as MachineConfig<string, object, MachineEvent>);
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(MachineError);
    expect((error as MachineError).name).toBe('MachineError');
    expect((error as MachineError).code).toBe('MACHINE_INVALID_INITIAL_STATE');
  });

  it('throws typed error for unknown transition target', () => {
    type Event = { type: 'GO' };

    expect(() => {
      defineMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: {
          idle: {
            on: { GO: [{ target: 'missing' as 'idle' }] },
          },
        },
      });
    }).toThrowError(MachineError);
  });

  it('throws typed error for empty transition array', () => {
    type Event = { type: 'GO' };

    expect(() => {
      defineMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: {
          idle: {
            on: { GO: [] },
          },
        },
      });
    }).toThrowError(MachineError);
  });

  it('supports broad MachineEvent when explicitly requested', () => {
    const machine = defineMachine<'idle', Record<string, never>, MachineEvent>({
      initial: 'idle',
      states: {
        idle: {
          on: {
            ANY: [
              {
                actions: [() => {}],
                guard: () => true,
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = interpret(machine);

    expect(m.send({ payload: 1, type: 'ANY' })).toBe(true);
  });
});
