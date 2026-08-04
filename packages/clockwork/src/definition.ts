import type { After, Effect, Invoke, MachineConfig, MachineEvent, Transition } from './types.js';

import { ClockworkError } from './errors.js';

export type CompiledAfter<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly definition: After<State, Context, Event>;
  readonly id: number;
};

export type CompiledState<State extends string, Context extends Record<string, unknown>, Event extends MachineEvent> = {
  readonly after: readonly CompiledAfter<State, Context, Event>[];
  readonly entry: readonly Effect<Context, Event>[];
  readonly exit: readonly Effect<Context, Event>[];
  readonly invoke: readonly Invoke<Context, Event>[];
  readonly on: ReadonlyMap<string, readonly Transition<State, Context, Event>[]>;
};

export type CompiledMachine<
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
> = {
  readonly context: Context;
  readonly initial: State;
  readonly states: ReadonlyMap<State, CompiledState<State, Context, Event>>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isContextRecord = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === null || prototype === Object.prototype;
};

const fail = (code: ClockworkError['code'], message: string, details: Record<string, unknown>): never => {
  throw new ClockworkError(code, message, details);
};

const array = (value: unknown, message: string, details: Record<string, unknown>): readonly unknown[] => {
  if (!Array.isArray(value)) fail('INVALID_DEFINITION', message, details);

  return value as readonly unknown[];
};

const functions = <Value>(
  value: unknown,
  phase: 'effects' | 'entry' | 'exit',
  details: Record<string, unknown>,
): readonly Value[] => {
  const values = array(value, `${phase} must be an array`, { ...details, phase });

  return values.map((candidate, index) => {
    if (typeof candidate !== 'function') {
      fail('INVALID_EFFECT', `${phase} entry at index ${index} must be a function`, { ...details, index, phase });
    }

    return candidate as Value;
  });
};

const validateTarget = <State extends string>(
  states: ReadonlyMap<State, unknown>,
  target: unknown,
  details: Record<string, unknown>,
): State => {
  if (typeof target !== 'string' || !states.has(target as State)) {
    return fail('UNKNOWN_TARGET', `target "${String(target)}" is not a declared state`, { ...details, target });
  }

  return target as State;
};

const compileTransition = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  input: unknown,
  states: ReadonlyMap<State, unknown>,
  details: Record<string, unknown>,
): Transition<State, Context, Event> => {
  const transition = isRecord(input) ? input : fail('INVALID_TRANSITION', 'a transition must be an object', details);
  const target = validateTarget(states, transition.target, details);

  if (transition.guard !== undefined && typeof transition.guard !== 'function') {
    fail('INVALID_TRANSITION', 'transition guard must be a function', { ...details, phase: 'guard' });
  }

  if (transition.reduce !== undefined && typeof transition.reduce !== 'function') {
    fail('INVALID_TRANSITION', 'transition reducer must be a function', { ...details, phase: 'reduce' });
  }

  return {
    effects:
      transition.effects === undefined
        ? undefined
        : functions<Effect<Context, Event>>(transition.effects, 'effects', details),
    guard: transition.guard as Transition<State, Context, Event>['guard'],
    reduce: transition.reduce as Transition<State, Context, Event>['reduce'],
    target,
  };
};

const compileTransitions = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  input: unknown,
  states: ReadonlyMap<State, unknown>,
  details: Record<string, unknown>,
): readonly Transition<State, Context, Event>[] => {
  const values = Array.isArray(input) ? input : [input];

  if (values.length === 0) fail('INVALID_TRANSITION', 'a transition array must not be empty', details);

  return values.map((value, transitionIndex) =>
    compileTransition<State, Context, Event>(value, states, { ...details, transitionIndex }),
  );
};

const compileAfter = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  input: unknown,
  states: ReadonlyMap<State, unknown>,
  id: number,
  index: number,
  state: State,
): CompiledAfter<State, Context, Event> => {
  const after = isRecord(input)
    ? input
    : fail('INVALID_TRANSITION', `state "${state}" after entries must be objects`, { index, state });
  const delay = after.delay;

  if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0) {
    fail('INVALID_AFTER_DELAY', `state "${state}" after delay must be a finite number greater than or equal to 0`, {
      delay,
      index,
      state,
    });
  }

  const details = { delay, index, state };

  if (after.guard !== undefined && typeof after.guard !== 'function') {
    fail('INVALID_TRANSITION', 'after guard must be a function', { ...details, phase: 'guard' });
  }

  if (after.reduce !== undefined && typeof after.reduce !== 'function') {
    fail('INVALID_TRANSITION', 'after reducer must be a function', { ...details, phase: 'reduce' });
  }

  return {
    definition: {
      delay: delay as number,
      effects:
        after.effects === undefined ? undefined : functions<Effect<Context, Event>>(after.effects, 'effects', details),
      guard: after.guard as After<State, Context, Event>['guard'],
      reduce: after.reduce as After<State, Context, Event>['reduce'],
      target: validateTarget(states, after.target, details),
    },
    id,
  };
};

