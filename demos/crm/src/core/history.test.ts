import { beforeEach, describe, expect, it } from 'vitest';
import { ledger, moveOpportunity } from './history';
import { seedData } from './seed-data';
import { crmData } from './store';

describe('opportunity history', () => {
  beforeEach(async () => {
    crmData.value = structuredClone(seedData);
    await ledger.clear();
  });

  it('moves and undoes an opportunity', async () => {
    await expect(moveOpportunity('opportunity-1', 'negotiation')).resolves.toBe(true);
    expect(crmData.value.opportunities[0].stage).toBe('negotiation');
    await ledger.undo();
    expect(crmData.value.opportunities[0].stage).toBe('proposal');
    await ledger.redo();
    expect(crmData.value.opportunities[0].stage).toBe('negotiation');
  });

  it('does not record an invalid transition', async () => {
    await expect(moveOpportunity('opportunity-1', 'closed-won')).resolves.toBe(false);
    expect(crmData.value.opportunities[0].stage).toBe('proposal');
    expect(ledger.state.value.undo).toHaveLength(0);
  });
});
