import { defineMachine } from '@vielzeug/clockwork';
import { canTransitionWith, transitionPhaseWith } from './phase-machine';
import type { ChapterPhase } from './types';

export type ChapterEvent =
  | { type: 'BEGIN_FINALE' }
  | { type: 'BEGIN_PREPARATION' }
  | { type: 'FINISH_PREPARING' }
  | { type: 'RECORD_RESULT' }
  | { type: 'NEXT_CHAPTER' }
  | { type: 'RETRY_HUNT' }
  | { type: 'REVISIT'; phase: ChapterPhase };

type Context = Record<string, never>;

/**
 * The rulebook's chapter structure: Quest Board → Preparation → Hunt: as a flat machine. The
 * chapter's reward box applies automatically when the chapter starts (`advanceChapter`), so the
 * story step lives in the preparation's lore band instead of a phase of its own. `REVISIT` lets
 * players step back to an earlier phase; the forward events keep the expected next step obvious.
 */
export const chapterMachine = defineMachine<Context, ChapterEvent>()({
  context: {},
  initial: 'quest-board',
  states: {
    hunt: {
      on: {
        RECORD_RESULT: { target: 'result' },
        REVISIT: [
          { guard: ({ event }) => event.phase === 'quest-board', target: 'quest-board' },
          { guard: ({ event }) => event.phase === 'preparing', target: 'preparing' },
        ],
      },
    },
    preparing: {
      on: {
        FINISH_PREPARING: { target: 'hunt' },
        REVISIT: [{ guard: ({ event }) => event.phase === 'quest-board', target: 'quest-board' }],
      },
    },
    'quest-board': {
      on: { BEGIN_PREPARATION: { target: 'preparing' } },
    },
    result: {
      on: {
        BEGIN_FINALE: { target: 'preparing' },
        NEXT_CHAPTER: { target: 'quest-board' },
        RETRY_HUNT: { target: 'preparing' },
      },
    },
  },
});

export const CHAPTER_PHASES: readonly ChapterPhase[] = ['quest-board', 'preparing', 'hunt', 'result'];

export const PHASE_LABELS: Record<ChapterPhase, string> = {
  hunt: 'Hunt',
  preparing: 'Preparation',
  'quest-board': 'Quest Board',
  result: 'Result',
};

export function canTransition(phase: ChapterPhase, event: ChapterEvent): boolean {
  return canTransitionWith(chapterMachine, phase, event);
}

/** Pure phase transition. Throws when the event is not allowed from the current phase. */
export function transitionPhase(phase: ChapterPhase, event: ChapterEvent): ChapterPhase {
  return transitionPhaseWith(chapterMachine, PHASE_LABELS, phase, event);
}
