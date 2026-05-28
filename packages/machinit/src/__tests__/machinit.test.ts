import { effect } from '@vielzeug/stateit';
import { describe, expect, it, vi } from 'vitest';

import { assign, defineMachine, interpret, setup, type MachineEvent } from '../index.js';

type TrafficEvent = { type: 'NEXT' };
type CounterEvent = { type: 'DECREMENT' } | { type: 'INCREMENT' } | { type: 'RESET' };

const trafficDefinition = defineMachine<'green' | 'red' | 'yellow', Record<string, never>, TrafficEvent>({
  initial: 'green',
  states: {
    green: { on: { NEXT: [{ target: 'yellow' }] } },
    red: { on: { NEXT: [{ target: 'green' }] } },
    yellow: { on: { NEXT: [{ target: 'red' }] } },
  },
});

const counterDefinition = defineMachine<'idle', { count: number }, CounterEvent>({
  context: { count: 0 },
  initial: 'idle',
  states: {
    idle: {
      on: {
        DECREMENT: [{ actions: [assign(({ context }) => ({ count: context.count - 1 }))], target: 'idle' }],
        INCREMENT: [{ actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }],
        RESET: [{ actions: [assign(() => ({ count: 0 }))], target: 'idle' }],
      },
    },
  },
});

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('defineMachine + interpret', () => {
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

  it('returns false for unknown event', () => {
    const m = interpret(trafficDefinition);

    // @ts-expect-error invalid event
    expect(m.send({ type: 'UNKNOWN' })).toBe(false);
  });

  it('provides stable snapshot copy', () => {
    const m = interpret(counterDefinition);
    const snap = m.getSnapshot();

    expect(snap).toEqual({ context: { count: 0 }, state: 'idle' });

    // @ts-expect-error readonly snapshot state
    snap.state = 'other';
    // @ts-expect-error readonly snapshot context reference
    snap.context = { count: 2 };

    (snap.context as { count: number }).count = 100;
    expect(m.context.value.count).toBe(0);
  });

  it('dispose prevents can/send', () => {
    const m = interpret(trafficDefinition);

    m[Symbol.dispose]();

    expect(m.can({ type: 'NEXT' })).toBe(false);
    expect(m.send({ type: 'NEXT' })).toBe(false);
  });
});

