import { effect } from '@vielzeug/stateit';
import { describe, expect, it, vi } from 'vitest';

import { assign, createMachine, setup } from '../index.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const trafficMachine = () =>
  createMachine({
    initial: 'green',
    states: {
      green: { on: { NEXT: { target: 'yellow' } } },
      red: { on: { NEXT: { target: 'green' } } },
      yellow: { on: { NEXT: { target: 'red' } } },
    },
  });

const counterMachine = () =>
  createMachine({
    context: { count: 0 },
    initial: 'idle',
    states: {
      idle: {
        on: {
          DECREMENT: {
            actions: [assign<{ count: number }>(({ context }) => ({ count: context.count - 1 }))],
            target: 'idle',
          },
          INCREMENT: {
            actions: [assign<{ count: number }>(({ context }) => ({ count: context.count + 1 }))],
            target: 'idle',
          },
          RESET: { actions: [assign<{ count: number }>(() => ({ count: 0 }))], target: 'idle' },
        },
      },
    },
  });

// ── Basics ────────────────────────────────────────────────────────────────────

describe('createMachine — basics', () => {
  it('starts in the initial state', () => {
    const m = trafficMachine();

    expect(m.state.value).toBe('green');
  });

  it('.state is a ReadonlySignal (no value setter)', () => {
    const m = trafficMachine();

    // @ts-expect-error — state is readonly
    expect(() => {
      m.state.value = 'red';
    }).toThrow();
  });

  it('.state is reactive — effect re-runs on state change', () => {
    const m = trafficMachine();
    const states: string[] = [];

    effect(() => {
      states.push(m.state.value);
    });
    m.send({ type: 'NEXT' });
    m.send({ type: 'NEXT' });
    expect(states).toEqual(['green', 'yellow', 'red']);
  });

  it('.context reflects the initial context value', () => {
    const m = counterMachine();

    expect(m.context.value).toEqual({ count: 0 });
  });

  it('.context is reactive — effect re-runs on context change', () => {
    const m = counterMachine();
    const counts: number[] = [];

    effect(() => {
      counts.push(m.context.value.count);
    });
    m.send({ type: 'INCREMENT' });
    m.send({ type: 'INCREMENT' });
    expect(counts).toEqual([0, 1, 2]);
  });
});

// ── send() ────────────────────────────────────────────────────────────────────

describe('send()', () => {
  it('returns true on a valid transition', () => {
    const m = trafficMachine();

    expect(m.send({ type: 'NEXT' })).toBe(true);
  });

  it('returns false for an unknown event in the current state', () => {
    const m = trafficMachine();

    // @ts-expect-error — UNKNOWN is not a valid event
    expect(m.send({ type: 'UNKNOWN' })).toBe(false);
  });

  it('transitions through a full green → yellow → red → green cycle', () => {
    const m = trafficMachine();

    m.send({ type: 'NEXT' });
    expect(m.state.value).toBe('yellow');
    m.send({ type: 'NEXT' });
    expect(m.state.value).toBe('red');
    m.send({ type: 'NEXT' });
    expect(m.state.value).toBe('green');
  });

  it('handles self-transitions (state → same state)', () => {
    const m = counterMachine();

    m.send({ type: 'INCREMENT' });
    expect(m.state.value).toBe('idle');
    expect(m.context.value.count).toBe(1);
  });

  it('ignores an event that is not defined in the current state', () => {
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {},
      },
    });

    m.send({ type: 'GO' });

    // @ts-expect-error — GO is not valid in state 'b'
    const result = m.send({ type: 'GO' });

    expect(result).toBe(false);
    expect(m.state.value).toBe('b');
  });

  it('allows a transition when guard returns true', () => {
    const m = createMachine({
      context: { isValid: true },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            SUBMIT: { guard: ({ context }) => context.isValid, target: 'done' },
          },
        },
      },
    });

    expect(m.send({ type: 'SUBMIT' })).toBe(true);
    expect(m.state.value).toBe('done');
  });

  it('blocks a transition when guard returns false', () => {
    const m = createMachine({
      context: { isValid: false },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            SUBMIT: { guard: ({ context }) => context.isValid, target: 'done' },
          },
        },
      },
    });

    expect(m.send({ type: 'SUBMIT' })).toBe(false);
    expect(m.state.value).toBe('idle');
  });

  it('evaluates guard before running any action', () => {
    const action = vi.fn();
    const m = createMachine({
      context: { ok: false },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            GO: { actions: [action], guard: ({ context }) => context.ok, target: 'done' },
          },
        },
      },
    });

    m.send({ type: 'GO' });
    expect(action).not.toHaveBeenCalled();
  });

  it('passes event payload to action', () => {
    const m = createMachine({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            ADD: {
              actions: [
                assign<{ count: number }, { amount: number; type: 'ADD' }>(({ context, event }) => ({
                  count: context.count + event.amount,
                })),
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ amount: 5, type: 'ADD' });
    expect(m.context.value.count).toBe(5);
  });
});

