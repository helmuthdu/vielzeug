import { describe, expect, it, vi } from 'vitest';

import { createChannel } from '../subjects';

describe('createChannel()', () => {
  it('multicasts through a read-only stream', () => {
    const channel = createChannel<number>();
    const first: number[] = [];
    const second: number[] = [];

    channel.stream.subscribe((value) => first.push(value));
    channel.stream.subscribe((value) => second.push(value));
    channel.send(1);
    channel.send(2);

    expect(first).toEqual([1, 2]);
    expect(second).toEqual([1, 2]);
  });

  it('replays an explicit bounded history', () => {
    const channel = createChannel<string>({ replay: 2 });

    channel.send('first');
    channel.send('second');
    channel.send('third');

    const received: string[] = [];

    channel.stream.subscribe((value) => received.push(value));

    expect(received).toEqual(['second', 'third']);
  });

  it('uses initial value as one-value replay when replay is omitted', () => {
    const channel = createChannel({ initial: 0 });
    const values: number[] = [];

    channel.stream.subscribe((value) => values.push(value));

    expect(values).toEqual([0]);
  });

  it('disposes ownership and completes active and later subscribers', () => {
    const channel = createChannel<number>();
    const complete = vi.fn();

    channel.stream.subscribe({ complete, next: () => {} });
    channel.dispose();
    channel.stream.subscribe({ complete, next: () => {} });
    channel.send(1);

    expect(complete).toHaveBeenCalledTimes(2);
    expect(channel.disposalSignal.aborted).toBe(true);
    expect(channel.disposed).toBe(true);
  });

  it('rejects invalid replay capacity', () => {
    expect(() => createChannel({ replay: -1 })).toThrow(RangeError);
    expect(() => createChannel({ replay: 1.5 })).toThrow(RangeError);
  });
});
