import { effect } from '@vielzeug/ripple';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { debugMachine } from '../devtools.js';
import {
  ClockworkError,
  ClockworkInvalidAfterDelayError,
  ClockworkInvalidInitialStateError,
  ClockworkInvalidMaxTransitionsError,
  ClockworkInvalidSnapshotStateError,
  ClockworkInvalidTransitionArrayError,
  ClockworkInvalidValidateContextError,
  ClockworkMissingCompoundInitialError,
  ClockworkTransitionLoopGuardError,
  ClockworkUnknownTargetError,
  createMachine,
  type AfterActionFn,
  type InterceptorFn,
  type MachineAction,
  type MachineConfig,
  type MachineEvent,
  type MachineGuard,
  type MachineSchema,
  type MachineSnapshot,
  type MachineTypeConfig,
  type MachineTypeDefinition,
  type MachineTypeInstance,
  type MachineTypeOptions,
  type PersistenceAdapter,
  type SendResult,
} from '../index.js';

type TrafficEvent = { type: 'NEXT' };

const trafficConfig: MachineConfig<'green' | 'red' | 'yellow', Record<string, never>, TrafficEvent> = {
  initial: 'green',
  states: {
    green: { on: { NEXT: { target: 'yellow' } } },
    red: { on: { NEXT: { target: 'green' } } },
    yellow: { on: { NEXT: { target: 'red' } } },
  },
};

const trafficDef = createMachine(trafficConfig);

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('core runtime', () => {
  it('starts in initial state and transitions', () => {
    const m = trafficDef.start();

    expect(m.state.value).toBe('green');
    expect(m.send({ type: 'NEXT' }).status).toBe('transitioned');
    expect(m.state.value).toBe('yellow');
  });

  it('state signal is readonly', () => {
    const m = trafficDef.start();

    expect(() => {
      // @ts-expect-error readonly signal
      m.state.value = 'red';
    }).toThrow();
  });

  it('state updates are reactive', () => {
    const m = trafficDef.start();
    const states: string[] = [];

    effect(() => {
      states.push(m.state.value);
    });

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(states).toEqual(['green', 'yellow', 'red']);
  });

  it('send returns rejected for unknown event', () => {
    const m = trafficDef.start();

    // @ts-expect-error invalid event type
    expect(m.send({ type: 'UNKNOWN' }).status).toBe('rejected');
  });

  it('dispose prevents can/send', () => {
    const m = trafficDef.start();

    m[Symbol.dispose]();

    expect(m.can({ type: 'NEXT' })).toBe(false);
    expect(m.send({ type: 'NEXT' }).status).toBe('rejected');
  });

  it('processes multiple transitions from queued events', () => {
    type Event = { type: 'INC' };

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [
              {
                actions: [
                  ({ context }) => {
                    context.count += 1;
                  },
                ],
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'INC' });
    m.send({ type: 'INC' });
    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(3);
  });

  it('matches() returns true for current state', () => {
    const m = trafficDef.start();

    expect(m.matches('green')).toBe(true);
    expect(m.matches('red', 'yellow')).toBe(false);
    expect(m.matches('green', 'red')).toBe(true);

    m.send({ type: 'NEXT' });

    expect(m.matches('yellow')).toBe(true);
    expect(m.matches('green')).toBe(false);
  });

  it('matches() returns false after dispose', () => {
    const m = trafficDef.start();

    m[Symbol.dispose]();

    expect(m.matches('green')).toBe(false);
  });

  it('self-transition re-runs entry/exit', () => {
    type Event = { type: 'INC' };

    const exitSpy = vi.fn();
    const entrySpy = vi.fn();

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          entry: entrySpy,
          exit: exitSpy,
          on: {
            INC: [
              {
                actions: [
                  ({ context }) => {
                    context.count += 1;
                  },
                ],
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = def.start();

    expect(entrySpy).toHaveBeenCalledTimes(1);

    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
    expect(entrySpy).toHaveBeenCalledTimes(2);
  });

  it('exit → actions → entry ordering is preserved', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const def = createMachine<'a' | 'b', { n: number }, Event>({
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

    const m = def.start();

    order.length = 0;
    m.send({ type: 'GO' });

    expect(order).toEqual(['a:exit', 'action', 'b:entry']);
  });

  it('context validation failure rolls back', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { count: number }, Event>({
      context: { count: 0 },
      initial: 'a',
      states: {
        a: {
          on: {
            GO: [
              {
                actions: [
                  ({ context }) => {
                    context.count = -1;
                  },
                ],
                target: 'b',
              },
            ],
          },
        },
        b: {},
      },
      validateContext: (ctx) => ctx.count >= 0 || 'count must be >= 0',
    });

    const m = def.start();

    expect(() => m.send({ type: 'GO' })).toThrow(ClockworkInvalidValidateContextError);
    expect(m.state.value).toBe('a');
    expect(m.context.value.count).toBe(0);
  });
});

describe('shorthand transition syntax', () => {
  it('single object (non-array) works like array syntax', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start();

    expect(m.send({ type: 'GO' }).status).toBe('transitioned');
    expect(m.state.value).toBe('b');
  });

  it('can() works with shorthand transitions', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.ok, target: 'b' } } },
        b: {},
      },
    });

    const m = def.start();

    expect(m.can({ type: 'GO' })).toBe(false);
  });

  it('resolveTransition works with shorthand', () => {
    type Event = { type: 'GO' };

    const config: MachineConfig<'a' | 'b', Record<string, never>, Event> = {
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    };

    const result = createMachine(config).resolve({ context: {}, event: { type: 'GO' }, state: 'a' });

    expect(result?.target).toBe('b');
  });
});

