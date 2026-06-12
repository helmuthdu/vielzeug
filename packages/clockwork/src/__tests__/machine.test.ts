import { effect } from '@vielzeug/ripple';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { debugInterpret } from '../devtools.js';
import {
  defineMachine,
  interpret,
  type MachineConfig,
  MachineError,
  type MachineEvent,
  type MachineSnapshot,
  type MiddlewareFn,
  resolveTransition,
} from '../index.js';

type TrafficEvent = { type: 'NEXT' };

const trafficDefinition = defineMachine<'green' | 'red' | 'yellow', Record<string, never>, TrafficEvent>({
  initial: 'green',
  states: {
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

    const m = interpret(machine);

    m.send({ type: 'INC' });
    m.send({ type: 'INC' });
    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(3);
  });

  it('matches() returns true for current state', () => {
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

  it('self-transition re-runs entry/exit', () => {
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

    const m = interpret(machine);

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

    order.length = 0;
    m.send({ type: 'GO' });

    expect(order).toEqual(['a:exit', 'action', 'b:entry']);
  });

  it('context validation failure rolls back', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', { count: number }, Event>({
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
      validateContext: (ctx) => ctx.count >= 0,
    });

    const m = interpret(machine);

    expect(() => m.send({ type: 'GO' })).toThrow(MachineError);
    expect(m.state.value).toBe('a');
    expect(m.context.value.count).toBe(0);
  });
});