// ── assign() ──────────────────────────────────────────────────────────────────

describe('assign()', () => {
  it('updates context via a partial merge', () => {
    const m = counterMachine();

    m.send({ type: 'INCREMENT' });
    expect(m.context.value.count).toBe(1);
  });

  it('supports a RESET assign returning zeroed context', () => {
    const m = counterMachine();

    m.send({ type: 'INCREMENT' });
    m.send({ type: 'INCREMENT' });
    m.send({ type: 'RESET' });
    expect(m.context.value.count).toBe(0);
  });

  it('runs multiple assigns in array order', () => {
    const log: string[] = [];
    const m = createMachine({
      context: { value: '' },
      initial: 'idle',
      states: {
        idle: {
          on: {
            GO: {
              actions: [
                assign<{ value: string }>(() => {
                  log.push('a');

                  return { value: 'a' };
                }),
                assign<{ value: string }>(() => {
                  log.push('b');

                  return { value: 'b' };
                }),
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ type: 'GO' });
    expect(log).toEqual(['a', 'b']);
    expect(m.context.value.value).toBe('b');
  });
});

// ── can() ─────────────────────────────────────────────────────────────────────

describe('can()', () => {
  it('returns true when transition exists and guard passes', () => {
    const m = trafficMachine();

    expect(m.can({ type: 'NEXT' })).toBe(true);
  });

  it('returns false for an unknown event', () => {
    const m = trafficMachine();

    // @ts-expect-error — UNKNOWN not in events
    expect(m.can({ type: 'UNKNOWN' })).toBe(false);
  });

  it('returns false when guard fails', () => {
    const m = createMachine({
      context: { ok: false },
      initial: 'idle',
      states: {
        done: {},
        idle: { on: { GO: { guard: ({ context }) => context.ok, target: 'done' } } },
      },
    });

    expect(m.can({ type: 'GO' })).toBe(false);
  });

  it('returns false for any event in a terminal-like state (no on)', () => {
    const m = createMachine({
      initial: 'done',
      states: { done: {} },
    });

    // @ts-expect-error — no events defined
    expect(m.can({ type: 'ANYTHING' })).toBe(false);
  });

  it('does not produce side effects when called', () => {
    const guard = vi.fn(() => true);
    const m = createMachine({
      initial: 'idle',
      states: {
        done: {},
        idle: { on: { GO: { guard, target: 'done' } } },
      },
    });

    m.can({ type: 'GO' });
    expect(m.state.value).toBe('idle'); // state unchanged
    expect(guard).toHaveBeenCalledTimes(1);
  });
});

// ── Actions & lifecycle ───────────────────────────────────────────────────────

describe('actions & lifecycle', () => {
  it('transition action updates context', () => {
    const m = counterMachine();

    m.send({ type: 'INCREMENT' });
    expect(m.context.value.count).toBe(1);
    m.send({ type: 'DECREMENT' });
    expect(m.context.value.count).toBe(0);
  });

  it('entry action fires when entering a state', () => {
    const entered: string[] = [];
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {
          entry: () => {
            entered.push('b');
          },
        },
      },
    });

    m.send({ type: 'GO' });
    expect(entered).toEqual(['b']);
  });

  it('exit action fires when leaving a state', () => {
    const exited: string[] = [];
    const m = createMachine({
      initial: 'a',
      states: {
        a: {
          exit: () => {
            exited.push('a');
          },
          on: { GO: { target: 'b' } },
        },
        b: {},
      },
    });

    m.send({ type: 'GO' });
    expect(exited).toEqual(['a']);
  });

  it('executes in order: exit → transition action → state change → entry', () => {
    const log: string[] = [];
    let stateAtEntry = '';
    const m = createMachine({
      initial: 'a',
      states: {
        a: {
          exit: () => {
            log.push('exit-a');
          },
          on: {
            GO: {
              actions: [
                () => {
                  log.push('action');
                },
              ],
              target: 'b',
            },
          },
        },
        b: {
          entry: ({ event }) => {
            log.push('entry-b');
            stateAtEntry = event.type;
          },
        },
      },
    });

    m.send({ type: 'GO' });
    expect(log).toEqual(['exit-a', 'action', 'entry-b']);
    expect(stateAtEntry).toBe('GO');
  });

  it('does not mutate the original config context object', () => {
    const initial = { count: 0 };
    const m = createMachine({
      context: initial,
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: {
              actions: [assign<{ count: number }>(({ context }) => ({ count: context.count + 1 }))],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ type: 'INC' });
    expect(initial.count).toBe(0); // original untouched
    expect(m.context.value.count).toBe(1);
  });

  it('accumulates context across multiple sends', () => {
    const m = counterMachine();

    m.send({ type: 'INCREMENT' });
    m.send({ type: 'INCREMENT' });
    m.send({ type: 'INCREMENT' });
    expect(m.context.value.count).toBe(3);
  });

  it('fires effects exactly once per send() via batch()', () => {
    const m = createMachine({
      context: { value: 0 },
      initial: 'idle',
      states: {
        idle: {
          entry: assign<{ value: number }>(({ context }) => ({ value: context.value + 10 })),
          exit: assign<{ value: number }>(({ context }) => ({ value: context.value + 1 })),
          on: {
            GO: {
              actions: [assign<{ value: number }>(({ context }) => ({ value: context.value + 100 }))],
              target: 'idle',
            },
          },
        },
      },
    });
    const effectRuns: number[] = [];

    effect(() => {
      effectRuns.push(m.context.value.value);
    });
    // baseline: 1 run for effect setup
    m.send({ type: 'GO' });
    // Should be exactly 2 total runs (initial + 1 per send)
    expect(effectRuns.length).toBe(2);
  });
});

// ── [Symbol.dispose] ─────────────────────────────────────────────────────────

describe('[Symbol.dispose]', () => {
  it('machine retains last state after disposal', () => {
    const m = trafficMachine();

    m.send({ type: 'NEXT' });
    m[Symbol.dispose]();
    expect(m.state.value).toBe('yellow');
  });

  it('supports using declaration semantics', () => {
    expect(() => {
      const m = trafficMachine();

      m[Symbol.dispose]();
    }).not.toThrow();
  });

  it('send() returns false after disposal', () => {
    const m = trafficMachine();

    m[Symbol.dispose]();
    expect(m.send({ type: 'NEXT' })).toBe(false);
    expect(m.state.value).toBe('green');
  });
});

// ── setup() ──────────────────────────────────────────────────────────────────

describe('setup()', () => {
  it('assign helper infers context type without explicit annotation', () => {
    const { assign: typedAssign } = setup<{ x: number }>();
    const m = createMachine({
      context: { x: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            INC: { actions: [typedAssign(({ context }) => ({ x: context.x + 1 }))], target: 'idle' },
          },
        },
      },
    });

    m.send({ type: 'INC' });
    expect(m.context.value.x).toBe(1);
  });

  it('guard helper infers context type without explicit annotation', () => {
    const { guard: typedGuard } = setup<{ allowed: boolean }>();
    const m = createMachine({
      context: { allowed: true },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            GO: { guard: typedGuard(({ context }) => context.allowed), target: 'done' },
          },
        },
      },
    });

    expect(m.send({ type: 'GO' })).toBe(true);
    expect(m.state.value).toBe('done');
  });

  it('guard blocks transition when context condition fails', () => {
    const { guard: typedGuard } = setup<{ allowed: boolean }>();
    const m = createMachine({
      context: { allowed: false },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            GO: { guard: typedGuard(({ context }) => context.allowed), target: 'done' },
          },
        },
      },
    });

    expect(m.send({ type: 'GO' })).toBe(false);
    expect(m.state.value).toBe('idle');
  });

  it('action helper provides a typed wrapper for side-effect actions', () => {
    const log: number[] = [];
    const { action: typedAction } = setup<{ count: number }>();
    const m = createMachine({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            TICK: {
              actions: [
                typedAction(({ context }) => {
                  log.push(context.count);
                }),
                assign<{ count: number }>(({ context }) => ({ count: context.count + 1 })),
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ type: 'TICK' });
    m.send({ type: 'TICK' });
    expect(log).toEqual([0, 1]);
  });

  it('assign with event type constraint accesses event payload', () => {
    const { assign: typedAssign } = setup<{ total: number }, { amount: number; type: 'ADD' }>();
    const m = createMachine({
      context: { total: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            ADD: {
              actions: [typedAssign(({ context, event }) => ({ total: context.total + event.amount }))],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ amount: 10, type: 'ADD' });
    m.send({ amount: 5, type: 'ADD' });
    expect(m.context.value.total).toBe(15);
  });

  it('create() integrates config with typed helpers', () => {
    const machine = setup<{ count: number }, { type: 'INC' } | { type: 'DEC' }>();
    const m = machine.create({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            DEC: { actions: [machine.assign(({ context }) => ({ count: context.count - 1 }))], target: 'idle' },
            INC: { actions: [machine.assign(({ context }) => ({ count: context.count + 1 }))], target: 'idle' },
          },
        },
      },
    });

    m.send({ type: 'INC' });
    expect(m.context.value.count).toBe(1);
    m.send({ type: 'DEC' });
    expect(m.context.value.count).toBe(0);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('machine with no context exposes empty context signal', () => {
    const m = trafficMachine();

    expect(m.context.value).toEqual({});
  });

  it('machine with all terminal states — all send() calls return false', () => {
    const m = createMachine({
      initial: 'done',
      states: { done: {} },
    });

    // @ts-expect-error — no events
    expect(m.send({ type: 'ANYTHING' })).toBe(false);
  });

  it('initial state entry action runs at construction with $init event', () => {
    let receivedEventType = '';

    createMachine({
      initial: 'start',
      states: {
        start: {
          entry: ({ event }) => {
            receivedEventType = event.type as string;
          },
        },
      },
    });
    expect(receivedEventType).toBe('$init');
  });

  it('initial state entry action can initialise context', () => {
    const m = createMachine({
      context: { ready: false },
      initial: 'start',
      states: {
        start: {
          entry: assign<{ ready: boolean }>(() => ({ ready: true })),
        },
      },
    });

    expect(m.context.value.ready).toBe(true);
  });

  it('multiple machines are independent instances', () => {
    const a = trafficMachine();
    const b = trafficMachine();

    a.send({ type: 'NEXT' });
    expect(a.state.value).toBe('yellow');
    expect(b.state.value).toBe('green');
  });

  it('inline action can directly mutate context fields', () => {
    const m = createMachine({
      context: { value: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            SET: {
              actions: [
                (args: { context: { value: number }; event: { amount: number; type: string } }) => {
                  args.context.value = args.event.amount;
                },
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ amount: 42, type: 'SET' });
    expect(m.context.value.value).toBe(42);
  });
});

// ── String shorthand for send() ───────────────────────────────────────────────

describe('send() string shorthand', () => {
  it('accepts string event type without object wrapper', () => {
    const m = trafficMachine();

    expect(m.send('NEXT')).toBe(true);
    expect(m.state.value).toBe('yellow');
  });

  it('accepts string event with payload object', () => {
    const m = createMachine({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            ADD: {
              actions: [
                assign<{ count: number }, { amount: number; type: 'ADD' }>(({ context, event }) => ({
                  count: context.count + event.amount,
                })),
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    expect(m.send('ADD', { amount: 5 })).toBe(true);
    expect(m.context.value.count).toBe(5);
  });

  it('payload cannot override event type', () => {
    const m = createMachine({
      initial: 'idle',
      states: {
        idle: {
          on: {
            ADD: { target: 'done' },
            EVIL: { target: 'evil' },
          },
        },
        done: {},
        evil: {},
      },
    });

    // Sending 'ADD' with payload that contains type: 'EVIL' should NOT override
    // The type should remain 'ADD' because it's explicitly passed as first arg
    expect(m.send('ADD', { type: 'EVIL' } as any)).toBe(true);
    expect(m.state.value).toBe('done'); // Should be in 'done', not 'evil'
  });

  it('returns false for unknown event passed as string', () => {
    const m = trafficMachine();

    // @ts-expect-error — UNKNOWN not valid
    expect(m.send('UNKNOWN')).toBe(false);
  });
});

// ── can() string shorthand ────────────────────────────────────────────────────

describe('can() string shorthand', () => {
  it('accepts string event type', () => {
    const m = trafficMachine();

    expect(m.can('NEXT')).toBe(true);
  });

  it('returns false for unknown event passed as string', () => {
    const m = trafficMachine();

    // @ts-expect-error — UNKNOWN not valid
    expect(m.can('UNKNOWN')).toBe(false);
  });

  it('respects guards with string shorthand', () => {
    const m = createMachine({
      context: { allowed: true },
      initial: 'idle',
      states: {
        done: {},
        idle: { on: { GO: { guard: ({ context }) => context.allowed, target: 'done' } } },
      },
    });

    expect(m.can('GO')).toBe(true);
  });
});

// ── getSnapshot() ─────────────────────────────────────────────────────────────

describe('getSnapshot()', () => {
  it('returns current state and context as plain object', () => {
    const m = counterMachine();

    const snap1 = m.getSnapshot();

    expect(snap1).toEqual({ context: { count: 0 }, state: 'idle' });

    m.send({ type: 'INCREMENT' });

    const snap2 = m.getSnapshot();

    expect(snap2).toEqual({ context: { count: 1 }, state: 'idle' });
  });

  it('returns independent context copy — mutation does not corrupt machine', () => {
    const m = createMachine({
      context: { value: 0 },
      initial: 'idle',
      states: { idle: {} },
    });

    const snap = m.getSnapshot();

    snap.context.value = 999;

    // Machine state unchanged
    expect(m.context.value.value).toBe(0);
    expect(m.getSnapshot().context.value).toBe(0);
  });

  it('snapshot properties are readonly (compile-time check)', () => {
    const m = counterMachine();
    const snap = m.getSnapshot();

    // These should cause TypeScript errors at compile time
    // @ts-expect-error — state is readonly
    snap.state = 'other';

    // @ts-expect-error — context is readonly
    snap.context = { count: 999 };

    // Verify the machine is unaffected
    expect(m.state.value).toBe('idle');
    expect(m.context.value.count).toBe(0);
  });

  it('each call returns independent snapshot objects', () => {
    const m = counterMachine();

    const snap1 = m.getSnapshot();
    const snap2 = m.getSnapshot();

    expect(snap1).toEqual(snap2);
    expect(snap1).not.toBe(snap2);
    expect(snap1.context).not.toBe(snap2.context);
  });
});

// ── subscribe() ───────────────────────────────────────────────────────────────

describe('subscribe()', () => {
  it('calls listener immediately with current snapshot', () => {
    const m = trafficMachine();
    const snapshots: any[] = [];

    m.subscribe((snap) => {
      snapshots.push(snap);
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual({ context: {}, state: 'green' });
  });

  it('calls listener on state change', () => {
    const m = trafficMachine();
    const snapshots: any[] = [];

    m.subscribe((snap) => {
      snapshots.push(snap);
    });

    m.send({ type: 'NEXT' });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual({ context: {}, state: 'yellow' });
  });

  it('calls listener on context change', () => {
    const m = counterMachine();
    const snapshots: any[] = [];

    m.subscribe((snap) => {
      snapshots.push(snap);
    });

    m.send({ type: 'INCREMENT' });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1].context.count).toBe(1);
  });

  it('returns unsubscribe function', () => {
    const m = trafficMachine();
    const snapshots: any[] = [];

    const unsubscribe = m.subscribe((snap) => {
      snapshots.push(snap);
    });

    m.send({ type: 'NEXT' });
    expect(snapshots).toHaveLength(2);

    unsubscribe();

    m.send({ type: 'NEXT' });
    expect(snapshots).toHaveLength(2); // no new call after unsubscribe
  });
});

// ── onTransition hook ─────────────────────────────────────────────────────────

describe('onTransition hook', () => {
  it('calls onTransition with event, from, and to', () => {
    const transitions: any[] = [];

    createMachine({
      initial: 'a',
      onTransition: (info) => {
        transitions.push(info);
      },
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: { on: { GO: { target: 'c' } } },
        c: {},
      },
    }).send({ type: 'GO' });

    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toEqual({ event: { type: 'GO' }, from: 'a', to: 'b' });
  });

  it('not called if guard fails', () => {
    const transitions: any[] = [];

    const m = createMachine({
      context: { allowed: false },
      initial: 'a',
      onTransition: (info) => {
        transitions.push(info);
      },
      states: {
        a: {
          on: {
            GO: { guard: ({ context }) => context.allowed, target: 'b' },
          },
        },
        b: {},
      },
    });

    m.send({ type: 'GO' });
    expect(transitions).toHaveLength(0);
  });

  it('includes event payload', () => {
    const transitions: any[] = [];

    const m = createMachine({
      context: { count: 0 },
      initial: 'idle',
      onTransition: (info) => {
        transitions.push(info);
      },
      states: {
        idle: {
          on: {
            ADD: {
              actions: [
                assign<{ count: number }, { amount: number; type: 'ADD' }>(({ context, event }) => ({
                  count: context.count + event.amount,
                })),
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    m.send({ amount: 5, type: 'ADD' });
    expect(transitions[0].event).toEqual({ amount: 5, type: 'ADD' });
  });
});

// ── Guard-based routing ───────────────────────────────────────────────────────

describe('guard-based routing (array transitions)', () => {
  it('first passing guard is used when multiple transitions available', () => {
    const m = createMachine({
      context: { priority: 2 },
      initial: 'idle',
      states: {
        high: {},
        idle: {
          on: {
            CHECK: [
              { guard: ({ context }) => context.priority > 10, target: 'high' },
              { guard: ({ context }) => context.priority > 0, target: 'medium' },
              { target: 'low' },
            ],
          },
        },
        low: {},
        medium: {},
      },
    });

    m.send({ type: 'CHECK' });
    expect(m.state.value).toBe('medium');
  });

  it('fallback transition without guard is used when guards fail', () => {
    const m = createMachine({
      context: { allowed: false },
      initial: 'idle',
      states: {
        fallback: {},
        idle: {
          on: {
            GO: [{ guard: ({ context }) => context.allowed, target: 'success' }, { target: 'fallback' }],
          },
        },
        success: {},
      },
    });

    m.send({ type: 'GO' });
    expect(m.state.value).toBe('fallback');
  });

  it('returns false if no transition matches', () => {
    const m = createMachine({
      context: { ok: false },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            GO: [{ guard: ({ context }) => context.ok, target: 'done' }],
          },
        },
      },
    });

    expect(m.send({ type: 'GO' })).toBe(false);
    expect(m.state.value).toBe('idle');
  });

  it('can() returns true if any transition would match', () => {
    const m = createMachine({
      context: { flag: true },
      initial: 'idle',
      states: {
        a: {},
        b: {},
        idle: {
          on: {
            GO: [{ guard: ({ context }) => !context.flag, target: 'a' }, { target: 'b' }],
          },
        },
      },
    });

    expect(m.can({ type: 'GO' })).toBe(true);
  });
});

// ── Symbol.dispose cleanup ────────────────────────────────────────────────────

describe('[Symbol.dispose] signal cleanup', () => {
  it('machine retains last state after disposal', () => {
    const m = trafficMachine();

    m.send({ type: 'NEXT' });
    m[Symbol.dispose]();
    expect(m.state.value).toBe('yellow');
  });

  it('send() returns false after disposal', () => {
    const m = trafficMachine();

    m[Symbol.dispose]();
    expect(m.send({ type: 'NEXT' })).toBe(false);
    expect(m.state.value).toBe('green');
  });

  it('subscribe stops receiving after machine dispose', () => {
    const m = trafficMachine();
    const snapshots: any[] = [];

    const unsubscribe = m.subscribe((snap) => {
      snapshots.push(snap);
    });

    m.send({ type: 'NEXT' });
    expect(snapshots).toHaveLength(2);

    m[Symbol.dispose]();

    m.send({ type: 'NEXT' });
    expect(snapshots).toHaveLength(2); // no new call after dispose
  });
});

// ── Error resilience ──────────────────────────────────────────────────────────

describe('error handling', () => {
  it('error in action does not corrupt machine state', () => {
    const m = createMachine({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: {
            FAIL: {
              actions: [
                () => {
                  throw new Error('action error');
                },
                assign<{ count: number }>(({ context }) => ({ count: context.count + 1 })),
              ],
              target: 'idle',
            },
            SAFE: { target: 'idle' },
          },
        },
      },
    });

    expect(() => m.send({ type: 'FAIL' })).toThrow('action error');
    // Machine should be in a consistent state (state unchanged)
    expect(m.state.value).toBe('idle');
    // Note: context might be partially updated depending on error position
  });

  it('error in guard does not trigger transition', () => {
    const m = createMachine({
      initial: 'a',
      states: {
        a: {
          on: {
            GO: {
              guard: () => {
                throw new Error('guard error');
              },
              target: 'b',
            },
          },
        },
        b: {},
      },
    });

    expect(() => m.send({ type: 'GO' })).toThrow('guard error');
    expect(m.state.value).toBe('a');
  });
});

// ── Re-entrancy ───────────────────────────────────────────────────────────────

describe('re-entrancy', () => {
  it('entry action sequence runs in correct batch order', () => {
    const events: string[] = [];

    createMachine({
      initial: 'a',
      onTransition: (info) => {
        events.push(`${info.from}->${info.to}`);
      },
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {
          entry: () => {
            events.push('entry-b');
          },
        },
      },
    }).send({ type: 'GO' });

    // Entry runs as part of the same batch
    expect(events).toEqual(['entry-b', 'a->b']);
  });

  it('re-entrant send during entry is queued after current batch', () => {
    const events: string[] = [];

    const m = createMachine({
      initial: 'a',
      onTransition: (info) => {
        events.push(`${info.from}->${info.to}`);
      },
      states: {
        a: { on: { GO: { target: 'b' } } },
        b: {
          entry: () => {
            events.push('entry-b');
            // Re-entrant send during entry
            m.send('GO');
          },
          on: { GO: { target: 'c' } },
        },
        c: {},
      },
    });

    m.send('GO');

    // First transition completes: a->b with entry-b, then re-entrant send b->c
    expect(m.state.value).toBe('c');
    expect(events).toContain('entry-b');
  });
});

// ── availableEvents() ─────────────────────────────────────────────────────────

describe('availableEvents()', () => {
  it('returns events defined in current state', () => {
    const m = trafficMachine();

    expect(m.availableEvents()).toEqual(['NEXT']);
  });

  it('returns empty array when state has no transitions', () => {
    const m = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { GO: { target: 'running' } } },
        running: {},
      },
    });

    m.send('GO');
    expect(m.availableEvents()).toEqual([]);
  });

  it('returns available events after state transition', () => {
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { GO_B: { target: 'b' } } },
        b: { on: { GO_C: { target: 'c' }, BACK: { target: 'a' } } },
        c: {},
      },
    });

    expect(m.availableEvents()).toEqual(['GO_B']);
    m.send('GO_B');
    expect(m.availableEvents()).toEqual(['GO_C', 'BACK']);
    m.send('GO_C');
    expect(m.availableEvents()).toEqual([]);
  });
});

