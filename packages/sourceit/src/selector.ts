import type { BaseSource } from './types';

export const subscribeSelector = <T, U>(
  source: BaseSource<T>,
  selector: (source: BaseSource<T>) => U,
  listener: (next: U, prev: U) => void,
  isEqual: (a: U, b: U) => boolean = Object.is,
): (() => void) => {
  let previous = selector(source);

  return source.subscribe(() => {
    const next = selector(source);

    if (isEqual(next, previous)) {
      return;
    }

    const prev = previous;

    previous = next;
    listener(next, prev);
  });
};
