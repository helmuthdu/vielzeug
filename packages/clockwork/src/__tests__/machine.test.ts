import { effect } from '@vielzeug/ripple';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { debugInterpret } from '../devtools.js';
import {
  define,
  machine,
  type InterceptorFn,
  type MachineConfig,
  MachineError,
  type MachineEvent,
  type MachineSnapshot,
  resolveTransition,
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

const trafficDef = define(trafficConfig);

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

    const def = define<'idle', { count: number }, Event>({
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

    const def = define<'idle', { count: number }, Event>({
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

    const def = define<'a' | 'b', { n: number }, Event>({
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

    const def = define<'a' | 'b', { count: number }, Event>({
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

    expect(() => m.send({ type: 'GO' })).toThrow(MachineError);
    expect(m.state.value).toBe('a');
    expect(m.context.value.count).toBe(0);
  });
});

describe('shorthand transition syntax', () => {
  it('single object (non-array) works like array syntax', () => {
    type Event = { type: 'GO' };

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', { ok: boolean }, Event>({
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

    const result = resolveTransition(config, { context: {}, event: { type: 'GO' }, state: 'a' });

    expect(result?.target).toBe('b');
  });
});

describe('snapshot and hydration', () => {
  it('snapshot context is deep-cloned', () => {
    type Event = { type: 'SET'; value: number };

    const def = define<'idle', { nested: { value: number } }, Event>({
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

    const def = define<'idle', { count: number }, Event>({
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

    const def = define<'done' | 'loading', { loaded: boolean }, Event>({
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

    const def = define<'idle', { value: number }, Event>({
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

    const result = resolveTransition(config, { context: { ok: true }, event: { type: 'GO' }, state: 'a' });

    expect(result?.target).toBe('b');
  });
});

describe('invokes', () => {
  it('maps onDone result to event and transitions', async () => {
    type Event = { type: 'RESOLVE'; value: number };

    const def = define<'done' | 'loading', { value: number }, Event>({
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

    const def = define<'failed' | 'loading', { reason: string }, Event>({
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

    const def = define<'idle' | 'loading', Record<string, never>, Event>({
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
    expect(() => {
      trafficDef.start({ maxTransitionsPerFlush: 0 });
    }).toThrowError(MachineError);
  });

  it('does not transition after dispose', async () => {
    type Event = { type: 'DONE' };

    const def = define<'done' | 'loading', Record<string, never>, Event>({
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

    const def = define<'idle', { count: number }, Event>({
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

    const def = define<'a' | 'b', { ok: boolean }, Event>({
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

    const def = define<'a' | 'b', { ok: boolean }, Event>({
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

    const def = define<'a' | 'b', { n: number }, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'idle' | 'loading', Record<string, never>, Event>({
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

    const def = define<'idle' | 'loading', Record<string, never>, Event>({
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

    const def = define<'idle' | 'loading', Record<string, never>, Event>({
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

    const def = define<'idle' | 'loading', Record<string, never>, Event>({
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

    expect(() => {
      define<'a', Record<string, never>, Event>({
        initial: 'a',
        states: { a: { states: { sub: {} } } },
      });
    }).toThrow(MachineError);
  });
});

describe('after transitions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions after specified delay', () => {
    vi.useFakeTimers();

    type Event = { type: 'RESET' };

    const def = define<'idle' | 'timeout', Record<string, never>, Event>({
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

    const def = define<'a' | 'b' | 'c', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', { ready: boolean }, Event>({
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

    const def = define<'a' | 'b', { count: number }, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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
    expect(() => {
      define({
        initial: 'missing',
        states: { idle: {} },
      } as unknown as MachineConfig<string, object, MachineEvent>);
    }).toThrow(MachineError);
  });

  it('throws for unknown transition target', () => {
    type Event = { type: 'GO' };

    expect(() => {
      define<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [{ target: 'missing' as 'idle' }] } } },
      });
    }).toThrow(MachineError);
  });

  it('throws for empty transition array', () => {
    type Event = { type: 'GO' };

    expect(() => {
      define<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [] } } },
      });
    }).toThrow(MachineError);
  });

  it('throws for negative after delay', () => {
    type Event = { type: 'NOOP' };

    expect(() => {
      define<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: -100, target: 'b' }] },
          b: {},
        },
      });
    }).toThrow(MachineError);
  });
});

describe('after + invoke interaction', () => {
  it('clears after-timers when leaving state via invoke', async () => {
    vi.useFakeTimers();

    type Event = { type: 'DONE' } | { type: 'NOOP' };

    const afterAction = vi.fn();
    let resolveInvoke: (value: string) => void;

    const def = define<'loading' | 'success' | 'timeout', Record<string, never>, Event>({
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

describe('validation — nested target paths', () => {
  it('throws for unknown nested on[] target', () => {
    type Event = { type: 'GO' };

    expect(() => {
      define<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { on: { GO: [{ target: 'b.nonexistent' as 'a' | 'b' }] } },
          b: { initial: 'sub', states: { sub: {} } },
        },
      });
    }).toThrow(MachineError);
  });

  it('throws for unknown nested after[] target', () => {
    type Event = { type: 'NOOP' };

    expect(() => {
      define<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: 100, target: 'b.ghost' as 'a' | 'b' }] },
          b: { initial: 'sub', states: { sub: {} } },
        },
      });
    }).toThrow(MachineError);
  });

  it('accepts valid nested on[] target', () => {
    type Event = { type: 'GO' };

    expect(() => {
      define<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { on: { GO: [{ target: 'b.sub' as 'a' | 'b' }] } },
          b: { initial: 'sub', states: { sub: {} } },
        },
      });
    }).not.toThrow();
  });
});

describe('can()', () => {
  it('returns true when guard passes', () => {
    type Event = { type: 'GO' };

    const def = define<'a' | 'b', { ok: boolean }, Event>({
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

    const def = define<'idle', { n: number }, Event>({
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
    expect(() => {
      trafficDef.start({
        interceptors: [(event) => event],
        maxTransitionsPerFlush: 0,
      });
    }).toThrow(MachineError);
  });
});

describe('validateContext at init', () => {
  it('throws when initial context fails validateContext', () => {
    type Event = { type: 'NOOP' };

    const def = define<'idle', { count: number }, Event>({
      context: { count: -1 },
      initial: 'idle',
      states: { idle: {} },
      validateContext: (ctx) => ctx.count >= 0 || 'count must be >= 0',
    });

    expect(() => def.start()).toThrow(MachineError);
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
});

describe('multiple after defs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules all after defs and fires the earliest', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const def = define<'a' | 'b' | 'c', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

describe('debugInterpret', () => {
  it('transitions correctly and logs to console.debug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const m = debugInterpret(trafficConfig);

    expect(m.state.value).toBe('green');
    m.send({ type: 'NEXT' });
    expect(m.state.value).toBe('yellow');

    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('NEXT: green → yellow'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('guard'));

    vi.restoreAllMocks();
  });

  it('returns a MachineInstance with the same API as machine', () => {
    const m = debugInterpret(trafficConfig);

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

    const m = debugInterpret(trafficConfig);

    // @ts-expect-error unknown event
    m.send({ type: 'UNKNOWN' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('no matching transition'));

    vi.restoreAllMocks();
  });
});

describe('snapshot hierarchical state validation', () => {
  it('accepts a valid nested snapshot state', () => {
    type Event = { type: 'GO' };

    const def = define<'idle' | 'active', Record<string, never>, Event>({
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

    const def = define<'idle' | 'active', Record<string, never>, Event>({
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

    expect(() => def.start({ snapshot: { context: {}, state: 'active.nonexistent' as 'idle' | 'active' } })).toThrow(
      MachineError,
    );
  });
});

describe('re-entrant send', () => {
  it('queues events sent inside an action and processes them after the current transition', () => {
    type Event = { type: 'A' } | { type: 'B' };

    const def = define<'start' | 'middle' | 'end', Record<string, never>, Event>({
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

    const def = define<'idle' | 'active', Record<string, never>, Event>({
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

describe('resolveTransition — onGuard callback', () => {
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

    const result = resolveTransition(
      config,
      { context: { ok: false }, event: { type: 'GO' }, state: 'a' },
      ({ passed, target }) => guardCalls.push({ passed, target }),
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

    resolveTransition(config, { context: { ok: true }, event: { type: 'GO' }, state: 'a' }, ({ passed }) =>
      guardCalls.push({ passed }),
    );

    expect(guardCalls[0]?.passed).toBe(true);
  });
});

describe('MachineError properties', () => {
  it('sets .code and .details correctly', () => {
    expect.assertions(4);

    try {
      define({
        initial: 'missing',
        states: { idle: {} },
      } as unknown as import('../index.js').MachineConfig<string, object, import('../index.js').MachineEvent>);
    } catch (err) {
      expect(err).toBeInstanceOf(MachineError);

      const machineErr = err as MachineError;

      expect(machineErr.code).toBe('MACHINE_INVALID_INITIAL_STATE');
      expect(machineErr.details).toBeDefined();
      expect(machineErr.name).toBe('MachineError');
    }
  });

  it('sets .details with relevant context on MACHINE_UNKNOWN_TARGET', () => {
    expect.assertions(3);

    type Event = { type: 'GO' };

    try {
      define<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [{ target: 'ghost' as 'idle' }] } } },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(MachineError);

      const machineErr = err as MachineError;

      expect(machineErr.code).toBe('MACHINE_UNKNOWN_TARGET');
      expect(machineErr.details?.target).toBe('ghost');
    }
  });
});

describe('debugInterpret — invoke lifecycle events', () => {
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

    const m = debugInterpret(config);

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

    const m = debugInterpret(config);

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

    const m = debugInterpret(config);

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

    const def = define<'done' | 'working', Record<string, never>, Event>({
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

    const def = define<'cancelled' | 'done' | 'working', Record<string, never>, Event>({
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

describe('MachineError.is()', () => {
  it('returns true for MachineError instances', () => {
    try {
      define({ initial: 'missing', states: { idle: {} } } as unknown as MachineConfig<string, object, MachineEvent>);
    } catch (err) {
      expect(MachineError.is(err)).toBe(true);
    }

    expect.assertions(1);
  });

  it('returns false for non-MachineError values', () => {
    expect(MachineError.is(new Error('plain'))).toBe(false);
    expect(MachineError.is(null)).toBe(false);
    expect(MachineError.is('string')).toBe(false);
    expect(MachineError.is(42)).toBe(false);
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

    let reentrantResult: string | undefined;

    const def = define<'end' | 'middle' | 'start', Record<string, never>, Event>({
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

    const def = define<'idle', { count: number }, Event>({
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

    const def = define<'a' | 'b', { n: number }, Event>({
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

    expect(() => {
      define<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { invoke: [] } },
      });
    }).toThrow(MachineError);
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

    const def = define<'a' | 'b', { skip: boolean }, Event>({
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

    const def = define<'a' | 'b', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', { n: number }, Event>({
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

    expect(() => {
      define<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: NaN, target: 'b' }] },
          b: {},
        },
      });
    }).toThrow(MachineError);
  });

  it('throws for Infinity delay', () => {
    type Event = { type: 'GO' };

    expect(() => {
      define<'a' | 'b', Record<string, never>, Event>({
        initial: 'a',
        states: {
          a: { after: [{ delay: Infinity, target: 'b' }] },
          b: {},
        },
      });
    }).toThrow(MachineError);
  });
});

describe('queue cleared on validateContext throw', () => {
  it('does not process stale queued events after a validateContext error in a re-entrant action', () => {
    type Event = { type: 'A' } | { type: 'B' };

    let calls = 0;

    const def = define<'end' | 'middle' | 'start', { valid: boolean }, Event>({
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

    expect(() => m.send({ type: 'A' })).toThrow(MachineError);

    expect(m.state.value).toBe('start');

    const result = m.send({ type: 'B' });

    expect(result.status).toBe('rejected');
    m.dispose();
  });
});

describe('TransitionInput export', () => {
  it('is exported from the package index', async () => {
    const mod = await import('../index.js');

    expect(typeof (mod as Record<string, unknown>).machine).toBe('function');
    expect('machine' in mod).toBe(true);
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

    const def = define<'a' | 'b', Ctx, Event>({
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

    const def = define<'a' | 'b', { count: number }, Event>({
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

    define<'a' | 'b', Ctx, Event>({
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

    const def = define<'end' | 'middle' | 'start', Record<string, never>, Event>({
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

    const def = define<'a' | 'b', { n: number }, Event>({
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

  it('throws MachineError with the string message when validateContext returns a string', () => {
    type Event = { type: 'GO' };

    let errorDetails: unknown;

    const def = define<'a' | 'b', { n: number }, Event>({
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

    expect(errorDetails).toBeInstanceOf(MachineError);
  });

  it('validateContext receives the current context snapshot after each transition', () => {
    type Event = { type: 'INC' };

    const calls: number[] = [];

    const def = define<'idle', { count: number }, Event>({
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
