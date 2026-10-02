import { defineMachine } from '@vielzeug/clockwork';
import { canTransitionWith, transitionPhaseWith } from './phase-machine';
import type { AscentPhase } from './types';

export type AscentEvent =
  | { type: 'REVEAL_ENCOUNTER' }
  | { type: 'BEGIN_HUNT' }
  | { type: 'RECORD_RESULT' }
  | { type: 'NEXT_CHAPTER' }
  | { type: 'REVISIT'; phase: AscentPhase };

type Context = Record<string, never>;

/**
 * One Mount Havoc chapter: Preparation → Random Encounter → Hunt → Result. The chapter's
 * story reads as a journal band on the preparation screen rather than gating a step. There
 * is no RETRY_HUNT: the ascent is sudden death, so a defeat ends the run and the machine
 * simply stays in `result` with the ascent marked finished.
 */
export const ascentMachine = defineMachine<Context, AscentEvent>()({
  context: {},
  initial: 'preparing',
  states: {
    encounter: {
      on: {
        BEGIN_HUNT: { target: 'hunt' },
        REVISIT: { guard: ({ event }) => event.phase === 'preparing', target: 'preparing' },
      },
    },
    hunt: {
      on: {
        RECORD_RESULT: { target: 'result' },
        REVISIT: [
          { guard: ({ event }) => event.phase === 'preparing', target: 'preparing' },
          { guard: ({ event }) => event.phase === 'encounter', target: 'encounter' },
        ],
      },
    },
    preparing: {
      on: { REVEAL_ENCOUNTER: { target: 'encounter' } },
    },
    result: {
      on: { NEXT_CHAPTER: { target: 'preparing' } },
    },
  },
});

export const ASCENT_PHASES: readonly AscentPhase[] = ['preparing', 'encounter', 'hunt', 'result'];

export const ASCENT_PHASE_LABELS: Record<AscentPhase, string> = {
  encounter: 'Encounter',
  hunt: 'Hunt',
  preparing: 'Preparation',
  result: 'Result',
};

export function canTransitionAscent(phase: AscentPhase, event: AscentEvent): boolean {
  return canTransitionWith(ascentMachine, phase, event);
}

/** Pure phase transition. Throws when the event is not allowed from the current phase. */
export function transitionAscentPhase(phase: AscentPhase, event: AscentEvent): AscentPhase {
  return transitionPhaseWith(ascentMachine, ASCENT_PHASE_LABELS, phase, event);
}