describe('snapshot and hydration', () => {
  it('snapshot context is deep-cloned', () => {
    type Event = { type: 'SET'; value: number };

    const def = createMachine<'idle', { nested: { value: number } }, Event>({
      context: { nested: { value: 1 } },
      initial: 'idle',
      states: {
        idle: {
          on: {
            SET: [
              {
                actions: [
                  ({ context, event }) => {
                    context.nested = { value: event.value };
                  },
                ],
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = def.start();
    const snap = m.getSnapshot();

    (snap.context as { nested: { value: number } }).nested.value = 999;
    expect(m.context.value.nested.value).toBe(1);
  });

  it('hydrates from snapshot and skips initial entry', () => {
    type Event = { type: 'NOOP' };

    const entrySpy = vi.fn();

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: { idle: { entry: entrySpy, on: { NOOP: [{ target: 'idle' }] } } },
    });

    const m = def.start({ snapshot: { context: { count: 10 }, state: 'idle' } });

    expect(m.context.value.count).toBe(10);
    expect(entrySpy).not.toHaveBeenCalled();
  });

  it('invokes run after hydration', async () => {
    type Event = { type: 'LOADED' };

    const def = createMachine<'done' | 'loading', { loaded: boolean }, Event>({
      context: { loaded: false },
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: () => ({ type: 'LOADED' }), src: async () => {} }],
          on: {
            LOADED: [
              {
                actions: [
                  ({ context }) => {
                    context.loaded = true;
                  },
                ],
                target: 'done',
              },
            ],
          },
        },
      },
    });

    const m = def.start({ snapshot: { context: { loaded: false }, state: 'loading' } });

    await flush();

    expect(m.state.value).toBe('done');
    expect(m.context.value.loaded).toBe(true);
  });
});

describe('typed events', () => {
  it('enforces event payload types via discriminated union', () => {
    type Event = { type: 'INC' } | { type: 'SET'; value: number };

    const def = createMachine<'idle', { value: number }, Event>({
      context: { value: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [
              {
                actions: [
                  ({ context }) => {
                    context.value += 1;
                  },
                ],
                target: 'idle',
              },
            ],
            SET: [
              {
                actions: [
                  ({ context, event }) => {
                    context.value = event.value;
                  },
                ],
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'INC' });
    m.send({ type: 'SET', value: 7 });

    expect(m.context.value.value).toBe(7);
  });

  it('resolveTransition as pure transition selector', () => {
    type Event = { type: 'GO' };

    const config: MachineConfig<'a' | 'b', { ok: boolean }, Event> = {
      context: { ok: true },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    };

    const result = createMachine(config).resolve({ context: { ok: true }, event: { type: 'GO' }, state: 'a' });

    expect(result?.target).toBe('b');
  });
});

describe('invokes', () => {
  it('maps onDone result to event and transitions', async () => {
    type Event = { type: 'RESOLVE'; value: number };

    const def = createMachine<'done' | 'loading', { value: number }, Event>({
      context: { value: 0 },
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: (result) => ({ type: 'RESOLVE', value: result as number }), src: async () => 5 }],
          on: {
            RESOLVE: [
              {
                actions: [
                  ({ context, event }) => {
                    context.value = event.value;
                  },
                ],
                target: 'done',
              },
            ],
          },
        },
      },
    });

    const m = def.start();

    await flush();

    expect(m.state.value).toBe('done');
    expect(m.context.value.value).toBe(5);
  });

  it('maps onError to event', async () => {
    type Event = { reason: string; type: 'FAIL' };

    const def = createMachine<'failed' | 'loading', { reason: string }, Event>({
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
          on: {
            FAIL: [
              {
                actions: [
                  ({ context, event }) => {
                    context.reason = event.reason;
                  },
                ],
                target: 'failed',
              },
            ],
          },
        },
      },
    });

    const m = def.start();

    await flush();

    expect(m.state.value).toBe('failed');
    expect(m.context.value.reason).toContain('network');
  });

  it('aborts running invokes on state exit', async () => {
    type Event = { type: 'CANCEL' } | { type: 'RESOLVE' };

    let resolveWork: (() => void) | undefined;

    const def = createMachine<'idle' | 'loading', Record<string, never>, Event>({
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
          on: { CANCEL: [{ target: 'idle' }], RESOLVE: [{ target: 'loading' }] },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'CANCEL' });
    resolveWork?.();
    await flush();

    expect(m.state.value).toBe('idle');
  });

  it('validates maxTransitionsPerFlush option', () => {
    expect.assertions(2);

    try {
      trafficDef.start({ maxTransitionsPerFlush: 0 });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidMaxTransitionsError);
      expect((err as ClockworkInvalidMaxTransitionsError).maxTransitionsPerFlush).toBe(0);
    }
  });

  it('does not transition after dispose', async () => {
    type Event = { type: 'DONE' };

    const def = createMachine<'done' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: () => ({ type: 'DONE' }), src: async () => {} }],
          on: { DONE: [{ target: 'done' }] },
        },
      },
    });

    const m = def.start();

    m[Symbol.dispose]();
    await flush();

    expect(m.state.value).toBe('loading');
  });

  it('uses custom clone function', () => {
    type Event = { type: 'INC' };

    const customClone = vi.fn((v: unknown) => JSON.parse(JSON.stringify(v)));

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [
              {
                actions: [
                  ({ context }) => {
                    context.count += 1;
                  },
                ],
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = def.start({ clone: customClone as <T>(v: T) => T });

    m.send({ type: 'INC' });

    expect(customClone).toHaveBeenCalled();
    expect(m.context.value.count).toBe(1);
  });
});

describe('debug options', () => {
  it('fires debug events with onGuard callback', () => {
    type Event = { type: 'GO' };

    const onDebug = vi.fn();

    const def = createMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    });

    const m = def.start({ onDebug, traceLimit: 10 });

    expect(m.send({ type: 'GO' }).status).toBe('rejected');

    const guardEvent = onDebug.mock.calls.find((c) => c[0].type === 'guard');

    expect(guardEvent).toBeDefined();
    expect(guardEvent![0].passed).toBe(false);

    const skippedEvent = onDebug.mock.calls.find((c) => c[0].type === 'transition-skipped');

    expect(skippedEvent).toBeDefined();
  });

  it('onDebug transition event fired after successful transitions', () => {
    const onDebugFn = vi.fn();
    const m = trafficDef.start({ onDebug: onDebugFn });

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    const transitions = onDebugFn.mock.calls.filter((c) => c[0].type === 'transition');

    expect(transitions).toHaveLength(2);
    expect(transitions[0][0]).toMatchObject({
      event: { type: 'NEXT' },
      from: 'green',
      to: 'yellow',
      type: 'transition',
    });
    expect(transitions[1][0]).toMatchObject({ event: { type: 'NEXT' }, from: 'yellow', to: 'red', type: 'transition' });
  });

  it('onDebug transition not fired when guard fails', () => {
    type Event = { type: 'GO' };

    const onDebugFn = vi.fn();

    const def = createMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.ok, target: 'b' } } },
        b: {},
      },
    });

    def.start({ onDebug: onDebugFn }).send({ type: 'GO' });

    const transitions = onDebugFn.mock.calls.filter((c) => c[0].type === 'transition');

    expect(transitions).toHaveLength(0);
  });

  it('trace buffer as circular ring', () => {
    const m = trafficDef.start({ traceLimit: 2 });

    m.send({ type: 'NEXT' }); // green→yellow
    m.send({ type: 'NEXT' }); // yellow→red
    m.send({ type: 'NEXT' }); // red→green (oldest dropped)

    const trace = m.getTrace();

    expect(trace).toHaveLength(2);
    expect(trace[0].from).toBe('yellow');
    expect(trace[1].from).toBe('red');
  });
});

describe('persistence', () => {
  it('uses persistence adapter load/save', () => {
    type Event = { type: 'NEXT' };

    const save = vi.fn();

    const snapshot: MachineSnapshot<'a' | 'b', { n: number }> = { context: { n: 2 }, state: 'a' };

    const def = createMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 0 },
      initial: 'a',
      states: {
        a: {
          on: {
            NEXT: [
              {
                actions: [
                  ({ context }) => {
                    context.n += 1;
                  },
                ],
                target: 'b',
              },
            ],
          },
        },
        b: {},
      },
    });

    const m = def.start({ persistence: { load: () => snapshot, save } });

    expect(m.context.value.n).toBe(2);

    m.send({ type: 'NEXT' });

    expect(save).toHaveBeenCalled();
  });

  it('does NOT save snapshot on hydrate', () => {
    type Event = { type: 'GO' };

    const save = vi.fn();

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    def.start({ persistence: { load: () => ({ context: {}, state: 'a' as const }), save } });

    expect(save).not.toHaveBeenCalled();
  });
});

describe('subscribe', () => {
  it('calls subscriber on state change', () => {
    const m = trafficDef.start();
    const snapshots: Array<MachineSnapshot<string, Record<string, never>>> = [];

    m.subscribe((snap) => snapshots.push(snap));

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].state).toBe('yellow');
    expect(snapshots[1].state).toBe('red');
  });

  it('returns unsubscribe function', () => {
    const m = trafficDef.start();
    const snapshots: Array<MachineSnapshot<string, Record<string, never>>> = [];

    const unsub = m.subscribe((snap) => snapshots.push(snap));

    m.send({ type: 'NEXT' });
    unsub();
    m.send({ type: 'NEXT' });

    expect(snapshots).toHaveLength(1);
  });

  it('unsubscribing inside a subscriber callback stops further notifications', () => {
    const m = trafficDef.start();
    const snapshots: Array<MachineSnapshot<string, Record<string, never>>> = [];

    const unsub = m.subscribe((snap) => {
      snapshots.push(snap);
      unsub();
    });

    m.send({ type: 'NEXT' }); // fires once — subscriber calls unsub
    m.send({ type: 'NEXT' }); // should not fire again

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].state).toBe('yellow');
  });
});

