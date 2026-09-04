import { createLedger } from '@vielzeug/ledger';
import { can } from './auth';
import { bus } from './events';
import { canTransition } from './opportunity-machine';
import { crmData, currentUser, patchOpportunity, prependActivity } from './store';
import type { Opportunity, OpportunityStage } from './types';

export const ledger = createLedger({ maxHistory: 50 });

function activityId(): string {
  return `activity-${crypto.randomUUID()}`;
}

export async function moveOpportunity(id: string, to: OpportunityStage): Promise<boolean> {
  if (!can('update')) return false;

  const opportunity = crmData.value.opportunities.find((item) => item.id === id);
  if (!opportunity || opportunity.stage === to) return false;
  const from = opportunity.stage;
  if (!canTransition(id, from, to)) {
    bus.emit('toast:show', {
      message: `Cannot move opportunity from ${from.replace('-', ' ')} to ${to.replace('-', ' ')}.`,
      variant: 'error',
    });
    return false;
  }
  await ledger.do({
    apply: () => patchOpportunity(id, { stage: to }),
    label: `Move ${opportunity.name} to ${to}`,
    revert: () => patchOpportunity(id, { stage: from }),
  });
  const description = `moved ${opportunity.name} to ${to.replace('-', ' ')}`;
  prependActivity({
    actor: currentUser.value.name,
    category: 'system',
    companyId: opportunity.companyId,
    createdAt: new Date().toISOString(),
    description,
    id: activityId(),
    kind: 'opportunity.stageChanged',
    opportunityId: id,
  });
  bus.emit('opportunity:stage-changed', { actor: currentUser.value.name, from, opportunityId: id, to });
  bus.emit('toast:show', {
    action: { label: 'Undo', run: () => void ledger.undo() },
    message: `Opportunity moved to ${to.replace('-', ' ')}.`,
    variant: 'success',
  });
  return true;
}

export async function editOpportunity(id: string, patch: Partial<Opportunity>): Promise<boolean> {
  if (!can('update')) return false;

  const previous = crmData.value.opportunities.find((item) => item.id === id);
  if (!previous) return false;
  const rollback: Partial<Opportunity> = {};
  for (const key of Object.keys(patch) as (keyof Opportunity)[]) {
    (rollback as Record<string, unknown>)[key] = previous[key];
  }
  await ledger.do({
    apply: () => patchOpportunity(id, patch),
    label: `Edit ${previous.name}`,
    revert: () => patchOpportunity(id, rollback),
  });
  bus.emit('toast:show', {
    action: { label: 'Undo', run: () => void ledger.undo() },
    message: 'Opportunity updated.',
    variant: 'success',
  });
  return true;
}
