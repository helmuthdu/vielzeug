import { afterEach, describe, expect, it, vi } from 'vitest';

import { debugActor } from '../devtools.js';
import { type ClockworkError, defineMachine, type Machine, type MachineConfig } from '../index.js';

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('defineMachine', () => {
  it('infers state keys with record context and event generics', () => {
    type Context = { readonly count: number };
    type Event = { readonly amount: number; readonly type: 'GO' } | { readonly type: '$after' };

    const machine = defineMachine<Context, Event>()({
      context: { count: 0 },
      initial: 'idle',
      states: {
        idle: {
          on: { GO: { reduce: ({ context, event }) => ({ count: context.count + event.amount }), target: 'ready' } },
        },
        ready: { on: { $after: { target: 'idle' } } },
      },
    });
    const typed: Machine<'idle' | 'ready', Context, Event> = machine;

    expect(typed.transition(typed.initialSnapshot, { amount: 2, type: 'GO' })).toEqual({
      snapshot: { context: { count: 2 }, state: 'ready' },
      type: 'transition',
    });
    expect(typed.transition(typed.initialSnapshot, { type: '$after' }).type).toBe('ignored');
  });

  it('has pure transitions with no effect execution and plain snapshots', () => {
    type Event = { readonly type: 'GO' };

    const effect = vi.fn();
    const source = { count: 0 };
    const machine = defineMachine<{ readonly count: number }, Event>()({
      context: source,
      initial: 'idle',
      states: {
        idle: { exit: [effect], on: { GO: { effects: [effect], reduce: () => ({ count: 1 }), target: 'ready' } } },
        ready: { entry: [effect] },
      },
    });

    const result = machine.transition(machine.initialSnapshot, { type: 'GO' });

    expect(result).toEqual({ snapshot: { context: { count: 1 }, state: 'ready' }, type: 'transition' });
    expect(effect).not.toHaveBeenCalled();
    expect(Object.isFrozen(machine.initialSnapshot)).toBe(false);
    expect(machine.initialSnapshot.context).toBe(source);
  });

  it('accepts ordinary and null-prototype context records but rejects arrays, null, and class instances', () => {
    type Context = Record<string, unknown>;
    type Event = { readonly type: 'GO' };

    class ContextClass {
      readonly value = 1;
    }

    const nullPrototype = Object.create(null) as Context;

    nullPrototype.value = 1;

    const nullPrototypeMachine = defineMachine<Context, Event>()({
      context: nullPrototype,
      initial: 'idle',
      states: { idle: {} },
    });

    expect(nullPrototypeMachine.initialSnapshot.context).toBe(nullPrototype);

    for (const context of [[], null, new ContextClass()]) {
      const definition = {
        context,
        initial: 'idle',
        states: { idle: {} },
      } as unknown as MachineConfig<'idle', Context, Event>;

      expect(() => defineMachine<Context, Event>()(definition)).toThrow(
        expect.objectContaining({ code: 'INVALID_CONTEXT' }),
      );
    }
  });

  it('validates restored and reduced contexts against the same record contract', () => {
    type Context = { readonly count: number };
    type Event = { readonly type: 'GO' };

    class ContextClass {
      readonly count = 1;
    }

    for (const context of [[], null, new ContextClass()]) {
      const machine = defineMachine<Context, Event>()({
        context: { count: 0 },
        initial: 'idle',
        states: { idle: {} },
      });

      expect(() => machine.createActor({ snapshot: { context: context as Context, state: 'idle' } })).toThrow(
        expect.objectContaining({ code: 'INVALID_CONTEXT' }),
      );
    }

    const machine = defineMachine<Context, Event>()({
      context: { count: 0 },
      initial: 'idle',
      states: { idle: { on: { GO: { reduce: () => [] as unknown as Context, target: 'idle' } } } },
    });

    expect(() => machine.transition(machine.initialSnapshot, { type: 'GO' })).toThrow(
      expect.objectContaining({ code: 'INVALID_CONTEXT' }),
    );
  });

  it.each([
    [{ initial: 'idle', states: { idle: { entry: [true] } } }, 'INVALID_EFFECT'],
    [{ initial: 'idle', states: { idle: { on: { GO: { guard: true, target: 'idle' } } } } }, 'INVALID_TRANSITION'],
    [{ initial: 'idle', states: { idle: { on: { GO: { reduce: true, target: 'idle' } } } } }, 'INVALID_TRANSITION'],
    [{ initial: 'idle', states: { idle: { invoke: [{ src: true }] } } }, 'INVALID_INVOKE'],
    [{ initial: 'idle', states: { idle: { after: [{ delay: -1, target: 'idle' }] } } }, 'INVALID_AFTER_DELAY'],
    [{ initial: 'idle', states: { idle: { on: { GO: [] } } } }, 'INVALID_TRANSITION'],
    [{ initial: 'idle', states: { idle: { initial: 'child', states: { child: {} } } } }, 'INVALID_DEFINITION'],
  ])('retains stable diagnostics for invalid definitions', (definition, code) => {
    expect(() =>
      defineMachine<Record<string, never>, { readonly type: string }>()(
        definition as unknown as MachineConfig<'idle', Record<string, never>, { readonly type: string }>,
      ),
    ).toThrow(expect.objectContaining({ code }));
  });

  it('treats prototype-colliding state labels and event types as ordinary map keys', () => {
    type State = 'toString' | 'constructor' | '__proto__';
    type Event = { readonly type: 'toString' | 'constructor' | '__proto__' };

    const states = JSON.parse(`{
      "toString": { "on": { "constructor": { "target": "constructor" } } },
      "constructor": { "on": { "__proto__": { "target": "__proto__" } } },
      "__proto__": { "on": { "toString": { "target": "toString" } } }
    }`) as MachineConfig<State, Record<string, never>, Event>['states'];
    const machine = defineMachine<Record<string, never>, Event>()({ context: {}, initial: 'toString', states });

    expect(machine.can(machine.initialSnapshot, { type: 'constructor' })).toBe(true);
    expect(machine.transition(machine.initialSnapshot, { type: 'constructor' }).snapshot.state).toBe('constructor');

    const actor = machine.createActor();

    actor.send({ type: 'constructor' });
    actor.send({ type: '__proto__' });
    actor.send({ type: 'toString' });

    expect(actor.snapshot.state).toBe('toString');
  });
});

