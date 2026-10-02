import { defineMachine } from '@vielzeug/clockwork';
import { canTransitionWith, transitionPhaseWith } from './phase-machine';
import type { ChallengePhase } from './types';

export type ChallengeEvent =
  | { type: 'ROLL_ENCOUNTER' }
  | { type: 'FINISH_PREPARATION' }
  | { type: 'RECORD_RESULT'; result: 'victory' | 'defeat' }
  | { type: 'NEXT_SESSION' }
  | { type: 'REVISIT'; phase: ChallengePhase };

type Context = Record<string, never>;

/**
 * One Winds session arc: the quest board (choose the monster, roll the die) → preparation
 * (draft the sheet's gear or spend the last hunt's spoils, build the deck) → hunt → result
 * (the score, then the bounty that raises or heals), looping through the five expeditions.
 * The quest board is forward-only once the die is rolled: re-entering it would re-roll the
 * fight's target, so the only back-step is hunt → preparation, to fix the deck before the
 * fight is recorded. There is no retry: a defeat records straight to the result and finishes
 * the run, exactly like the ascent's sudden death.
 */
export const challengeMachine = defineMachine<Context, ChallengeEvent>()({
  context: {},
  initial: 'quest-board',
  states: {
    hunt: {
      on: {
        RECORD_RESULT: { target: 'result' },
        REVISIT: { guard: ({ event }) => event.phase === 'preparing', target: 'preparing' },
      },
    },
    preparing: {
      on: { FINISH_PREPARATION: { target: 'hunt' } },
    },
    'quest-board': {
      on: { ROLL_ENCOUNTER: { target: 'preparing' } },
    },
    result: {
      on: { NEXT_SESSION: { target: 'quest-board' } },
    },
  },
});

export const CHALLENGE_PHASES: readonly ChallengePhase[] = ['quest-board', 'preparing', 'hunt', 'result'];

export const CHALLENGE_PHASE_LABELS: Record<ChallengePhase, string> = {
  hunt: 'Hunt',
  preparing: 'Preparation',
  'quest-board': 'Quest board',
  result: 'Result',
};

/** Throws unless the phase transition is printed on the sheet. */
export function transitionChallengePhase(phase: ChallengePhase, event: ChallengeEvent): ChallengePhase {
  return transitionPhaseWith(challengeMachine, CHALLENGE_PHASE_LABELS, phase, event);
}

/** True while the transition into the phase is printed on the sheet. */
export function canTransitionChallenge(phase: ChallengePhase, event: ChallengeEvent): boolean {
  return canTransitionWith(challengeMachine, phase, event);
}
