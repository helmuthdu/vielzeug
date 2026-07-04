import { describe, expect, it, vi } from 'vitest';

import { createMutation } from '../mutation';
import { toSyncStore } from '../sync-store';

describe('toSyncStore', () => {
  it('peek() delegates to the source object', () => {
    const source = { peek: vi.fn(() => 'value'), subscribe: vi.fn(() => () => {}) };
    const store = toSyncStore(source);

    expect(store.peek()).toBe('value');
    expect(source.peek).toHaveBeenCalledTimes(1);
  });

  it('subscribe() delegates to the source object and returns its unsubscribe function', () => {
    const unsubscribe = vi.fn();
    const source = { peek: vi.fn(() => 'value'), subscribe: vi.fn(() => unsubscribe) };
    const store = toSyncStore(source);

    const cb = vi.fn();
    const returned = store.subscribe(cb);

    expect(source.subscribe).toHaveBeenCalledWith(cb);

    returned();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('adapts a real Mutation instance into a plain SyncStore', async () => {
    const mutation = createMutation(async (n: number) => n * 2);
    const store = toSyncStore(mutation);

    expect(store.peek()).toEqual(mutation.peek());

    const states: string[] = [];
    const unsub = store.subscribe(() => states.push(store.peek().status));

    await mutation.mutate(21);
    unsub();

    expect(states).toEqual(['loading', 'success']);
    expect(store.peek()).toMatchObject({ data: 42, status: 'success' });
  });
});
