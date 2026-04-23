import type { QueryState, QueryStatus } from './types';

export function makeState<T>(entry: {
  data: T | undefined;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
}): QueryState<T> {
  const { data, error, status, updatedAt } = entry;

  return { data, error, status, updatedAt };
}

export function dispatch<T>(observers: Set<(s: T) => void>, state: T): void {
  observers.forEach((fn) => fn(state));
}
