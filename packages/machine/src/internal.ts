import type { ContextValidator, MachineEvent, TransitionDef, TransitionInput } from './types.js';

import { MachineError } from './errors.js';

/**
 * Validates context using the supplied type-guard. Throws `MachineError` if validation fails.
 * Shared by `definition.ts` (init/hydrate) and `interpret.ts` (transition).
 */
export const assertContext = <Ctx extends object>(
  validator: ContextValidator<Ctx> | undefined,
  context: unknown,
  phase: 'hydrate' | 'init' | 'transition',
): void => {
  if (!validator) return;

  if (!validator(context)) {
    throw new MachineError('MACHINE_INVALID_VALIDATE_CONTEXT', `[machine] context failed validation during ${phase}`, {
      phase,
    });
  }
};

/** Normalizes a single transition or array of transitions to always be an array. */
export const normalizeTransitions = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  input: TransitionInput<State, Ctx, Ev>,
): Array<TransitionDef<State, Ctx, Ev>> => (Array.isArray(input) ? input : [input]);