// ── Atomic transitions with rollback ───────────────────────────────────────────

describe('Atomic transitions — rollback on error', () => {
  it('rolls back state and context if entry action throws', () => {
    const m = createMachine({
      context: { x: 0 },
      initial: 'a',
      states: {
        a: { on: { GO: { actions: [assign(({ context }) => ({ x: context.x + 1 }))], target: 'b' } } },
        b: {
          entry: () => {
            throw new Error('entry failed');
          },
        },
      },
    });

    expect(m.state.value).toBe('a');
    expect(m.getSnapshot().context.x).toBe(0);

    expect(() => m.send('GO')).toThrow('entry failed');

    expect(m.state.value).toBe('a');
    expect(m.getSnapshot().context.x).toBe(0);
  });

  it('rolls back state and context if action throws', () => {
    const m = createMachine({
      context: { x: 0 },
      initial: 'a',
      states: {
        a: {
          on: {
            GO: {
              actions: [
                assign(({ context }) => ({ x: context.x + 1 })),
                () => {
                  throw new Error('action failed');
                },
              ],
              target: 'b',
            },
          },
        },
        b: {},
      },
    });

    expect(m.state.value).toBe('a');
    expect(m.getSnapshot().context.x).toBe(0);

    expect(() => m.send('GO')).toThrow('action failed');

    expect(m.state.value).toBe('a');
    expect(m.getSnapshot().context.x).toBe(0);
  });

  it('rolls back state and context if exit action throws', () => {
    const m = createMachine({
      context: { x: 0 },
      initial: 'a',
      states: {
        a: {
          exit: () => {
            throw new Error('exit failed');
          },
          on: { GO: { actions: [assign(({ context }) => ({ x: context.x + 1 }))], target: 'b' } },
        },
        b: {},
      },
    });

    expect(m.state.value).toBe('a');
    expect(m.getSnapshot().context.x).toBe(0);

    expect(() => m.send('GO')).toThrow('exit failed');

    expect(m.state.value).toBe('a');
    expect(m.getSnapshot().context.x).toBe(0);
  });
});
