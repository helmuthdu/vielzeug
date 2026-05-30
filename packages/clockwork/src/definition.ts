import type { MachineConfig, MachineDefinition, MachineEvent, StateNode, TransitionInput } from './types.js';

import { MachineError } from './errors.js';
import { normalizeTransitions } from './internal.js';

// ── Internal helpers ─────────────────────────────────────────────────────────

const validateHandler = (value: unknown, name: string, details: Record<string, unknown>): void => {
  if (value === undefined) return;

  if (typeof value !== 'function') {
    throw new MachineError('MACHINE_INVALID_TYPE_HANDLER', `[machine] ${name} must be a function`, details);
  }
};

const validateDefinition = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineConfig<State, Ctx, Ev>,
): void => {
  const { states } = definition;

  if (!(definition.initial in states)) {
    throw new MachineError(
      'MACHINE_INVALID_INITIAL_STATE',
      `[machine] initial state "${definition.initial}" not found in states`,
      { initial: definition.initial },
    );
  }

  for (const [stateName, node] of Object.entries(states) as Array<[string, StateNode<State, Ctx, Ev>]>) {
    validateHandler(node.entry, 'state.entry', { stateName });
    validateHandler(node.exit, 'state.exit', { stateName });

    if (node.invoke) {
      for (const [index, invoke] of node.invoke.entries()) {
        validateHandler(invoke.src, 'invoke.src', { index, stateName });
        validateHandler(invoke.onDone, 'invoke.onDone', { index, stateName });
        validateHandler(invoke.onError, 'invoke.onError', { index, stateName });
      }
    }

    for (const [eventType, input] of Object.entries(node.on ?? {})) {
      const defs = normalizeTransitions(input as TransitionInput<State, Ctx, Ev>);

      if (defs.length === 0) {
        throw new MachineError(
          'MACHINE_INVALID_TRANSITION_ARRAY',
          `[machine] state "${stateName}" event "${eventType}" must be a non-empty transition or transition array`,
          { eventType, stateName },
        );
      }

      for (const [index, tr] of defs.entries()) {
        if (!tr || typeof tr !== 'object') {
          throw new MachineError(
            'MACHINE_INVALID_TRANSITION',
            `[machine] state "${stateName}" event "${eventType}" transition #${index} must be an object`,
            { eventType, index, stateName },
          );
        }

        if (typeof tr.target !== 'string') {
          throw new MachineError(
            'MACHINE_INVALID_TYPE_IN_TRANSITION',
            `[machine] state "${stateName}" event "${eventType}" transition #${index} target must be a string`,
            { eventType, index, stateName },
          );
        }

        if (!(tr.target in states)) {
          throw new MachineError(
            'MACHINE_UNKNOWN_TARGET',
            `[machine] state "${stateName}" event "${eventType}" targets unknown state "${tr.target}"`,
            { eventType, stateName, target: tr.target },
          );
        }

        validateHandler(tr.guard, 'transition.guard', { eventType, index, stateName });

        if (tr.actions) {
          if (!Array.isArray(tr.actions)) {
            throw new MachineError(
              'MACHINE_INVALID_TRANSITION_HANDLER',
              `[machine] transition.actions must be an array`,
              { eventType, index, stateName },
            );
          }

          for (const [actionIndex, action] of tr.actions.entries()) {
            if (typeof action !== 'function') {
              throw new MachineError(
                'MACHINE_INVALID_TRANSITION_HANDLER',
                `[machine] transition action #${actionIndex} must be a function`,
                { actionIndex, eventType, index, stateName },
              );
            }
          }
        }
      }
    }
  }
};

// ── API ──────────────────────────────────────────────────────────────────────

/**
 * Defines a state machine configuration with full validation and type inference.
 * Returns a frozen, immutable definition ready for interpretation.
 * @example
 * const machine = defineMachine({
 *   initial: 'idle',
 *   states: { idle: { on: { GO: { target: 'active' } } }, active: {} },
 * });
 */
export const defineMachine = <State extends string, Ctx extends object, Ev extends MachineEvent>(
  config: MachineConfig<State, Ctx, Ev>,
): MachineDefinition<State, Ctx, Ev> => {
  validateDefinition(config);

  return Object.freeze(config);
};