describe('typed event union input (F1)', () => {
  it('enforces event payload shapes', () => {
    type Event = { type: 'INC' } | { type: 'SET'; value: number };

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [{ actions: [assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }],
            SET: [
              {
                actions: [assign(({ event }) => ({ count: event.value }))],
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

    // @ts-expect-error missing required value payload
    const _invalidEvent: Event = { type: 'SET' };

    expect(m.context.value.count).toBe(7);
  });
});

describe('async invoke support (F2)', () => {
  it('dispatches mapped onDone event', async () => {
    type Event = { type: 'RESOLVE'; value: number };

    const machine = defineMachine<'done' | 'loading', { value: number }, Event>({
      context: { value: 0 },
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [
            {
              onDone: (result) => ({ type: 'RESOLVE', value: result as number }),
              src: async () => 5,
            },
          ],
          on: {
            RESOLVE: [
              {
                actions: [assign(({ event }) => ({ value: event.value }))],
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

  it('dispatches mapped onError event', async () => {
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
                actions: [assign(({ event }) => ({ reason: event.reason }))],
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

  it('aborts in-flight invokes on state exit', async () => {
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
                    if (!signal.aborted) {
                      resolve();
                    }
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

    expect(m.send({ type: 'CANCEL' })).toBe(true);
    resolveWork?.();
    await flush();

    expect(m.state.value).toBe('idle');
  });
});

describe('snapshot restore/hydration (F3)', () => {
  it('restores state/context and skips initial entry', () => {
    type Event = { type: 'NOOP' };

    const machine = defineMachine<'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          entry: assign(({ context }) => ({ count: context.count + 1 })),
          on: { NOOP: [{ target: 'idle' }] },
        },
      },
    });

    const m = interpret(machine, { snapshot: { context: { count: 10 }, state: 'idle' } });

    expect(m.context.value.count).toBe(10);
  });

  it('starts invokes for hydrated state', async () => {
    type Event = { type: 'RESOLVE' };

    const src = vi.fn(async () => 1);
    const machine = defineMachine<'done' | 'loading', Record<string, never>, Event>({
      initial: 'loading',
      states: {
        done: {},
        loading: {
          invoke: [{ onDone: () => ({ type: 'RESOLVE' }), src }],
          on: { RESOLVE: [{ target: 'done' }] },
        },
      },
    });

    const m = interpret(machine, {
      snapshot: { context: {}, state: 'loading' },
    });

    await flush();

    expect(src).toHaveBeenCalledTimes(1);
    expect(m.state.value).toBe('done');
  });
});

describe('definition/runtime separation (F4)', () => {
  it('interprets machine definition returned from setup().define()', () => {
    type Event = { type: 'INC' };

    const h = setup<{ count: number }, Event>();
    const definition = h.define({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: [{ actions: [h.assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' }],
          },
        },
      },
    });

    const m = interpret(definition);

    m.send({ type: 'INC' });

    expect(m.context.value.count).toBe(1);
  });

  it('supports plain-data JSON round-trip definitions', () => {
    type Event = { type: 'NEXT' };

    const definition = defineMachine<'a' | 'b', Record<string, never>, Event>({
      initial: 'a',
      states: {
        a: { on: { NEXT: [{ target: 'b' }] } },
        b: {},
      },
    });

    const serialized = JSON.stringify(definition);
    const revived = JSON.parse(serialized) as typeof definition;
    const m = interpret(revived);

    m.send({ type: 'NEXT' });

    expect(m.state.value).toBe('b');
  });
});

describe('validation and failure behavior', () => {
  it('throws for unknown initial state', () => {
    expect(() => {
      interpret(
        defineMachine({
          initial: 'missing',
          states: { idle: {} },
        } as unknown as {
          initial: 'missing';
          states: { idle: Record<string, never> };
        }),
      );
    }).toThrow(/initial state/);
  });

  it('throws for transition targeting unknown state', () => {
    type Event = { type: 'GO' };

    expect(() => {
      interpret(
        defineMachine<'idle', Record<string, never>, Event>({
          initial: 'idle',
          states: {
            idle: {
              on: { GO: [{ target: 'missing' as 'idle' }] },
            },
          },
        }),
      );
    }).toThrow(/unknown state/);
  });

  it('throws action errors and does not commit transition', () => {
    type Event = { type: 'FAIL' };

    const machine = defineMachine<'done' | 'idle', { count: number }, Event>({
      context: { count: 0 },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            FAIL: [
              {
                actions: [
                  () => {
                    throw new Error('boom');
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

    expect(() => m.send({ type: 'FAIL' })).toThrow('boom');
    expect(m.state.value).toBe('idle');
    expect(m.context.value.count).toBe(0);
  });

  it('does not run transition actions when guard fails', () => {
    type Event = { type: 'GO' };

    const action = vi.fn();
    const machine = defineMachine<'done' | 'idle', { ok: boolean }, Event>({
      context: { ok: false },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            GO: [{ actions: [action], guard: ({ context }) => context.ok, target: 'done' }],
          },
        },
      },
    });

    const m = interpret(machine);

    expect(m.send({ type: 'GO' })).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it('accepts broad MachineEvent union when explicitly requested', () => {
    const machine = defineMachine<'idle', Record<string, never>, MachineEvent>({
      initial: 'idle',
      states: {
        idle: { on: { ANY: [{ target: 'idle' }] } },
      },
    });

    const m = interpret(machine);

    expect(m.send({ type: 'ANY', value: 1 })).toBe(true);
  });
});
