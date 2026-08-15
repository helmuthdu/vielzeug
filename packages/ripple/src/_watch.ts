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
    // `handle` is in the temporal dead zone during the effect's initial synchronous run —
    // `runtime.effect()` calls `node.run()` before returning. Defer disposal until after
    // the constructor returns so `handle.dispose()` is reachable from inside the callback.
    let disposeAfterInit = false;

    const handle = runtime.effect(
      () => {
        const value = read();

        if (initial) {
          initial = false;
          previous = value;

          if (options?.immediate) {
            callback(value, undefined);
            if (options?.once) disposeAfterInit = true;
          }

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

    if (disposeAfterInit) handle.dispose();

    return handle;
  };
