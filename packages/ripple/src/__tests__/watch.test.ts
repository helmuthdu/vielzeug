import { createRipple } from '../index';

describe('watch', () => {
  it('does not invoke callback until source changes by default', () => {
    const ripple = createRipple();
    const count = ripple.signal(1);
    const values: Array<[number, number | undefined]> = [];
    const stop = ripple.watch(count, (value, previous) => values.push([value, previous]));

    count.value = 2;

    expect(values).toEqual([[2, 1]]);
    stop.dispose();
    ripple.dispose();
  });

  it('suppresses equal source output', () => {
    const ripple = createRipple();
    const count = ripple.signal(1);
    const values: number[] = [];
    const stop = ripple.watch(
      () => count.value % 2,
      (value) => values.push(value),
    );

    count.value = 3;
    count.value = 4;

    expect(values).toEqual([0]);
    stop.dispose();
    ripple.dispose();
  });

  it('does not track reactive reads made only by the callback', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    const unrelated = ripple.signal(0);
    let sourceReads = 0;
    const stop = ripple.watch(
      () => {
        sourceReads += 1;
        return source.value;
      },
      () => void unrelated.value,
      { immediate: true },
    );

    unrelated.value = 1;

    expect(sourceReads).toBe(1);
    stop.dispose();
    ripple.dispose();
  });

  it('disposes a once watcher even when its callback fails', () => {
    const ripple = createRipple({ errorPolicy: 'swallow' });
    const count = ripple.signal(1);
    const callback = vi.fn(() => {
      throw new Error('failed callback');
    });
    const stop = ripple.watch(count, callback, { immediate: true, once: true });

    count.value = 2;

    expect(callback).toHaveBeenCalledOnce();
    expect(stop.disposed).toBe(true);
    ripple.dispose();
  });

  it('retries watcher after immediate callback fails', () => {
    const errors: string[] = [];
    const ripple = createRipple({ errorPolicy: 'swallow' });
    ripple.tap((event) => {
      if (event.type === 'error') errors.push(`${event.context.kind}:${(event.error as Error).message}`);
    });
    const count = ripple.signal(1);
    const values: number[] = [];
    const stop = ripple.watch(
      count,
      (value) => {
        if (value === 1) throw new Error('not ready');

        values.push(value);
      },
      { immediate: true },
    );

    count.value = 2;

    expect(errors).toEqual(['effect:not ready']);
    expect(values).toEqual([2]);
    stop.dispose();
    ripple.dispose();
  });
});
