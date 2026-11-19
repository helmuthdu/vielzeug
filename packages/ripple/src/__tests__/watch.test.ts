import { signal, watch } from '../index';

import { itScoped } from './scope-test';

describe('watch', () => {
  itScoped('does not invoke callback until source changes by default', () => {
    const count = signal(1);
    const values: Array<[number, number | undefined]> = [];
    const stop = watch(count, (value, previous) => values.push([value, previous]));

    count.value = 2;

    expect(values).toEqual([[2, 1]]);
    stop.dispose();
  });

  itScoped('suppresses equal source output', () => {
    const count = signal(1);
    const values: number[] = [];
    const stop = watch(
      () => count.value % 2,
      (value) => values.push(value),
    );

    count.value = 3;
    count.value = 4;

    expect(values).toEqual([0]);
    stop.dispose();
  });

  itScoped('does not track reactive reads made only by the callback', () => {
    const source = signal(0);
    const unrelated = signal(0);
    let sourceReads = 0;
    const stop = watch(
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
  });

  const errors: string[] = [];

  itScoped(
    'retries watcher after immediate callback fails',
    () => {
      const count = signal(1);
      const values: number[] = [];
      const stop = watch(
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
    },
    { onError: (error, context) => errors.push(`${context.kind}:${(error as Error).message}`) },
  );
});