const compileInvokes = <Context extends Record<string, unknown>, Event extends MachineEvent>(
  value: unknown,
  state: string,
): readonly Invoke<Context, Event>[] =>
  array(value, `state "${state}" invoke must be an array`, { state }).map((value, index) => {
    const candidate = isRecord(value)
      ? value
      : fail('INVALID_INVOKE', 'invoke entry must be an object', { index, state });

    if (typeof candidate.src !== 'function') {
      fail('INVALID_INVOKE', 'invoke src must be a function', { index, phase: 'src', state });
    }

    if (candidate.onDone !== undefined && typeof candidate.onDone !== 'function') {
      fail('INVALID_INVOKE', 'invoke onDone must be a function', { index, phase: 'onDone', state });
    }

    if (candidate.onError !== undefined && typeof candidate.onError !== 'function') {
      fail('INVALID_INVOKE', 'invoke onError must be a function', { index, phase: 'onError', state });
    }

    return candidate as unknown as Invoke<Context, Event>;
  });

/** Validates and structurally compiles a flat machine definition once. */
export const compileDefinition = <
  State extends string,
  Context extends Record<string, unknown>,
  Event extends MachineEvent,
>(
  definition: MachineConfig<State, Context, Event>,
): CompiledMachine<State, Context, Event> => {
  const raw = definition as unknown;
  const machine = isRecord(raw) ? raw : fail('INVALID_DEFINITION', 'machine definition must be an object', {});
  const rawStates = isRecord(machine.states)
    ? machine.states
    : fail('INVALID_DEFINITION', 'machine states must be an object', {});
  const rawStateEntries = Object.entries(rawStates) as [State, unknown][];
  const rawStateMap = new Map<State, unknown>(rawStateEntries);

  if (typeof machine.initial !== 'string' || !rawStateMap.has(machine.initial as State)) {
    fail('INVALID_INITIAL_STATE', `initial state "${String(machine.initial)}" is not declared`, {
      initial: machine.initial,
    });
  }

  if (machine.context !== undefined && !isContextRecord(machine.context)) {
    fail('INVALID_CONTEXT', 'machine context must be a non-array object record', {});
  }

  const states = new Map<State, CompiledState<State, Context, Event>>();
  let afterId = 0;

  for (const [state, rawNodeValue] of rawStateEntries) {
    const rawNode = isRecord(rawNodeValue)
      ? rawNodeValue
      : fail('INVALID_DEFINITION', `state "${state}" must be an object`, { state });

    if ('states' in rawNode || 'initial' in rawNode) {
      fail('INVALID_DEFINITION', `state "${state}" must be flat and cannot declare child states`, { state });
    }

    const on = new Map<string, readonly Transition<State, Context, Event>[]>();

    if (rawNode.on !== undefined) {
      const rawOn = isRecord(rawNode.on)
        ? rawNode.on
        : fail('INVALID_TRANSITION', `state "${state}" on must be an object`, { state });

      for (const [type, transition] of Object.entries(rawOn)) {
        on.set(type, compileTransitions<State, Context, Event>(transition, rawStateMap, { state, type }));
      }
    }

    const after =
      rawNode.after === undefined
        ? []
        : array(rawNode.after, `state "${state}" after must be an array`, { state }).map((entry, index) =>
            compileAfter<State, Context, Event>(entry, rawStateMap, afterId++, index, state),
          );

    states.set(state, {
      after,
      entry: rawNode.entry === undefined ? [] : functions<Effect<Context, Event>>(rawNode.entry, 'entry', { state }),
      exit: rawNode.exit === undefined ? [] : functions<Effect<Context, Event>>(rawNode.exit, 'exit', { state }),
      invoke: rawNode.invoke === undefined ? [] : compileInvokes<Context, Event>(rawNode.invoke, state),
      on,
    });
  }

  return {
    context: (machine.context ?? {}) as Context,
    initial: machine.initial as State,
    states,
  };
};
