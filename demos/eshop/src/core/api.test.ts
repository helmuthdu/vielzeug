import { describe, expect, it } from 'vitest';

import { fetchModelsRequest, fetchOrdersRequest, placeOrderRequest } from './api';

describe('Courier cache integration', () => {
  it('reuses immutable catalogue reads', async () => {
    const first = await fetchModelsRequest();
    const second = await fetchModelsRequest();

    expect(second).toBe(first);
  });

  it('invalidates every order-list variant after a write', async () => {
    const before = await fetchOrdersRequest();
    const template = before[0];
    if (!template) throw new Error('Expected seeded orders');
    const created = { ...template, id: 'cache-integration-order', userId: 'cache-integration-user' };

    await fetchOrdersRequest(created.userId);
    await placeOrderRequest(created);

    const [all, user] = await Promise.all([fetchOrdersRequest(), fetchOrdersRequest(created.userId)]);
    expect(all).toContainEqual(created);
    expect(user).toEqual([created]);
  });
});