describe('interceptors', () => {
  it('allows events through (pass-through interceptor)', () => {
    type Event = { type: 'GO' };

    const log: string[] = [];

    const logger: InterceptorFn<'a' | 'b', Record<string, never>, Event> = (event, _snap) => {
      log.push(`intercept:${event.type}`);

      return event;
    };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start({ interceptors: [logger] });

    m.send({ type: 'GO' });

    expect(m.state.value).toBe('b');
    expect(log).toEqual(['intercept:GO']);
  });

  it('blocks events by returning null', () => {
    type Event = { type: 'GO' };

    const blocker: InterceptorFn<'a' | 'b', Record<string, never>, Event> = () => null;

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start({ interceptors: [blocker] });

    expect(m.send({ type: 'GO' }).status).toBe('rejected');
    expect(m.state.value).toBe('a');
  });

  it('chains multiple interceptors left-to-right', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const ic1: InterceptorFn<'a' | 'b', Record<string, never>, Event> = (event, _snap) => {
      order.push('ic1');

      return event;
    };

    const ic2: InterceptorFn<'a' | 'b', Record<string, never>, Event> = (event, _snap) => {
      order.push('ic2');

      return event;
    };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    def.start({ interceptors: [ic1, ic2] }).send({ type: 'GO' });

    expect(order).toEqual(['ic1', 'ic2']);
  });

  it('first null interceptor stops the chain', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const ic1: InterceptorFn<'a' | 'b', Record<string, never>, Event> = (_event, _snap) => {
      order.push('ic1');

      return null;
    };

    const ic2: InterceptorFn<'a' | 'b', Record<string, never>, Event> = (event, _snap) => {
      order.push('ic2');

      return event;
    };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start({ interceptors: [ic1, ic2] });

    expect(m.send({ type: 'GO' }).status).toBe('rejected');
    expect(order).toEqual(['ic1']);
    expect(m.state.value).toBe('a');
  });
});

describe('hierarchical states', () => {
  it('resolves initial state to leaf substate', () => {
    type Event = { type: 'DONE' } | { type: 'RETRY' };

    const def = createMachine<'idle' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          initial: 'fetching',
          on: { DONE: { target: 'idle' } },
          states: {
            fetching: { on: { RETRY: { target: 'loading.retrying' as 'idle' | 'loading' } } },
            retrying: {},
          },
        },
      },
    });

    const m = def.start();

    expect(m.state.value).toBe('loading.fetching');
    expect(m.matches('loading')).toBe(true);
    expect(m.matches('loading.fetching')).toBe(true);
  });

  it('events bubble up to parent state', () => {
    type Event = { type: 'DONE' } | { type: 'RETRY' };

    const def = createMachine<'idle' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          initial: 'fetching',
          on: { DONE: { target: 'idle' } },
          states: {
            fetching: { on: { RETRY: { target: 'loading.retrying' as 'idle' | 'loading' } } },
            retrying: {},
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'DONE' });

    expect(m.state.value).toBe('idle');
  });

  it('transitions between sibling substates', () => {
    type Event = { type: 'DONE' } | { type: 'RETRY' };

    const def = createMachine<'idle' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          initial: 'fetching',
          on: { DONE: { target: 'idle' } },
          states: {
            fetching: { on: { RETRY: { target: 'loading.retrying' as 'idle' | 'loading' } } },
            retrying: { on: { RETRY: { target: 'loading.fetching' as 'idle' | 'loading' } } },
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'RETRY' });
    expect(m.state.value).toBe('loading.retrying');

    m.send({ type: 'RETRY' });
    expect(m.state.value).toBe('loading.fetching');
  });

  it('runs entry/exit in hierarchical order', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const def = createMachine<'idle' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        idle: { entry: () => order.push('idle:entry') },
        loading: {
          entry: () => order.push('loading:entry'),
          exit: () => order.push('loading:exit'),
          initial: 'fetching',
          on: { GO: { target: 'idle' } },
          states: {
            fetching: {
              entry: () => order.push('fetching:entry'),
              exit: () => order.push('fetching:exit'),
            },
          },
        },
      },
    });

    const m = def.start();

    expect(order).toEqual(['loading:entry', 'fetching:entry']);

    order.length = 0;
    m.send({ type: 'GO' });

    expect(order).toEqual(['fetching:exit', 'loading:exit', 'idle:entry']);
  });

  it('validates compound states require initial', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'a', Record<string, never>, Event>({
        initial: 'a',
        states: { a: { states: { sub: {} } } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkMissingCompoundInitialError);
      expect((err as ClockworkMissingCompoundInitialError).path).toBe('a');
    }
  });
});

describe('after transitions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions after specified delay', () => {
    vi.useFakeTimers();

    type Event = { type: 'RESET' };

    const def = createMachine<'idle' | 'timeout', Record<string, never>, Event>({
      initial: 'idle',
      states: {
        idle: {
          after: [{ delay: 1000, target: 'timeout' }],
          on: { RESET: { target: 'idle' } },
        },
        timeout: {},
      },
    });

    const m = def.start();

    expect(m.state.value).toBe('idle');

    vi.advanceTimersByTime(999);
    expect(m.state.value).toBe('idle');

    vi.advanceTimersByTime(1);
    expect(m.state.value).toBe('timeout');
  });

  it('cancels timer on state exit', () => {
    vi.useFakeTimers();

    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b' | 'c', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: {
          after: [{ delay: 500, target: 'c' }],
          on: { GO: { target: 'b' } },
        },
        b: {},
        c: {},
      },
    });

    const m = def.start();

    m.send({ type: 'GO' });
    vi.advanceTimersByTime(1000);

    expect(m.state.value).toBe('b');
  });

  it('respects guard on after transition', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const def = createMachine<'a' | 'b', { ready: boolean }, Event>({
      context: { ready: false },
      initial: 'a',
      states: {
        a: {
          after: [{ delay: 100, guard: ({ context }) => context.ready, target: 'b' }],
        },
        b: {},
      },
    });

    const m = def.start();

    vi.advanceTimersByTime(100);
    expect(m.state.value).toBe('a');
  });

  it('runs actions on after transition', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const def = createMachine<'a' | 'b', { count: number }, Event>({
      context: { count: 0 },
      initial: 'a',
      states: {
        a: {
          after: [
            {
              actions: [
                ({ context }) => {
                  context.count = 42;
                },
              ],
              delay: 200,
              target: 'b',
            },
          ],
        },
        b: {},
      },
    });

    const m = def.start();

    vi.advanceTimersByTime(200);

    expect(m.state.value).toBe('b');
    expect(m.context.value.count).toBe(42);
  });

  it('does not fire after dispose', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { after: [{ delay: 100, target: 'b' }] },
        b: {},
      },
    });

    const m = def.start();

    m[Symbol.dispose]();
    vi.advanceTimersByTime(200);

    expect(m.state.value).toBe('a');
  });
});

describe('validation', () => {
  it('throws for unknown initial state', () => {
    expect.assertions(2);

    try {
      createMachine({
        initial: 'missing',
        states: { idle: {} },
      } as unknown as MachineConfig<string, object, MachineEvent>);
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidInitialStateError);
      expect((err as ClockworkInvalidInitialStateError).initial).toBe('missing');
    }
  });

  it('throws for unknown transition target', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [{ target: 'missing' as 'idle' }] } } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkUnknownTargetError);
      expect((err as ClockworkUnknownTargetError).target).toBe('missing');
    }
  });

  it('throws for empty transition array', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [] } } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidTransitionArrayError);
      expect((err as ClockworkInvalidTransitionArrayError).eventType).toBe('GO');
    }
  });

  it('throws for negative after delay', () => {
    type Event = { type: 'NOOP' };

    expect.assertions(2);

    try {
      createMachine<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: -100, target: 'b' }] },
          b: {},
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidAfterDelayError);
      expect((err as ClockworkInvalidAfterDelayError).delay).toBe(-100);
    }
  });
});

