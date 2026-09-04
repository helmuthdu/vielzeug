import { defineMachine } from '@vielzeug/clockwork';
import type { OpportunityStage } from './types';

type OpportunityEvent =
  | { type: 'BACK_TO_NEGOTIATION' }
  | { type: 'BACK_TO_PROPOSAL' }
  | { type: 'BACK_TO_QUALIFICATION' }
  | { type: 'CLOSE_LOST' }
  | { type: 'CLOSE_WON' }
  | { type: 'NEGOTIATE' }
  | { type: 'PROPOSE' }
  | { type: 'QUALIFY' }
  | { type: 'REOPEN' };

type Context = { opportunityId: string };

const eventForTransition: Partial<Record<`${OpportunityStage}:${OpportunityStage}`, OpportunityEvent>> = {
  'closed-lost:negotiation': { type: 'REOPEN' },
  'closed-won:negotiation': { type: 'REOPEN' },
  'negotiation:closed-lost': { type: 'CLOSE_LOST' },
  'negotiation:closed-won': { type: 'CLOSE_WON' },
  'negotiation:proposal': { type: 'BACK_TO_PROPOSAL' },
  'proposal:negotiation': { type: 'NEGOTIATE' },
  'proposal:qualification': { type: 'BACK_TO_QUALIFICATION' },
  'prospecting:qualification': { type: 'QUALIFY' },
  'qualification:proposal': { type: 'PROPOSE' },
  'qualification:prospecting': { type: 'BACK_TO_QUALIFICATION' },
};

const machine = defineMachine<Context, OpportunityEvent>()({
  context: { opportunityId: '' },
  initial: 'prospecting',
  states: {
    'closed-lost': { on: { REOPEN: { target: 'negotiation' } } },
    'closed-won': { on: { REOPEN: { target: 'negotiation' } } },
    negotiation: {
      on: {
        BACK_TO_PROPOSAL: { target: 'proposal' },
        CLOSE_LOST: { target: 'closed-lost' },
        CLOSE_WON: { target: 'closed-won' },
      },
    },
    proposal: { on: { BACK_TO_QUALIFICATION: { target: 'qualification' }, NEGOTIATE: { target: 'negotiation' } } },
    prospecting: { on: { QUALIFY: { target: 'qualification' } } },
    qualification: { on: { BACK_TO_QUALIFICATION: { target: 'prospecting' }, PROPOSE: { target: 'proposal' } } },
  },
});

export function canTransition(id: string, from: OpportunityStage, to: OpportunityStage): boolean {
  const event = eventForTransition[`${from}:${to}`];
  if (!event) return false;
  const actor = machine.createActor({ snapshot: { context: { opportunityId: id }, state: from } });
  try {
    return actor.can(event);
  } finally {
    actor.dispose();
  }
}
