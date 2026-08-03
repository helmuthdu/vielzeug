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

  it('retries watcher after immediate callback fails', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError(error, context) {
        errors.push(`${context.kind}:${(error as Error).message}`);
      },
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
