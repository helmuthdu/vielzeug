import type { SourceError, SourceState } from './types';

/**
 * Derives a `SourceState<T>` discriminated union from a reactive source.
 * Works with any object that exposes `current`, `meta.isLoading`, and `meta.error`.
 *
 * @example
 * ```ts
 * const state = sourceState(source);
 * if (state.status === 'loading') return <Spinner />;
 * if (state.status === 'error') return <p>{state.error.message}</p>;
 * return <List items={state.items} />;
 * ```
 */
export function sourceState<T>(source: {
  readonly current: readonly T[];
  readonly meta: { readonly error: SourceError | null; readonly isLoading: boolean };
}): SourceState<T> {
  if (source.meta.isLoading) return { status: 'loading' };

  if (source.meta.error) return { error: source.meta.error, status: 'error' };

  return { items: source.current, status: 'data' };
}
