import { beforeEach, describe, expect, it } from 'vitest';
import { currentUser } from './auth';
import { canCancelOrder } from './order-actions';
import { seedOrders, seedUsers } from './seed-data';

describe('order action availability', () => {
  beforeEach(() => {
    currentUser.value = seedUsers[0];
  });

  it('allows the owning customer to cancel only before processing starts', () => {
    const order = seedOrders[0];

    expect(canCancelOrder({ ...order, status: 'placed' })).toBe(true);
    expect(canCancelOrder({ ...order, status: 'processing' })).toBe(false);
    expect(canCancelOrder({ ...order, status: 'in-transit' })).toBe(false);
    expect(canCancelOrder({ ...order, status: 'delivered' })).toBe(false);
    expect(canCancelOrder({ ...order, status: 'cancelled' })).toBe(false);
  });

  it('keeps cancellation unavailable to non-customer personas', () => {
    currentUser.value = seedUsers[1];

    expect(canCancelOrder({ ...seedOrders[0], status: 'placed' })).toBe(false);
  });
});