describe('shorthand transition syntax', () => {
  it('single object (non-array) works like array syntax', () => {
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

describe('snapshot and hydration', () => {
  it('snapshot context is deep-cloned', () => {
    type Event = { type: 'SET'; value: number };

    const machine = defineMachine<'idle', { nested: { value: number } }, Event>({
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

    const m = interpret(machine);
    const snap = m.getSnapshot();

    (snap.context as { nested: { value: number } }).nested.value = 999;
    expect(m.context.value.nested.value).toBe(1);
  });

  it('hydrates from snapshot and skips initial entry', () => {
    type Event = { type: 'NOOP' };

    const entrySpy = vi.fn();

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: { idle: { entry: entrySpy, on: { NOOP: [{ target: 'idle' }] } } },
    });

    const m = interpret(machine, { snapshot: { context: { count: 10 }, state: 'idle' } });

    expect(m.context.value.count).toBe(10);
    expect(entrySpy).not.toHaveBeenCalled();
  });

  it('invokes run after hydration', async () => {
    type Event = { type: 'LOADED' };

    const machine = defineMachine<'done' | 'loading', { loaded: boolean }, Event>({
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

    const m = interpret(machine, { snapshot: { context: { loaded: false }, state: 'loading' } });

    await flush();

    expect(m.state.value).toBe('done');
    expect(m.context.value.loaded).toBe(true);
  });
});

describe('typed events', () => {
  it('enforces event payload types via discriminated union', () => {
    type Event = { type: 'INC' } | { type: 'SET'; value: number };

    const machine = defineMachine<'idle', { value: number }, Event>({
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

    const m = interpret(machine);

    m.send({ type: 'INC' });
    m.send({ type: 'SET', value: 7 });

    expect(m.context.value.value).toBe(7);
  });

  it('resolveTransition as pure transition selector', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: true },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    });

    const result = resolveTransition(machine, { context: { ok: true }, event: { type: 'GO' }, state: 'a' });

    expect(result?.target).toBe('b');
  });
});

describe('invokes', () => {
  it('maps onDone result to event and transitions', async () => {
    type Event = { type: 'RESOLVE'; value: number };

    const machine = defineMachine<'done' | 'loading', { value: number }, Event>({
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

    const m = interpret(machine);

    await flush();

    expect(m.state.value).toBe('done');
    expect(m.context.value.value).toBe(5);
  });

  it('maps onError to event', async () => {
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
          on: { CANCEL: [{ target: 'idle' }], RESOLVE: [{ target: 'loading' }] },
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

  it('does not transition after dispose', async () => {
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

  it('uses custom clone function', () => {
    type Event = { type: 'INC' };

    const customClone = vi.fn((v: unknown) => JSON.parse(JSON.stringify(v)));

    const machine = defineMachine<'idle', { count: number }, Event>({
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

    const m = interpret(machine, { clone: customClone as <T>(v: T) => T });

    m.send({ type: 'INC' });

    expect(customClone).toHaveBeenCalled();
    expect(m.context.value.count).toBe(1);
  });
});

describe('debug options', () => {
  it('fires debug events with onGuard callback', () => {
    type Event = { type: 'GO' };

    const onDebug = vi.fn();

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    });

    const m = interpret(machine, { debug: { onDebug, traceLimit: 10 } });

    expect(m.send({ type: 'GO' })).toBe(false);

    const guardEvent = onDebug.mock.calls.find((c) => c[0].type === 'guard');

    expect(guardEvent).toBeDefined();
    expect(guardEvent![0].passed).toBe(false);

    const skippedEvent = onDebug.mock.calls.find((c) => c[0].type === 'transition-skipped');

    expect(skippedEvent).toBeDefined();
  });

  it('onTransition called after successful transitions', () => {
    const onTransition = vi.fn();
    const m = interpret(trafficDefinition, { debug: { onTransition } });

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(onTransition).toHaveBeenCalledTimes(2);
    expect(onTransition).toHaveBeenNthCalledWith(1, { event: { type: 'NEXT' }, from: 'green', to: 'yellow' });
    expect(onTransition).toHaveBeenNthCalledWith(2, { event: { type: 'NEXT' }, from: 'yellow', to: 'red' });
  });

  it('onTransition not called when guard fails', () => {
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

    interpret(machine, { debug: { onTransition } }).send({ type: 'GO' });

    expect(onTransition).not.toHaveBeenCalled();
  });

  it('trace buffer as circular ring', () => {
    const m = interpret(trafficDefinition, { debug: { traceLimit: 2 } });

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

    const machine = defineMachine<'a' | 'b', { n: number }, Event>({
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

    const m = interpret(machine, { persistence: { load: () => snapshot, save } });

    expect(m.context.value.n).toBe(2);

    m.send({ type: 'NEXT' });

    expect(save).toHaveBeenCalled();
  });

  it('does NOT save snapshot on hydrate', () => {
    type Event = { type: 'GO' };

    const save = vi.fn();

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    interpret(machine, { persistence: { load: () => ({ context: {}, state: 'a' as const }), save } });

    expect(save).not.toHaveBeenCalled();
  });
});

describe('subscribe', () => {
  it('calls subscriber on state change', () => {
    const m = interpret(trafficDefinition);
    const snapshots: Array<MachineSnapshot<string, Record<string, never>>> = [];

    m.subscribe((snap) => snapshots.push(snap));

    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].state).toBe('yellow');
    expect(snapshots[1].state).toBe('red');
  });

  it('returns unsubscribe function', () => {
    const m = interpret(trafficDefinition);
    const snapshots: Array<MachineSnapshot<string, Record<string, never>>> = [];

    const unsub = m.subscribe((snap) => snapshots.push(snap));

    m.send({ type: 'NEXT' });
    unsub();
    m.send({ type: 'NEXT' });

    expect(snapshots).toHaveLength(1);
  });

  it('unsubscribing inside a subscriber callback stops further notifications', () => {
    const m = interpret(trafficDefinition);
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

describe('middleware', () => {
  it('intercepts and allows events', () => {
    type Event = { type: 'GO' };

    const log: string[] = [];

    const logger: MiddlewareFn<'a' | 'b', Record<string, never>, Event> = (event, _snap, next) => {
      log.push(`before:${event.type}`);

      const result = next();

      log.push(`after:${event.type}:${result}`);

      return result;
    };

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine, { middleware: [logger] });

    m.send({ type: 'GO' });

    expect(m.state.value).toBe('b');
    expect(log).toEqual(['before:GO', 'after:GO:true']);
  });

  it('blocks events', () => {
    type Event = { type: 'GO' };

    const blocker: MiddlewareFn<'a' | 'b', Record<string, never>, Event> = () => false;

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine, { middleware: [blocker] });

    expect(m.send({ type: 'GO' })).toBe(false);
    expect(m.state.value).toBe('a');
  });

  it('chains multiple middleware in order', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const mw1: MiddlewareFn<'a' | 'b', Record<string, never>, Event> = (_event, _snap, next) => {
      order.push('mw1:before');

      const r = next();

      order.push('mw1:after');

      return r;
    };

    const mw2: MiddlewareFn<'a' | 'b', Record<string, never>, Event> = (_event, _snap, next) => {
      order.push('mw2:before');

      const r = next();

      order.push('mw2:after');

      return r;
    };

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    interpret(machine, { middleware: [mw1, mw2] }).send({ type: 'GO' });

    expect(order).toEqual(['mw1:before', 'mw2:before', 'mw2:after', 'mw1:after']);
  });
});

describe('hierarchical states', () => {
  it('resolves initial state to leaf substate', () => {
    type Event = { type: 'DONE' } | { type: 'RETRY' };

    const machine = defineMachine<'idle' | 'loading', Record<string, never>, Event>({
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

    const m = interpret(machine);

    expect(m.state.value).toBe('loading.fetching');
    expect(m.matches('loading')).toBe(true);
    expect(m.matches('loading.fetching')).toBe(true);
  });

  it('events bubble up to parent state', () => {
    type Event = { type: 'DONE' } | { type: 'RETRY' };

    const machine = defineMachine<'idle' | 'loading', Record<string, never>, Event>({
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

    const m = interpret(machine);

    m.send({ type: 'DONE' });

    expect(m.state.value).toBe('idle');
  });

  it('transitions between sibling substates', () => {
    type Event = { type: 'DONE' } | { type: 'RETRY' };

    const machine = defineMachine<'idle' | 'loading', Record<string, never>, Event>({
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

    const m = interpret(machine);

    m.send({ type: 'RETRY' });
    expect(m.state.value).toBe('loading.retrying');

    m.send({ type: 'RETRY' });
    expect(m.state.value).toBe('loading.fetching');
  });

  it('runs entry/exit in hierarchical order', () => {
    type Event = { type: 'GO' };

    const order: string[] = [];

    const machine = defineMachine<'idle' | 'loading', Record<string, never>, Event>({
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

    const m = interpret(machine);

    expect(order).toEqual(['loading:entry', 'fetching:entry']);

    order.length = 0;
    m.send({ type: 'GO' });

    expect(order).toEqual(['fetching:exit', 'loading:exit', 'idle:entry']);
  });

  it('validates compound states require initial', () => {
    type Event = { type: 'GO' };

    expect(() => {
      defineMachine<'a', Record<string, never>, Event>({
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

    const machine = defineMachine<'idle' | 'timeout', Record<string, never>, Event>({
      initial: 'idle',
      states: {
        idle: {
          after: [{ delay: 1000, target: 'timeout' }],
          on: { RESET: { target: 'idle' } },
        },
        timeout: {},
      },
    });

    const m = interpret(machine);

    expect(m.state.value).toBe('idle');

    vi.advanceTimersByTime(999);
    expect(m.state.value).toBe('idle');

    vi.advanceTimersByTime(1);
    expect(m.state.value).toBe('timeout');
  });

  it('cancels timer on state exit', () => {
    vi.useFakeTimers();

    type Event = { type: 'GO' };

    const machine = defineMachine<'a' | 'b' | 'c', Record<string, never>, Event>({
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

    const m = interpret(machine);

    m.send({ type: 'GO' });
    vi.advanceTimersByTime(1000);

    expect(m.state.value).toBe('b');
  });

  it('respects guard on after transition', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const machine = defineMachine<'a' | 'b', { ready: boolean }, Event>({
      context: { ready: false },
      initial: 'a',
      states: {
        a: {
          after: [{ delay: 100, guard: ({ context }) => context.ready, target: 'b' }],
        },
        b: {},
      },
    });

    const m = interpret(machine);

    vi.advanceTimersByTime(100);
    expect(m.state.value).toBe('a');
  });

  it('runs actions on after transition', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const machine = defineMachine<'a' | 'b', { count: number }, Event>({
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

    const m = interpret(machine);

    vi.advanceTimersByTime(200);

    expect(m.state.value).toBe('b');
    expect(m.context.value.count).toBe(42);
  });

  it('does not fire after dispose', () => {
    vi.useFakeTimers();

    type Event = { type: 'NOOP' };

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { after: [{ delay: 100, target: 'b' }] },
        b: {},
      },
    });

    const m = interpret(machine);

    m[Symbol.dispose]();
    vi.advanceTimersByTime(200);

    expect(m.state.value).toBe('a');
  });
});

describe('validation', () => {
  it('throws for unknown initial state', () => {
    expect(() => {
      defineMachine({
        initial: 'missing',
        states: { idle: {} },
      } as unknown as MachineConfig<string, object, MachineEvent>);
    }).toThrow(MachineError);
  });

  it('throws for unknown transition target', () => {
    type Event = { type: 'GO' };

    expect(() => {
      defineMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [{ target: 'missing' as 'idle' }] } } },
      });
    }).toThrow(MachineError);
  });

  it('throws for empty transition array', () => {
    type Event = { type: 'GO' };

    expect(() => {
      defineMachine<'idle', Record<string, never>, Event>({
        initial: 'idle',
        states: { idle: { on: { GO: [] } } },
      });
    }).toThrow(MachineError);
  });

  it('throws for negative after delay', () => {
    type Event = { type: 'NOOP' };

    expect(() => {
      defineMachine<'a' | 'b', Record<string, never>, Event>({
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

    const machine = defineMachine<'loading' | 'success' | 'timeout', Record<string, never>, Event>({
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

    const m = interpret(machine);

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
      defineMachine<'a' | 'b', Record<string, never>, Event>({
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
      defineMachine<'a' | 'b', Record<string, never>, Event>({
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
      defineMachine<'a' | 'b', Record<string, never>, Event>({
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

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: true },
      initial: 'a',
      states: {
        a: { on: { GO: { guard: ({ context }) => context.ok, target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine);

    expect(m.can({ type: 'GO' })).toBe(true);
  });

  it('returns false for unknown event type', () => {
    const m = interpret(trafficDefinition);

    // @ts-expect-error unknown event
    expect(m.can({ type: 'UNKNOWN' })).toBe(false);
  });
});

describe('getSnapshot()', () => {
  it('returns deep-cloned snapshot independent of live context', () => {
    type Event = { type: 'SET'; value: number };

    const machine = defineMachine<'idle', { n: number }, Event>({
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

    const m = interpret(machine);
    const snap = m.getSnapshot();

    m.send({ type: 'SET', value: 99 });

    expect(snap.context.n).toBe(1);
    expect(m.context.value.n).toBe(99);
    expect(snap.state).toBe('idle');
  });
});

describe('maxTransitionsPerFlush via middleware path', () => {
  it('enforces maxTransitionsPerFlush when middleware is active', () => {
    expect(() => {
      interpret(trafficDefinition, {
        maxTransitionsPerFlush: 0,
        middleware: [(_event, _snap, next) => next()],
      });
    }).toThrow(MachineError);
  });
});

describe('validateContext at init', () => {
  it('throws when initial context fails validateContext', () => {
    type Event = { type: 'NOOP' };

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: -1 },
      initial: 'idle',
      states: { idle: {} },
      validateContext: (ctx) => ctx.count >= 0,
    });

    expect(() => interpret(machine)).toThrow(MachineError);
  });
});

describe('subscribe — no spurious fire', () => {
  it('does not call subscriber when event is ignored (no transition)', () => {
    const m = interpret(trafficDefinition);
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

    const machine = defineMachine<'a' | 'b' | 'c', Record<string, never>, Event>({
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

    const m = interpret(machine);

    vi.advanceTimersByTime(100);
    expect(m.state.value).toBe('b');
  });
});

describe('persistence.clear', () => {
  it('adapter clear() is callable', () => {
    type Event = { type: 'GO' };

    const clear = vi.fn();
    const save = vi.fn();

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    const m = interpret(machine, { persistence: { clear, load: () => undefined, save } });

    m[Symbol.dispose]();
    clear();

    expect(clear).toHaveBeenCalled();
  });
});

describe('getTrace — no traceLimit', () => {
  it('returns empty array when traceLimit is not set', () => {
    const m = interpret(trafficDefinition);

    m.send({ type: 'NEXT' });

    expect(m.getTrace()).toHaveLength(0);
  });

  it('returns only filled entries when fewer transitions than traceLimit', () => {
    const m = interpret(trafficDefinition, { debug: { traceLimit: 10 } });

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

    const machine = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { GO: [{ target: 'b' }] } },
        b: {},
      },
    });

    const m = interpret(machine, { debug: { traceLimit: 10 } });

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

    const m = debugInterpret(trafficDefinition);

    expect(m.state.value).toBe('green');
    m.send({ type: 'NEXT' });
    expect(m.state.value).toBe('yellow');

    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('NEXT: green → yellow'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('guard'));

    vi.restoreAllMocks();
  });

  it('returns a MachineInstance with the same API as interpret', () => {
    const m = debugInterpret(trafficDefinition);

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

    const m = debugInterpret(trafficDefinition);

    // @ts-expect-error unknown event
    m.send({ type: 'UNKNOWN' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('no matching transition'));

    vi.restoreAllMocks();
  });
});

describe('snapshot hierarchical state validation', () => {
  it('accepts a valid nested snapshot state', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'idle' | 'active', Record<string, never>, Event>({
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

    expect(() =>
      interpret(machine, { snapshot: { context: {}, state: 'active.running' as 'idle' | 'active' } }),
    ).not.toThrow();
  });

  it('rejects a snapshot with a non-existent nested state', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'idle' | 'active', Record<string, never>, Event>({
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

    expect(() =>
      interpret(machine, { snapshot: { context: {}, state: 'active.nonexistent' as 'idle' | 'active' } }),
    ).toThrow(MachineError);
  });
});

describe('re-entrant send', () => {
  it('queues events sent inside an action and processes them after the current transition', () => {
    type Event = { type: 'A' } | { type: 'B' };

    const machine = defineMachine<'start' | 'middle' | 'end', Record<string, never>, Event>({
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

    const m = interpret(machine);

    m.send({ type: 'A' });

    expect(m.state.value).toBe('end');
  });
});

describe('matches() edge cases', () => {
  it('returns false with no arguments', () => {
    const m = interpret(trafficDefinition);

    expect(m.matches()).toBe(false);
  });

  it('returns false after dispose', () => {
    const m = interpret(trafficDefinition);

    m[Symbol.dispose]();

    expect(m.matches('green')).toBe(false);
  });

  it('returns true for a parent state when in a child state', () => {
    type Event = { type: 'GO' };

    const machine = defineMachine<'idle' | 'active', Record<string, never>, Event>({
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

    const m = interpret(machine);

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

    const machine = defineMachine<'a' | 'b' | 'c', { ok: boolean }, Event>({
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
    });

    const guardCalls: Array<{ passed: boolean; target: string }> = [];

    const result = resolveTransition(
      machine,
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

    const machine = defineMachine<'a' | 'b', { ok: boolean }, Event>({
      context: { ok: true },
      initial: 'a',
      states: {
        a: { on: { GO: [{ guard: ({ context }) => context.ok, target: 'b' }] } },
        b: {},
      },
    });

    const guardCalls: Array<{ passed: boolean }> = [];

    resolveTransition(machine, { context: { ok: true }, event: { type: 'GO' }, state: 'a' }, ({ passed }) =>
      guardCalls.push({ passed }),
    );

    expect(guardCalls[0]?.passed).toBe(true);
  });
});

describe('MachineError properties', () => {
  it('sets .code and .details correctly', () => {
    expect.assertions(4);

    try {
      defineMachine({
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
      defineMachine<'idle', Record<string, never>, Event>({
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

    const m = debugInterpret(machine);

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

    const machine = defineMachine<'failed' | 'loading', Record<string, never>, Event>({
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
    });

    const m = debugInterpret(machine);

    await flush();

    expect(m.state.value).toBe('failed');
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('error'), expect.anything());
  });

  it('logs invoke-abort when state is exited before invoke completes', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    type Event = { type: 'CANCEL' };

    const machine = defineMachine<'idle' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        idle: {},
        loading: {
          invoke: [{ src: () => new Promise(() => {}) }],
          on: { CANCEL: [{ target: 'idle' }] },
        },
      },
    });

    const m = debugInterpret(machine);

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

    const machine = defineMachine<'done' | 'working', Record<string, never>, Event>({
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

    const m = interpret(machine);

    expect(m.state.value).toBe('working.step1');

    vi.advanceTimersByTime(1000);

    expect(m.state.value).toBe('done');
  });

  it('cancels compound-state after-timer when transitioning out via event', () => {
    vi.useFakeTimers();

    type Event = { type: 'ABORT' };

    const machine = defineMachine<'cancelled' | 'done' | 'working', Record<string, never>, Event>({
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

    const m = interpret(machine);

    m.send({ type: 'ABORT' });
    vi.advanceTimersByTime(1000);

    expect(m.state.value).toBe('cancelled');
  });
});

describe('subscribe after dispose', () => {
  it('does not fire subscriber callback after dispose', () => {
    const m = interpret(trafficDefinition);
    const calls: unknown[] = [];

    m.subscribe((snap) => calls.push(snap));
    m[Symbol.dispose]();

    m.send({ type: 'NEXT' });

    expect(calls).toHaveLength(0);
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

    const machine = defineMachine<'a' | 'b', Ctx, Event>({
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

    interpret(machine);

    vi.advanceTimersByTime(250);

    expect(captured).not.toBeNull();
    expect(captured!.type).toBe('$after');
    expect(captured!.delay).toBe(250);
  });
});
