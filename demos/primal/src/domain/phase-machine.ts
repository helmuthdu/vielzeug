import type { Machine, MachineEvent } from '@vielzeug/clockwork';
import { PrimalDomainError } from './errors';

/**
 * The transition wrapper every phase machine shares: run the event, and an event the
 * sheet does not print from the current phase is a domain refusal. The machines keep
 * their own state graphs and label tables; only the refusal is written once.
 */
export function transitionPhaseWith<S extends string, E extends MachineEvent>(
  machine: Machine<S, Record<string, never>, E>,
  labels: Record<S, string>,
  phase: S,
  event: E,
): S {
  const result = machine.transition({ context: {}, state: phase }, event);
  if (result.type === 'ignored') {
    throw new PrimalDomainError('phase-transition', `Cannot ${event.type} while in the ${labels[phase]} phase.`);
  }
  return result.snapshot.state;
}

/** True while the transition is printed on the sheet. */
export function canTransitionWith<S extends string, E extends MachineEvent>(
  machine: Machine<S, Record<string, never>, E>,
  phase: S,
  event: E,
): boolean {
  return machine.can({ context: {}, state: phase }, event);
}