describe('prototype-key safety', () => {
  it('rejects "__proto__"/"constructor" as an initial state instead of matching Object.prototype', () => {
    expect.assertions(6);

    for (const initial of ['__proto__', 'constructor', 'toString']) {
      try {
        createMachine({
          initial,
          states: { idle: {} },
        } as unknown as MachineConfig<string, object, MachineEvent>);
      } catch (err) {
        expect(err).toBeInstanceOf(ClockworkInvalidInitialStateError);
        expect((err as ClockworkInvalidInitialStateError).initial).toBe(initial);
      }
    }
  });

  it('rejects "__proto__"/"constructor" as a transition target', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [{ target: '__proto__' as 'idle' }] } } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkUnknownTargetError);
      expect((err as ClockworkUnknownTargetError).target).toBe('__proto__');
    }
  });

  it('treats a "__proto__"/"constructor" event type as an unrecognised event, not a crash', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'idle', Record<string, never>, Event>({
      initial: 'idle',
      states: { idle: { on: { GO: { target: 'idle' } } } },
    });

    const m = def.start();

    // @ts-expect-error deliberately probing a non-Event-union type string
    expect(m.can({ type: '__proto__' })).toBe(false);
    // @ts-expect-error deliberately probing a non-Event-union type string
    expect(m.send({ type: 'constructor' }).status).toBe('rejected');
  });

  it('rejects a persisted snapshot whose state is "__proto__"/"constructor"', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'idle', Record<string, never>, Event>({
      initial: 'idle',
      states: { idle: {} },
    });

    expect.assertions(2);

    try {
      def.start({ snapshot: { context: {}, state: '__proto__' as 'idle' } });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidSnapshotStateError);
      expect((err as ClockworkInvalidSnapshotStateError).state).toBe('__proto__');
    }
  });

  it('rejects a malformed event (e.g. deserialized external data) instead of crashing', () => {
    const def = createMachine<'idle', Record<string, never>, TrafficEvent>({
      initial: 'idle',
      states: { idle: { on: { NEXT: { target: 'idle' } } } },
    });

    const m = def.start();

    // Simulates untyped external data (network message, JSON.parse result) forced through
    // an `Ev`-typed cast — must not throw a raw TypeError.
    expect(() => m.can(null as unknown as TrafficEvent)).not.toThrow();
    expect(m.can(null as unknown as TrafficEvent)).toBe(false);
    expect(() => m.send(null as unknown as TrafficEvent)).not.toThrow();
    expect(m.send(null as unknown as TrafficEvent).status).toBe('rejected');
    expect(m.send({} as unknown as TrafficEvent).status).toBe('rejected');
  });
});

describe('after + invoke interaction', () => {
  it('clears after-timers when leaving state via invoke', async () => {
    vi.useFakeTimers();

    type Event = { type: 'DONE' } | { type: 'NOOP' };

    const afterAction = vi.fn();
    let resolveInvoke: (value: string) => void;

    const def = createMachine<'loading' | 'success' | 'timeout', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        loading: {
          after: [{ actions: [afterAction], delay: 5000, target: 'timeout' }],
          invoke: [
            {
              onDone: () => ({ type: 'DONE' }),
              src: () => new Promise<string>((r) => (resolveInvoke = r)),
            },
          ],
          on: { DONE: [{ target: 'success' }] },
        },
        success: {},
        timeout: {},
      },
    });

    const m = def.start();

    // Resolve invoke before the after-timer fires
    resolveInvoke!('ok');
    await vi.advanceTimersByTimeAsync(0);

    expect(m.state.value).toBe('success');

    // Now advance past the after delay — it should NOT fire
    vi.advanceTimersByTime(6000);

    expect(m.state.value).toBe('success');
    expect(afterAction).not.toHaveBeenCalled();
  });
});

describe('hierarchical invoke scoping', () => {
  it('does not restart a parent-level invoke when only a child state changes', () => {
    const src = vi.fn(() => new Promise<never>(() => {}));

    type Event = { type: 'GO' };

    const def = createMachine<'working', Record<string, never>, Event>({
      initial: 'working',
      states: {
        working: {
          initial: 'step1',
          invoke: [{ src }],
          states: {
            step1: { on: { GO: { target: 'working.step2' as 'working' } } },
            step2: {},
          },
        },
      },
    });

    const m = def.start();

    expect(src).toHaveBeenCalledTimes(1);

    m.send({ type: 'GO' });

    expect(m.state.value).toBe('working.step2');
    expect(src).toHaveBeenCalledTimes(1);
  });

  it('stops a parent-level invoke when the parent itself is exited', () => {
    const src = vi.fn(() => new Promise<never>(() => {}));

    type Event = { type: 'LEAVE' };

    const def = createMachine<'idle' | 'working', Record<string, never>, Event>({
      initial: 'working',
      states: {
        idle: {},
        working: {
          initial: 'step1',
          invoke: [{ src }],
          on: { LEAVE: { target: 'idle' } },
          states: { step1: {} },
        },
      },
    });

    const m = def.start();

    expect(src).toHaveBeenCalledTimes(1);

    m.send({ type: 'LEAVE' });

    expect(m.state.value).toBe('idle');
    expect(src).toHaveBeenCalledTimes(1); // aborted, not restarted
  });
});

describe('validation — nested target paths', () => {
  it('throws for unknown nested on[] target', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { on: { GO: [{ target: 'b.nonexistent' as 'a' | 'b' }] } },
          b: { initial: 'sub', states: { sub: {} } },
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkUnknownTargetError);
      expect((err as ClockworkUnknownTargetError).target).toBe('b.nonexistent');
    }
  });

  it('throws for unknown nested after[] target', () => {
    type Event = { type: 'NOOP' };

    expect.assertions(2);

    try {
      createMachine<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: 100, target: 'b.ghost' as 'a' | 'b' }] },
          b: { initial: 'sub', states: { sub: {} } },
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkUnknownTargetError);
      expect((err as ClockworkUnknownTargetError).target).toBe('b.ghost');
    }
  });

  it('accepts valid nested on[] target', () => {
    type Event = { type: 'GO' };

    expect(() => {
      createMachine<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { on: { GO: [{ target: 'b.sub' as 'a' | 'b' }] } },
          b: { initial: 'sub', states: { sub: {} } },
        },
      });
    }).not.toThrow();
  });

  it('throws when validateHydratedContext is true and hydrated context fails validation', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 0 },
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
      validateContext: (ctx) => ctx.n >= 0 || 'n must be >= 0',
    });

    expect(() => {
      def.start({
        persistence: {
          load: () => ({ context: { n: -99 }, state: 'a' }),
          save: () => {},
        },
        validateHydratedContext: true,
      });
    }).toThrow(ClockworkInvalidValidateContextError);
  });
});

describe('can()', () => {
  it('returns true when guard passes', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: true },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.ok, target: 'b' } } },
        b: {},
      },
    });

    const m = def.start();

    expect(m.can({ type: 'GO' })).toBe(true);
  });

  it('returns false for unknown event type', () => {
    const m = trafficDef.start();

    // @ts-expect-error unknown event
    expect(m.can({ type: 'UNKNOWN' })).toBe(false);
  });
});

describe('getSnapshot()', () => {
  it('returns deep-cloned snapshot independent of live context', () => {
    type Event = { type: 'SET'; value: number };

    const def = createMachine<'idle', { n: number }, Event>({
      context: { n: 1 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            SET: [
              {
                actions: [
                  ({ context, event }) => {
                    context.n = event.value;
                  },
                ],
                target: 'idle',
              },
            ],
          },
        },
      },
    });

    const m = def.start();
    const snap = m.getSnapshot();

    m.send({ type: 'SET', value: 99 });

    expect(snap.context.n).toBe(1);
    expect(m.context.value.n).toBe(99);
    expect(snap.state).toBe('idle');
  });
});

describe('maxTransitionsPerFlush via interceptors path', () => {
  it('enforces maxTransitionsPerFlush when interceptors are active', () => {
    expect.assertions(2);

    try {
      trafficDef.start({
        interceptors: [(event) => event],
        maxTransitionsPerFlush: 0,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidMaxTransitionsError);
      expect((err as ClockworkInvalidMaxTransitionsError).maxTransitionsPerFlush).toBe(0);
    }
  });
});

describe('validateContext at init', () => {
  it('throws when initial context fails validateContext', () => {
    type Event = { type: 'NOOP' };

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: -1 },
      initial: 'idle',
      states: { idle: {} },
      validateContext: (ctx) => ctx.count >= 0 || 'count must be >= 0',
    });

    expect.assertions(3);

    try {
      def.start();
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidValidateContextError);
      expect((err as ClockworkInvalidValidateContextError).phase).toBe('init');
      expect((err as ClockworkInvalidValidateContextError).reason).toBe('count must be >= 0');
    }
  });
});

describe('subscribe — no spurious fire', () => {
  it('does not call subscriber when event is ignored (no transition)', () => {
    const m = trafficDef.start();
    const calls: unknown[] = [];

    m.subscribe((snap) => calls.push(snap));

    // @ts-expect-error unknown event — no transition should happen
    m.send({ type: 'UNKNOWN' });

    expect(calls).toHaveLength(0);
  });

  it('subscribe() after dispose returns a noop unsubscribe and never registers', () => {
    const m = trafficDef.start();
    const calls: unknown[] = [];

    m.dispose();

    const unsub = m.subscribe((snap) => calls.push(snap));

    expect(() => unsub()).not.toThrow();
    m.send({ type: 'NEXT' });

    expect(calls).toHaveLength(0);
  });
});