describe('actors', () => {
  it('establishes resources before subscribers and effects', () => {
    vi.useFakeTimers();
    type Event = { readonly type: 'GO' } | { readonly type: 'DONE' };

    const order: string[] = [];
    const machine = defineMachine<{ readonly count: number }, Event>()({
      context: { count: 0 },
      initial: 'idle',
      states: {
        done: {},
        idle: {
          exit: [({ context }) => order.push(`exit:${context.count}`)],
          on: {
            GO: {
              effects: [({ context }) => order.push(`transition:${context.count}`)],
              reduce: () => ({ count: 1 }),
              target: 'ready',
            },
          },
        },
        ready: {
          after: [{ delay: 10, target: 'done' }],
          entry: [({ context }) => order.push(`entry:${context.count}`)],
          invoke: [{ onDone: () => ({ type: 'DONE' }), src: () => new Promise<void>(() => undefined) }],
          on: { DONE: { target: 'done' } },
        },
      },
    });
    const actor = machine.createActor();

    actor.subscribe((snapshot) => {
      order.push(`subscriber:${snapshot.context.count}`);
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    expect(actor.send({ type: 'GO' })).toBeUndefined();
    expect(actor.snapshot).toEqual({ context: { count: 1 }, state: 'ready' });
    expect(order).toEqual(['subscriber:1', 'exit:1', 'transition:1', 'entry:1']);
  });

  it('runs entry effects only for fresh actors while fresh and restored actors establish resources', async () => {
    vi.useFakeTimers();
    type Event = { readonly type: 'DONE' };

    const entry = vi.fn();
    const source = vi.fn();
    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'loading',
      states: {
        done: {},
        loading: { after: [{ delay: 10, target: 'done' }], entry: [entry], invoke: [{ src: source }] },
      },
    });

    const fresh = machine.createActor();
    const restored = machine.createActor({ snapshot: { context: {}, state: 'loading' } });

    await flush();

    expect(entry).toHaveBeenCalledTimes(1);
    expect(source).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(10);
    expect(fresh.snapshot.state).toBe('done');
    expect(restored.snapshot.state).toBe('done');
  });

  it('keeps timer triggers private while a user $after event works normally', () => {
    vi.useFakeTimers();
    type Event = { readonly type: '$after' };

    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'idle',
      states: {
        done: {},
        idle: { after: [{ delay: 10, target: 'done' }], on: { $after: { target: 'user' } } },
        user: {},
      },
    });
    const actor = machine.createActor();

    actor.send({ type: '$after' });
    expect(actor.snapshot.state).toBe('user');

    const timerActor = machine.createActor();

    vi.advanceTimersByTime(10);
    expect(timerActor.snapshot.state).toBe('done');
  });

  it('captures invoke context at start and cancels stale invokes', async () => {
    type Event = { readonly type: 'CANCEL' } | { readonly type: 'DONE'; readonly value: number };

    let resolve: ((value: string) => void) | undefined;
    let signal: AbortSignal | undefined;
    const seen: number[] = [];
    const machine = defineMachine<{ readonly value: number }, Event>()({
      context: { value: 1 },
      initial: 'loading',
      states: {
        cancelled: {},
        done: {},
        loading: {
          invoke: [
            {
              onDone: ({ context }) => {
                seen.push(context.value);

                return { type: 'DONE', value: context.value };
              },
              src: ({ signal: currentSignal }) =>
                new Promise<string>((currentResolve) => {
                  signal = currentSignal;
                  resolve = currentResolve;
                }),
            },
          ],
          on: { CANCEL: { reduce: () => ({ value: 2 }), target: 'cancelled' }, DONE: { target: 'done' } },
        },
      },
    });
    const actor = machine.createActor();

    await flush();
    actor.send({ type: 'CANCEL' });
    expect(signal?.aborted).toBe(true);
    resolve?.('late');
    await flush();

    expect(actor.snapshot).toEqual({ context: { value: 2 }, state: 'cancelled' });
    expect(seen).toEqual([]);
  });

  it('silently disposes by default on synchronous actor errors', () => {
    type Event = { readonly type: 'GO' };

    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'idle',
      states: {
        idle: {
          on: {
            GO: {
              reduce: () => {
                throw new Error('boom');
              },
              target: 'idle',
            },
          },
        },
      },
    });
    const actor = machine.createActor();

    expect(() => actor.send({ type: 'GO' })).not.toThrow();
    expect(actor.disposed).toBe(true);
  });

  it('uses explicit error dispositions and reports transition, subscriber, effect, and invoke phases', async () => {
    type Event =
      | { readonly type: 'EFFECT' }
      | { readonly type: 'INVOKE' }
      | { readonly type: 'SUBSCRIBER' }
      | { readonly type: 'TRANSITION' }
      | { readonly type: 'NEXT' };

    const phases: string[] = [];
    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'idle',
      states: {
        done: {},
        idle: {
          on: {
            EFFECT: {
              effects: [
                () => {
                  throw new Error('effect');
                },
              ],
              target: 'idle',
            },
            INVOKE: { target: 'invoking' },
            NEXT: { target: 'done' },
            SUBSCRIBER: { target: 'idle' },
            TRANSITION: {
              reduce: () => {
                throw new Error('transition');
              },
              target: 'idle',
            },
          },
        },
        invoking: { invoke: [{ src: () => Promise.reject(new Error('invoke')) }], on: { NEXT: { target: 'done' } } },
      },
    });
    const actor = machine.createActor({
      onError: (_error, context) => {
        phases.push(context.phase);

        return 'continue';
      },
    });

    actor.subscribe(() => {
      throw new Error('subscriber');
    });

    actor.send({ type: 'SUBSCRIBER' });
    actor.send({ type: 'EFFECT' });
    actor.send({ type: 'TRANSITION' });
    actor.send({ type: 'INVOKE' });
    await flush();
    actor.send({ type: 'NEXT' });

    expect(phases).toEqual(['subscriber', 'subscriber', 'effect', 'transition', 'subscriber', 'invoke', 'subscriber']);
    expect(actor.disposed).toBe(false);
    expect(actor.snapshot.state).toBe('done');
  });

  it('disposes when an error handler requests it and propagates thrown handler errors after disposal', () => {
    type Event = { readonly type: 'GO' };

    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'idle',
      states: {
        idle: {
          on: {
            GO: {
              effects: [
                () => {
                  throw new Error('effect');
                },
              ],
              target: 'idle',
            },
          },
        },
      },
    });

    const disposed = machine.createActor({ onError: () => 'dispose' });

    disposed.send({ type: 'GO' });
    expect(disposed.disposed).toBe(true);

    const actor = machine.createActor({
      onError: () => {
        throw new Error('handler');
      },
    });

    expect(() => actor.send({ type: 'GO' })).toThrow('handler');
    expect(actor.disposed).toBe(true);
  });

  it('safely disposes unmapped asynchronous invoke failures without unhandled rejections', async () => {
    type Event = { readonly type: 'GO' };

    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'loading',
      states: {
        done: {},
        loading: { invoke: [{ src: () => Promise.reject(new Error('failure')) }], on: { GO: { target: 'done' } } },
      },
    });
    const actor = machine.createActor();

    await flush();
    expect(actor.disposed).toBe(true);
    actor.send({ type: 'GO' });
    expect(actor.snapshot.state).toBe('loading');
  });

  it('reports queued transition limits through the configured policy', () => {
    type Event = { readonly type: 'GO' };

    const errors: string[] = [];
    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'idle',
      states: { idle: { on: { GO: { effects: [({ send }) => send({ type: 'GO' })], target: 'idle' } } } },
    });
    const actor = machine.createActor({
      maxTransitions: 2,
      onError: (error) => {
        errors.push((error as ClockworkError).code);

        return 'dispose';
      },
    });

    actor.send({ type: 'GO' });
    expect(errors).toEqual(['INVALID_TRANSITION_LIMIT']);
    expect(actor.disposed).toBe(true);
  });
});

describe('debugActor', () => {
  it('observes snapshots and cleanup detaches without wrapping the actor or changing its error policy', () => {
    type Event = { readonly type: 'GO' };

    const logger = vi.fn();
    const machine = defineMachine<Record<string, never>, Event>()({
      context: {},
      initial: 'idle',
      states: { idle: { on: { GO: { target: 'ready' } } }, ready: {} },
    });
    const actor = machine.createActor();
    const stop = debugActor(actor, { logger });

    actor.send({ type: 'GO' });
    expect(logger).toHaveBeenCalledWith({ context: {}, state: 'ready' });
    expect(actor.disposed).toBe(false);

    stop();
    actor.dispose();
    expect(actor.disposed).toBe(true);
  });
});
