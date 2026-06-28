import { batch, effect, signal, watch } from '../';

describe('batch', () => {
  it('coalesces notifications into a single callback', () => {
    const n = signal(0);
    const listener = vi.fn();

    watch(n, listener);
    batch(() => {
      n.value = 1;
      n.value = 2;
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
  });

  it('body error clears the pending flush queue — effect does not run', () => {
    const n = signal(0);
    const log: number[] = [];

    effect(() => {
      log.push(n.value);
    });
    expect(() => {
      batch(() => {
        n.value = 1;
        throw new Error('boom');
      });
    }).toThrow('boom');
    expect(log).toEqual([0]);
  });

  it('body error is rethrown without flushing — subscriber not called', () => {
    const n = signal(0);
    let subscriberCalled = false;
    const stop = effect(() => {
      if (n.value > 0) subscriberCalled = true;
    });
    let caught: unknown;

    try {
      batch(() => {
        n.value = 1;
        throw new Error('fn-boom');
      });
    } catch (e) {
      caught = e;
    }

    expect((caught as Error).message).toBe('fn-boom');
    expect(subscriberCalled).toBe(false);
    stop.dispose();
  });

  it('aggregates multiple subscriber errors from a flush', () => {
    const n = signal(0);

    effect(() => {
      if (n.value > 0) throw new Error('sub-a');
    });
    effect(() => {
      if (n.value > 0) throw new Error('sub-b');
    });
    expect(() => {
      batch(() => {
        n.value = 1;
      });
    }).toThrow(AggregateError);
  });

  it('preserves flush AggregateError details when batch body succeeds', () => {
    const n = signal(0);

    effect(() => {
      if (n.value > 0) throw new Error('sub-a');
    });
    effect(() => {
      if (n.value > 0) throw new Error('sub-b');
    });

    let caught: unknown;

    try {
      batch(() => {
        n.value = 1;
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toHaveLength(2);
    expect((caught as AggregateError).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'sub-a' }),
        expect.objectContaining({ message: 'sub-b' }),
      ]),
    );
  });

  it('does not swallow throw undefined', () => {
    expect(() =>
      batch(() => {
        throw undefined;
      }),
    ).toThrow();
  });

  it('returns the value produced by the batch fn', () => {
    const result = batch(() => 42);

    expect(result).toBe(42);
  });

  it('returns undefined when fn returns void', () => {
    const result = batch(() => {});

    expect(result).toBeUndefined();
  });

  it('body error clears pending queue — flush does not run', () => {
    const s = signal(0);
    let flushRan = false;
    const stop = effect(() => {
      if (s.value > 0) flushRan = true;
    });

    expect(() => {
      batch(() => {
        s.value = 1;
        throw new Error('body-error');
      });
    }).toThrow('body-error');
    expect(flushRan).toBe(false);
    stop.dispose();
    s.dispose();
  });
});