describe('multiple after defs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules all after defs and fires the earliest', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const def = createMachine<'a' | 'b' | 'c', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: {
          after: [
            { delay: 200, target: 'c' },
            { delay: 100, target: 'b' },
          ],
        },
        b: {},
        c: {},
      },
    });

    const m = def.start();

    vi.advanceTimersByTime(100);
    expect(m.state.value).toBe('b');
  });
});

describe('persistence', () => {
  it('save is called after every transition', () => {
    type Event = { type: 'GO' };

    const save = vi.fn();

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start({ persistence: { load: () => undefined, save } });

    expect(save).toHaveBeenCalledTimes(1);
    m.send({ type: 'GO' });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].state).toBe('b');
  });
});

describe('getTrace — no traceLimit', () => {
  it('returns empty array when traceLimit is not set', () => {
    const m = trafficDef.start();

    m.send({ type: 'NEXT' });

    expect(m.getTrace()).toHaveLength(0);
  });

  it('returns only filled entries when fewer transitions than traceLimit', () => {
    const m = trafficDef.start({ traceLimit: 10 });

    m.send({ type: 'NEXT' }); // green→yellow
    m.send({ type: 'NEXT' }); // yellow→red

    const trace = m.getTrace();

    expect(trace).toHaveLength(2);
    expect(trace[0].from).toBe('green');
    expect(trace[0].to).toBe('yellow');
    expect(trace[1].from).toBe('yellow');
    expect(trace[1].to).toBe('red');
  });
});

describe('getTrace immutability', () => {
  it('returns cloned trace entries', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: [{ target: 'b' }] } },
        b: {},
      },
    });

    const m = def.start({ traceLimit: 10 });

    m.send({ type: 'GO' });

    const trace1 = m.getTrace();
    const trace2 = m.getTrace();

    expect(trace1).toEqual(trace2);
    expect(trace1[0]).not.toBe(trace2[0]);
  });
});

describe('debugMachine', () => {
  it('transitions correctly and logs to console.debug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const m = debugMachine(trafficConfig);

    expect(m.state.value).toBe('green');
    m.send({ type: 'NEXT' });
    expect(m.state.value).toBe('yellow');

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('NEXT: green → yellow'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('guard'));

    vi.restoreAllMocks();
  });

  it('returns a MachineInstance with the same API as machine', () => {
    const m = debugMachine(trafficConfig);

    expect(typeof m.send).toBe('function');
    expect(typeof m.can).toBe('function');
    expect(typeof m.matches).toBe('function');
    expect(typeof m.getSnapshot).toBe('function');
    expect(typeof m.subscribe).toBe('function');
    expect(typeof m[Symbol.dispose]).toBe('function');
  });

  it('logs skipped transitions via onDebug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const m = debugMachine(trafficConfig);

    // @ts-expect-error unknown event
    m.send({ type: 'UNKNOWN' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('no matching transition'));

    vi.restoreAllMocks();
  });
});

describe('snapshot hierarchical state validation', () => {
  it('accepts a valid nested snapshot state', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'idle' | 'active', Record<string, never>, Event>({
      initial: 'idle',
      states: {
        active: {
          initial: 'running',
          states: {
            paused: {},
            running: {},
          },
        },
        idle: { on: { GO: { target: 'active' } } },
      },
    });

    expect(() => def.start({ snapshot: { context: {}, state: 'active.running' as 'idle' | 'active' } })).not.toThrow();
  });

  it('rejects a snapshot with a non-existent nested state', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'idle' | 'active', Record<string, never>, Event>({
      initial: 'idle',
      states: {
        active: {
          initial: 'running',
          states: {
            running: {},
          },
        },
        idle: { on: { GO: { target: 'active' } } },
      },
    });

    expect.assertions(2);

    try {
      def.start({ snapshot: { context: {}, state: 'active.nonexistent' as 'idle' | 'active' } });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidSnapshotStateError);
      expect((err as ClockworkInvalidSnapshotStateError).state).toBe('active.nonexistent');
    }
  });
});

describe('re-entrant send', () => {
  it('queues events sent inside an action and processes them after the current transition', () => {
    type Event = { type: 'A' } | { type: 'B' };

    const def = createMachine<'start' | 'middle' | 'end', Record<string, never>, Event>({
      initial: 'start',
      states: {
        end: {},
        middle: { on: { B: { target: 'end' } } },
        start: {
          on: {
            A: {
              actions: [
                () => {
                  m.send({ type: 'B' });
                },
              ],
              target: 'middle',
            },
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'A' });

    expect(m.state.value).toBe('end');
  });
});

describe('matches() edge cases', () => {
  it('returns false with no arguments', () => {
    const m = trafficDef.start();

    expect(m.matches()).toBe(false);
  });

  it('returns false after dispose', () => {
    const m = trafficDef.start();

    m[Symbol.dispose]();

    expect(m.matches('green')).toBe(false);
  });

  it('returns true for a parent state when in a child state', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'idle' | 'active', Record<string, never>, Event>({
      initial: 'idle',
      states: {
        active: {
          initial: 'running',
          states: {
            running: {},
          },
        },
        idle: { on: { GO: { target: 'active' } } },
      },
    });

    const m = def.start();

    m.send({ type: 'GO' });

    expect(m.state.value).toBe('active.running');
    expect(m.matches('active')).toBe(true);
    expect(m.matches('active.running')).toBe(true);
    expect(m.matches('idle')).toBe(false);
  });
});

describe('createMachine — resolve onGuard callback', () => {
  it('calls onGuard for every guard evaluated (passed and failed)', () => {
    type Event = { type: 'GO' };

    const config: MachineConfig<'a' | 'b' | 'c', { ok: boolean }, Event> = {
      context: { ok: false },
      initial: 'a',
      states: {
        a: {
          on: {
            GO: [{ guard: ({ context }) => context.ok, target: 'b' }, { target: 'c' }],
          },
        },
        b: {},
        c: {},
      },
    };

    const guardCalls: Array<{ passed: boolean; target: string }> = [];

    const result = createMachine(config).resolve(
      { context: { ok: false }, event: { type: 'GO' }, state: 'a' },
      { onGuard: ({ passed, target }) => guardCalls.push({ passed, target }) },
    );

    expect(result?.target).toBe('c');
    // First guard failed (guarded → b), second has no guard so passes (→ c)
    expect(guardCalls).toHaveLength(2);
    expect(guardCalls[0]).toEqual({ passed: false, target: 'b' });
    expect(guardCalls[1]).toEqual({ passed: true, target: 'c' });
  });

  it('calls onGuard with passed=true when guard succeeds', () => {
    type Event = { type: 'GO' };

    const config: MachineConfig<'a' | 'b', { ok: boolean }, Event> = {
      context: { ok: true },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    };

    const guardCalls: Array<{ passed: boolean }> = [];

    createMachine(config).resolve(
      { context: { ok: true }, event: { type: 'GO' }, state: 'a' },
      {
        onGuard: ({ passed }) => guardCalls.push({ passed }),
      },
    );

    expect(guardCalls[0]?.passed).toBe(true);
  });
});

describe('ClockworkError properties', () => {
  it('invalid initial state throws ClockworkInvalidInitialStateError', () => {
    expect.assertions(4);

    try {
      createMachine({
        initial: 'missing',
        states: { idle: {} },
      } as unknown as import('../index.js').MachineConfig<string, object, import('../index.js').MachineEvent>);
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkError);
      expect(err).toBeInstanceOf(ClockworkInvalidInitialStateError);

      const e = err as ClockworkInvalidInitialStateError;

      expect(e.initial).toBeDefined();
      expect(e.name).toBe('ClockworkInvalidInitialStateError');
    }
  });

  it('unknown target throws ClockworkUnknownTargetError with typed .target', () => {
    expect.assertions(3);

    type Event = { type: 'GO' };

    try {
      createMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [{ target: 'ghost' as 'idle' }] } } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkError);
      expect(err).toBeInstanceOf(ClockworkUnknownTargetError);
      expect((err as ClockworkUnknownTargetError).target).toBe('ghost');
    }
  });
});

