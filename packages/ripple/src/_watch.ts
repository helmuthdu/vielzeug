import type { EffectHandle, Equality, Readable } from './types';

export type WatchOptions<T> = {
  equals?: Equality<T>;
  immediate?: boolean;
  name?: string;
  once?: boolean;
};

type WatchRuntime = {
  effect(callback: () => undefined | (() => void), options?: { name?: string }): EffectHandle;
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
    let stopAfterInitialRun = false;

    const handle = runtime.effect(
      () => {
        const value = read();

        if (initial) {
          initial = false;
          previous = value;

          if (options?.immediate) callback(value, undefined);

          stopAfterInitialRun = options?.once === true && options.immediate === true;

          return;
        }

        if (equals(previous as T, value)) return;

        const oldValue = previous;

        previous = value;
        callback(value, oldValue);

        if (options?.once) handle.dispose();
      },
      { name: options?.name },
    );

    if (stopAfterInitialRun) handle.dispose();

    return handle;
  };
