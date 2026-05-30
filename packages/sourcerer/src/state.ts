import type { SourceState } from './types';

/**
 * Derives a discriminated union state from any reactive source.
 *
 * Eliminates manual branching on `meta.isLoading` + `meta.errorMessage` + empty `current`.
 * Works with all source types (`LocalSource`, `RemoteSource`, `CursorSource`, `InfiniteSource`,
 * `DerivedSource`) via duck-typing on the minimal observable interface.
 *
 * @example
 * ```ts
 * const state = sourceState(source);
 *
 * switch (state.status) {
 *   case 'loading': return renderSpinner();
 *   case 'error':   return renderError(state.message);
 *   case 'data':    return renderList(state.items);
 * }
 * ```
 */
export function sourceState<T>(source: {
  readonly current: readonly T[];
  readonly meta: { readonly errorMessage: string | null; readonly isLoading: boolean };
}): SourceState<T> {
  if (source.meta.isLoading) return { status: 'loading' };

  if (source.meta.errorMessage) return { message: source.meta.errorMessage, status: 'error' };

  return { items: source.current, status: 'data' };
}
