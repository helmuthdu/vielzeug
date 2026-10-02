import { defineMachine } from '@vielzeug/clockwork';
import { PrimalDomainError } from './errors';
import type { QuestStatus } from './types';

export type QuestEvent =
  | { type: 'ACTIVATE' }
  | { type: 'COMPLETE' }
  | { type: 'DEACTIVATE' }
  | { type: 'EXPIRE' }
  | { type: 'UNLOCK' };

export const questMachine = defineMachine<Record<string, never>, QuestEvent>()({
  context: {},
  initial: 'locked',
  states: {
    active: {
      on: {
        COMPLETE: { target: 'completed' },
        DEACTIVATE: { target: 'available' },
        EXPIRE: { target: 'expired' },
      },
    },
    available: {
      on: {
        ACTIVATE: { target: 'active' },
        EXPIRE: { target: 'expired' },
      },
    },
    completed: {},
    expired: {},
    locked: { on: { UNLOCK: { target: 'available' } } },
  },
});

export function transitionQuest(status: QuestStatus, event: QuestEvent): QuestStatus {
  const result = questMachine.transition({ context: {}, state: status }, event);
  if (result.type === 'ignored') {
    throw new PrimalDomainError('quest-state', `Cannot ${event.type.toLowerCase()} a quest while it is ${status}.`);
  }
  return result.snapshot.state;
}