describe('debugMachine — invoke lifecycle events', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs invoke-start and invoke-done events', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    type Event = { type: 'DONE' };

    const config: MachineConfig<'done' | 'loading', Record<string, never>, Event> = {
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: () => ({ type: 'DONE' }), src: async () => {} }],
          on: { DONE: [{ target: 'done' }] },
        },
      },
    };

    const m = debugMachine(config);

    await flush();

    expect(m.state.value).toBe('done');
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('started'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('done'));
  });

  it('logs invoke-error events', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    type Event = { type: 'FAILED' };

    const config: MachineConfig<'failed' | 'loading', Record<string, never>, Event> = {
      initial: 'loading',
      states: {
        failed: {},
        loading: {
          invoke: [
            {
              onError: () => ({ type: 'FAILED' }),
              src: async () => {
                throw new Error('boom');
              },
            },
          ],
          on: { FAILED: [{ target: 'failed' }] },
        },
      },
    };

    const m = debugMachine(config);

    await flush();

    expect(m.state.value).toBe('failed');
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('error'), expect.anything());
  });

  it('logs invoke-abort when state is exited before invoke completes', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    type Event = { type: 'CANCEL' };

    const config: MachineConfig<'idle' | 'loading', Record<string, never>, Event> = {
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          invoke: [{ src: () => new Promise(() => {}) }],
          on: { CANCEL: [{ target: 'idle' }] },
        },
      },
    };

    const m = debugMachine(config);

    m.send({ type: 'CANCEL' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('aborted'));
  });
});

describe('after transitions in hierarchical states', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires after transition defined on a compound state parent', () => {
    vi.useFakeTimers();

    type Event = { type: 'GO' };

    const def = createMachine<'done' | 'working', Record<string, never>, Event>({
      initial: 'working',
      states: {
        done: {},
        working: {
          after: [{ delay: 1000, target: 'done' }],
          initial: 'step1',
          states: {
            step1: { on: { GO: { target: 'working.step2' as 'done' | 'working' } } },
            step2: {},
          },
        },
      },
    });

    const m = def.start();

    expect(m.state.value).toBe('working.step1');

    vi.advanceTimersByTime(1000);

    expect(m.state.value).toBe('done');
  });

  it('cancels compound-state after-timer when transitioning out via event', () => {
    vi.useFakeTimers();

    type Event = { type: 'ABORT' };

    const def = createMachine<'cancelled' | 'done' | 'working', Record<string, never>, Event>({
      initial: 'working',
      states: {
        cancelled: {},
        done: {},
        working: {
          after: [{ delay: 500, target: 'done' }],
          initial: 'step1',
          on: { ABORT: { target: 'cancelled' } },
          states: {
            step1: {},
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'ABORT' });
    vi.advanceTimersByTime(1000);

    expect(m.state.value).toBe('cancelled');
  });

  it('does not reset a parent after-timer when only a child state changes', () => {
    vi.useFakeTimers();

    type Event = { type: 'GO' };

    const def = createMachine<'done' | 'working', Record<string, never>, Event>({
      initial: 'working',
      states: {
        done: {},
        working: {
          after: [{ delay: 1000, target: 'done' }],
          initial: 'step1',
          states: {
            step1: { on: { GO: { target: 'working.step2' as 'done' | 'working' } } },
            step2: {},
          },
        },
      },
    });

    const m = def.start();

    vi.advanceTimersByTime(600);
    m.send({ type: 'GO' }); // sibling transition — parent's after-timer must keep ticking

    expect(m.state.value).toBe('working.step2');

    vi.advanceTimersByTime(400); // 1000ms total since start

    expect(m.state.value).toBe('done');
  });
});

describe('subscribe after dispose', () => {
  it('does not fire subscriber callback after dispose', () => {
    const m = trafficDef.start();
    const calls: unknown[] = [];

    m.subscribe((snap) => calls.push(snap));
    m[Symbol.dispose]();

    m.send({ type: 'NEXT' });

    expect(calls).toHaveLength(0);
  });
});

describe('ClockworkError.is()', () => {
  it('returns true for ClockworkError instances', () => {
    try {
      createMachine({ initial: 'missing', states: { idle: {} } } as unknown as MachineConfig<
        string,
        object,
        MachineEvent
      >);
    } catch (err) {
      expect(ClockworkError.is(err)).toBe(true);
    }

    expect.assertions(1);
  });

  it('returns false for non-ClockworkError values', () => {
    expect(ClockworkError.is(new Error('plain'))).toBe(false);
    expect(ClockworkError.is(null)).toBe(false);
    expect(ClockworkError.is('string')).toBe(false);
    expect(ClockworkError.is(42)).toBe(false);
  });
});

describe('disposalSignal', () => {
  it('is aborted after dispose()', () => {
    const m = trafficDef.start();

    expect(m.disposalSignal.aborted).toBe(false);
    m.dispose();
    expect(m.disposalSignal.aborted).toBe(true);
  });

  it('disposalSignal is not aborted before dispose', () => {
    const m = trafficDef.start();

    expect(m.disposalSignal.aborted).toBe(false);
    m.dispose();
  });
});

describe('send — re-entrant returns false', () => {
  it("returns 'queued' when called re-entrantly inside an action", () => {
    type Event = { type: 'A' } | { type: 'B' };

    let reentrantResult: SendResult | undefined;

    const def = createMachine<'end' | 'middle' | 'start', Record<string, never>, Event>({
      initial: 'start',
      states: {
        end: {},
        middle: { on: { B: { target: 'end' } } },
        start: {
          on: {
            A: {
              actions: [
                () => {
                  reentrantResult = m.send({ type: 'B' });
                },
              ],
              target: 'middle',
            },
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'A' });

    expect(reentrantResult?.status).toBe('queued');
    expect(m.state.value).toBe('end');
  });
});

describe('subscribe — context-only change', () => {
  it('fires when only context changes (self-transition)', () => {
    type Event = { type: 'INC' };

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: {
              actions: [
                ({ context }) => {
                  context.count += 1;
                },
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    const m = def.start();
    const snapshots: number[] = [];

    m.subscribe((snap) => snapshots.push((snap.context as { count: number }).count));

    m.send({ type: 'INC' });
    m.send({ type: 'INC' });

    expect(snapshots).toEqual([1, 2]);
  });
});

describe('persistence — load returning undefined', () => {
  it('starts from initial state when load returns undefined', () => {
    type Event = { type: 'GO' };

    const save = vi.fn();

    const def = createMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 0 },
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start({ persistence: { load: () => undefined, save } });

    expect(m.state.value).toBe('a');
    expect(m.context.value.n).toBe(0);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('validation — empty invoke array', () => {
  it('throws for empty invoke array', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { invoke: [] } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidTransitionArrayError);
      expect((err as ClockworkInvalidTransitionArrayError).path).toBe('idle');
    }
  });
});

describe('traceLimit: 0 opt-out', () => {
  it('disables trace even when onDebug is set', () => {
    const m = trafficDef.start({
      onDebug: () => {},
      traceLimit: 0,
    });

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(m.getTrace()).toHaveLength(0);
    m.dispose();
  });
});

describe('after guard returning false', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('suppresses transition when after guard returns false', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const def = createMachine<'a' | 'b', { skip: boolean }, Event>({
      context: { skip: true },
      initial: 'a',
      states: {
        a: {
          after: [
            {
              delay: 100,
              guard: ({ context }) => !context.skip,
              target: 'b',
            },
          ],
        },
        b: {},
      },
    });

    const m = def.start();

    vi.advanceTimersByTime(200);

    expect(m.state.value).toBe('a');
    m.dispose();
  });
});

describe('getTrace ring-buffer wrap-around', () => {
  it('returns only the most recent traceLimit entries when capacity exceeded', () => {
    type Event = { type: 'NEXT' };

    const def = createMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { NEXT: { target: 'b' } } },
        b: { on: { NEXT: { target: 'a' } } },
      },
    });

    const m = def.start({ traceLimit: 3 });

    for (let i = 0; i < 7; i++) m.send({ type: 'NEXT' });

    const trace = m.getTrace();

    expect(trace).toHaveLength(3);
    // 7 transitions: a→b, b→a, a→b, b→a, a→b, b→a, a→b (entries 4,5,6 retained)
    // each entry's 'to' should equal the next entry's 'from'
    expect(trace[1].from).toBe(trace[0].to);
    expect(trace[2].from).toBe(trace[1].to);
    m.dispose();
  });
});

