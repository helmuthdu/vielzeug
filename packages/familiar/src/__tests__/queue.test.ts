import { describe, expect, it, vi } from 'vitest';

import { type QueueItem, TaskQueue } from '../_queue';

const item = (priority: number): QueueItem<number, number> => ({
  input: priority,
  priority,
  reject: vi.fn(),
  resolve: vi.fn(),
  transferables: [],
});

describe('TaskQueue', () => {
  it('removes cancelled entries eagerly while preserving heap order', () => {
    const queue = new TaskQueue<number, number>();
    const low = item(1);
    const middle = item(5);
    const high = item(10);

    queue.enqueue(low, undefined);
    queue.enqueue(middle, undefined);
    queue.enqueue(high, undefined);
    expect(queue.remove(middle)).toBe(true);
    expect(queue.size).toBe(2);
    expect(queue.shift()).toBe(high);
    expect(queue.shift()).toBe(low);
    expect(queue.shift()).toBeUndefined();
  });

  it('fully empties after removing every queued item', () => {
    const queue = new TaskQueue<number, number>();
    const queued = Array.from({ length: 100 }, (_, priority) => item(priority));

    for (const entry of queued) queue.enqueue(entry, undefined);
    for (const entry of queued) expect(queue.remove(entry)).toBe(true);

    expect(queue.size).toBe(0);
    expect(queue.shift()).toBeUndefined();
  });
});
