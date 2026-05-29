import type { BaseSource } from './types';

export function shallowEqual<T>(left: T, right: T): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftObject = left as Record<string, unknown>;
  const rightObject = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftObject);
  const rightKeys = Object.keys(rightObject);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!Object.is(leftObject[key], rightObject[key])) {
      return false;
    }
  }

  return true;
}

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