describe('validateContext — skip on hydration', () => {
  it('does not throw when persisted context fails validateContext', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 0 },
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
      validateContext: (ctx) => ctx.n >= 0 || 'n must be >= 0',
    });

    expect(() => {
      def.start({
        persistence: {
          load: () => ({ context: { n: -99 }, state: 'a' }),
          save: () => {},
        },
      });
    }).not.toThrow();
  });
});

describe('validation — after delay NaN/Infinity', () => {
  it('throws for NaN delay', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: NaN, target: 'b' }] },
          b: {},
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidAfterDelayError);
      expect((err as ClockworkInvalidAfterDelayError).delay).toBeNaN();
    }
  });

  it('throws for Infinity delay', () => {
    type Event = { type: 'GO' };

    expect.assertions(2);

    try {
      createMachine<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: Infinity, target: 'b' }] },
          b: {},
        },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkInvalidAfterDelayError);
      expect((err as ClockworkInvalidAfterDelayError).delay).toBe(Infinity);
    }
  });
});

describe('queue cleared on validateContext throw', () => {
  it('does not process stale queued events after a validateContext error in a re-entrant action', () => {
    type Event = { type: 'A' } | { type: 'B' };

    let calls = 0;

    const def = createMachine<'end' | 'middle' | 'start', { valid: boolean }, Event>({
      context: { valid: true },
      initial: 'start',
      states: {
        end: {},
        middle: {},
        start: {
          on: {
            A: {
              actions: [
                ({ context }) => {
                  context.valid = false;
                },
              ],
              target: 'middle',
            },
          },
        },
      },
      validateContext: (ctx) => {
        calls++;

        return ctx.valid || 'context is invalid';
      },
    });

    const m = def.start();

    calls = 0;

    expect(() => m.send({ type: 'A' })).toThrow(ClockworkError);

    expect(m.state.value).toBe('start');

    const result = m.send({ type: 'B' });

    expect(result.status).toBe('rejected');
    m.dispose();
  });
});

describe('ClockworkTransitionLoopGuardError', () => {
  it('throws when a re-entrant action keeps re-queuing past maxTransitionsPerFlush', () => {
    type Event = { type: 'LOOP' };

    const def = createMachine<'a', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: {
          on: {
            LOOP: {
              actions: [
                () => {
                  m.send({ type: 'LOOP' });
                },
              ],
              target: 'a',
            },
          },
        },
      },
    });

    const m = def.start({ maxTransitionsPerFlush: 3 });

    expect.assertions(2);

    try {
      m.send({ type: 'LOOP' });
    } catch (err) {
      expect(err).toBeInstanceOf(ClockworkTransitionLoopGuardError);
      expect((err as ClockworkTransitionLoopGuardError).maxTransitionsPerFlush).toBe(3);
    }
  });
});

describe('TransitionInput export', () => {
  it('is exported from the package index', async () => {
    const mod = await import('../index.js');

    expect(typeof (mod as Record<string, unknown>).createMachine).toBe('function');
    expect('createMachine' in mod).toBe(true);
  });
});

describe('AfterEvent shape', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('after-action receives AfterEvent with type "$after" and correct delay', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };
    type Ctx = { receivedEvent: import('../index.js').AfterEvent | null };

    let captured: import('../index.js').AfterEvent | null = null;

    const def = createMachine<'a' | 'b', Ctx, Event>({
      context: { receivedEvent: null },
      initial: 'a',
      states: {
        a: {
          after: [
            {
              actions: [
                ({ context, event }) => {
                  captured = event;
                  context.receivedEvent = event;
                },
              ],
              delay: 250,
              target: 'b',
            },
          ],
        },
        b: {},
      },
    });

    def.start();

    vi.advanceTimersByTime(250);

    expect(captured).not.toBeNull();
    expect(captured!.type).toBe('$after');
    expect(captured!.delay).toBe(250);
  });
});

describe('R4 — GuardFn receives Readonly<Ctx>', () => {
  it('guard receives the current context value and can read it', () => {
    type Event = { type: 'GO' };

    let seenCount: number | undefined;

    const def = createMachine<'a' | 'b', { count: number }, Event>({
      context: { count: 42 },
      initial: 'a',
      states: {
        a: {
          on: {
            GO: [
              {
                guard: ({ context }) => {
                  seenCount = context.count;

                  return true;
                },
                target: 'b',
              },
            ],
          },
        },
        b: {},
      },
    });

    const m = def.start();

    m.send({ type: 'GO' });

    expect(seenCount).toBe(42);
  });

  it('TypeScript rejects guard mutation of context (compile-time only)', () => {
    type Event = { type: 'GO' };
    type Ctx = { count: number };

    createMachine<'a' | 'b', Ctx, Event>({
      context: { count: 0 },
      initial: 'a',
      states: {
        a: {
          on: {
            GO: [
              {
                guard: ({ context }) => {
                  // @ts-expect-error Readonly<Ctx> — mutation disallowed by type system
                  context.count = 99;

                  return true;
                },
                target: 'b',
              },
            ],
          },
        },
        b: {},
      },
    });
  });
});

describe('R5 — subscribe() via plain Set', () => {
  it('unsubscribe removes the callback from the Set', () => {
    const m = trafficDef.start();
    const calls: number[] = [];

    const unsub = m.subscribe(() => calls.push(1));

    m.send({ type: 'NEXT' });

    expect(calls).toHaveLength(1);

    unsub();
    m.send({ type: 'NEXT' });

    expect(calls).toHaveLength(1);
  });

  it('multiple independent subscribers each receive snapshots', () => {
    const m = trafficDef.start();
    const snapsA: string[] = [];
    const snapsB: string[] = [];

    m.subscribe((snap) => snapsA.push(snap.state as string));
    m.subscribe((snap) => snapsB.push(snap.state as string));

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(snapsA).toEqual(['yellow', 'red']);
    expect(snapsB).toEqual(['yellow', 'red']);
  });
});

describe('R7 — SendResult object', () => {
  it('returns { status: "transitioned" } on success', () => {
    const m = trafficDef.start();
    const result = m.send({ type: 'NEXT' });

    expect(result).toMatchObject({ status: 'transitioned' });
  });

  it('returns { status: "rejected" } for unknown event', () => {
    const m = trafficDef.start();

    // @ts-expect-error unknown event
    const result = m.send({ type: 'UNKNOWN' });

    expect(result).toMatchObject({ status: 'rejected' });
  });

  it('returns { status: "queued" } for re-entrant send inside action', () => {
    type Event = { type: 'A' } | { type: 'B' };

    let innerResult: ReturnType<typeof m.send> | undefined;

    const def = createMachine<'end' | 'middle' | 'start', Record<string, never>, Event>({
      initial: 'start',
      states: {
        end: {},
        middle: { on: { B: { target: 'end' } } },
        start: {
          on: {
            A: {
              actions: [
                () => {
                  innerResult = m.send({ type: 'B' });
                },
              ],
              target: 'middle',
            },
          },
        },
      },
    });

    const m = def.start();

    m.send({ type: 'A' });

    expect(innerResult?.status).toBe('queued');
  });

  it('returns { status: "rejected" } after dispose', () => {
    const m = trafficDef.start();

    m.dispose();

    const result = m.send({ type: 'NEXT' });

    expect(result.status).toBe('rejected');
  });
});

