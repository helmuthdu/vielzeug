import type { EffectHandle, Equality, Readable } from './types';

export type WatchOptions<T> = {
  equals?: Equality<T>;
  immediate?: boolean;
  name?: string;
};

type WatchRuntime = {
  effect(callback: () => undefined | (() => void), options?: { name?: string }): EffectHandle;
  untrack<T>(fn: () => T): T;
};

export const createWatch =
  (runtime: WatchRuntime) =>
  <T>(
    source: Readable<T> | (() => T),
    callback: (value: T, previous: T | undefined) => void,
    options?: WatchOptions<T>,
  ): EffectHandle => {
    const read = typeof source === 'function' ? source : () => source.value;
    const equals = options?.equals ?? Object.is;
    let initial = true;
    let previous: T | undefined;

    return runtime.effect(
      () => {
        const value = read();

        if (initial) {
          initial = false;
          previous = value;

          if (options?.immediate) runtime.untrack(() => callback(value, undefined));

          return;
        }

        if (equals(previous as T, value)) return;

        const oldValue = previous;

        previous = value;
        runtime.untrack(() => callback(value, oldValue));
      },
      { name: options?.name },
    );
  };