describe('R9 — validateContext returns true | string', () => {
  it('does not throw when validateContext returns true', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { n: number }, Event>({
      context: { n: 5 },
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
      validateContext: (ctx) => ctx.n > 0 || 'n must be positive',
    });

    expect(() => def.start()).not.toThrow();
  });

  it('throws ClockworkError with the string message when validateContext returns a string', () => {
    type Event = { type: 'GO' };

    let errorDetails: unknown;

    const def = createMachine<'a' | 'b', { n: number }, Event>({
      context: { n: -1 },
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
      validateContext: (ctx) => ctx.n > 0 || 'n must be positive',
    });

    try {
      def.start();
    } catch (err) {
      errorDetails = err;
    }

    expect(errorDetails).toBeInstanceOf(ClockworkError);
  });

  it('validateContext receives the current context snapshot after each transition', () => {
    type Event = { type: 'INC' };

    const calls: number[] = [];

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: {
              actions: [
                ({ context }) => {
                  context.count += 1;
                },
              ],
              target: 'idle',
            },
          },
        },
      },
      validateContext: (ctx) => {
        calls.push(ctx.count);

        return true;
      },
    });

    const m = def.start();

    m.send({ type: 'INC' });
    m.send({ type: 'INC' });

    expect(calls).toContain(1);
    expect(calls).toContain(2);
  });
});

describe('C1 — can() evaluates guards without onDebug side effects', () => {
  it('evaluates guard and returns false when guard blocks', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { allowed: boolean }, Event>({
      context: { allowed: false },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.allowed, target: 'b' } } },
        b: {},
      },
    });

    const m = def.start();

    expect(m.can({ type: 'GO' })).toBe(false);
    expect(m.state.value).toBe('a');
  });

  it('returns true when guard passes', () => {
    type Event = { type: 'GO' };

    const def = createMachine<'a' | 'b', { allowed: boolean }, Event>({
      context: { allowed: true },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.allowed, target: 'b' } } },
        b: {},
      },
    });

    const m = def.start();

    expect(m.can({ type: 'GO' })).toBe(true);
  });

  it('does NOT fire onDebug when can() is called', () => {
    const debugCalls: string[] = [];

    const def = createMachine<'a' | 'b', Record<string, never>, { type: 'GO' }>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = def.start({ onDebug: (ev) => debugCalls.push(ev.type) });

    m.can({ type: 'GO' });

    expect(debugCalls).toHaveLength(0);
  });
});

describe('C2 — subscribe() snapshot isolation between subscribers', () => {
  it('snapshot context is isolated so subscriber mutations do not affect machine or other subscribers', () => {
    type Event = { type: 'INC' };

    const def = createMachine<'idle', { nested: { count: number } }, Event>({
      context: { nested: { count: 0 } },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: {
              actions: [
                ({ context }) => {
                  context.nested.count += 1;
                },
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    const m = def.start();
    let seenBySecond: number | undefined;

    m.subscribe((snap) => {
      (snap.context.nested as { count: number }).count = 999;
    });

    m.subscribe((snap) => {
      seenBySecond = snap.context.nested.count;
    });

    m.send({ type: 'INC' });

    expect(seenBySecond).toBe(1);
    expect(m.context.value.nested.count).toBe(1);
  });
});

describe('C3 — getSnapshot() independence from machine state', () => {
  it('mutating the returned snapshot does not affect machine.context.value', () => {
    type Event = { type: 'INC' };

    const def = createMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: {
              actions: [
                ({ context }) => {
                  context.count += 1;
                },
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    const m = def.start();
    const snap = m.getSnapshot();

    try {
      (snap.context as { count: number }).count = 999;
    } catch {
      // frozen — expected
    }

    expect(m.context.value.count).toBe(0);
  });

  it('two getSnapshot() calls return structurally equal but referentially distinct objects', () => {
    const m = trafficDef.start();
    const s1 = m.getSnapshot();
    const s2 = m.getSnapshot();

    expect(s1).toEqual(s2);
    expect(s1).not.toBe(s2);
  });
});

describe('C4 — resolve() ancestor chain bubbling', () => {
  it('finds transition defined on parent when child has no handler', () => {
    type Event = { type: 'CANCEL' } | { type: 'GO' };

    const config: MachineConfig<'done' | 'work', Record<string, never>, Event> = {
      initial: 'work',
      states: {
        done: {},
        work: {
          initial: 'active',
          on: { CANCEL: { target: 'done' } },
          states: {
            active: {},
          },
        },
      },
    };

    const result = createMachine(config).resolve({
      context: {},
      event: { type: 'CANCEL' },
      state: 'work.active' as 'done' | 'work',
    });

    expect(result).toBeDefined();
    expect(result?.target).toBe('done');
  });

  it('returns undefined when no ancestor handles the event', () => {
    type Event = { type: 'CANCEL' } | { type: 'GO' };

    const config: MachineConfig<'done' | 'work', Record<string, never>, Event> = {
      initial: 'work',
      states: {
        done: {},
        work: {
          initial: 'active',
          states: { active: {} },
        },
      },
    };

    const result = createMachine(config).resolve({
      context: {},
      event: { type: 'GO' },
      state: 'work.active' as 'done' | 'work',
    });

    expect(result).toBeUndefined();
  });
});

describe('named error subclasses', () => {
  it('ClockworkError.is() matches any subclass', () => {
    try {
      createMachine({ initial: 'NOPE', states: {} as never });
    } catch (err) {
      expect(ClockworkError.is(err)).toBe(true);
      expect(err).toBeInstanceOf(ClockworkInvalidInitialStateError);
    }
  });
});

describe('MachineSchema bundled-generics helpers', () => {
  it('MachineTypeConfig/-Definition/-Instance/-Options type a machine from a single bundled schema', () => {
    type CounterEvent = { type: 'INC' };
    type CounterSchema = MachineSchema<'idle', { count: number }, CounterEvent>;

    const config: MachineTypeConfig<CounterSchema> = {
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: {
              actions: [
                ({ context }) => {
                  context.count += 1;
                },
              ],
              target: 'idle',
            },
          },
        },
      },
    };

    const def: MachineTypeDefinition<CounterSchema> = createMachine(config);
    const options: MachineTypeOptions<CounterSchema> = { maxTransitionsPerFlush: 10 };
    const m: MachineTypeInstance<CounterSchema> = def.start(options);

    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(1);
  });

  it('MachineAction and MachineGuard type action/guard functions against a bundled schema', () => {
    type ToggleEvent = { type: 'ACTIVATE' } | { type: 'DEACTIVATE' };
    type ToggleSchema = MachineSchema<'active' | 'idle', { active: boolean }, ToggleEvent>;

    const activateGuard: MachineGuard<ToggleSchema, { type: 'ACTIVATE' }> = ({ context }) => !context.active;
    const activateAction: MachineAction<ToggleSchema, { type: 'ACTIVATE' }> = ({ context }) => {
      context.active = true;
    };

    const config: MachineTypeConfig<ToggleSchema> = {
      context: { active: false },
      initial: 'idle',
      states: {
        active: { on: { DEACTIVATE: { target: 'idle' } } },
        idle: { on: { ACTIVATE: { actions: [activateAction], guard: activateGuard, target: 'active' } } },
      },
    };

    const m = createMachine(config).start();

    expect(m.send({ type: 'ACTIVATE' }).status).toBe('transitioned');
    expect(m.context.value.active).toBe(true);
  });
});

describe('PersistenceAdapter type', () => {
  it('a PersistenceAdapter-typed object round-trips machine state across instances', () => {
    type Event = { type: 'GO' };

    let saved: MachineSnapshot<'a' | 'b', Record<string, never>> | undefined;

    const adapter: PersistenceAdapter<'a' | 'b', Record<string, never>> = {
      load: () => saved,
      save: (snapshot) => {
        saved = snapshot;
      },
    };

    const config: MachineConfig<'a' | 'b', Record<string, never>, Event> = {
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    };

    const m1 = createMachine(config).start({ persistence: adapter });

    m1.send({ type: 'GO' });

    const m2 = createMachine(config).start({ persistence: adapter });

    expect(m2.state.value).toBe('b');
  });
});

describe('AfterActionFn type', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('types an after-transition action extracted into a named function', () => {
    vi.useFakeTimers();

    type Ctx = { timedOut: boolean };
    type Event = { type: 'NOOP' };

    const markTimedOut: AfterActionFn<Ctx> = ({ context }) => {
      context.timedOut = true;
    };

    const def = createMachine<'done' | 'waiting', Ctx, Event>({
      context: { timedOut: false },
      initial: 'waiting',
      states: {
        done: {},
        waiting: { after: [{ actions: [markTimedOut], delay: 100, target: 'done' }] },
      },
    });

    const m = def.start();

    vi.advanceTimersByTime(100);

    expect(m.context.value.timedOut).toBe(true);
  });
});
