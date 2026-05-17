import type { ReadonlySignal } from '@vielzeug/stateit';

/**
 * A branded signal that tells the attribute binding engine to skip writing when
 * the DOM value has diverged from the last programmatically-written value.
 * Created via live(signal) — pass a signal directly rather than wrapping a value.
 *
 * @example
 * html`<input :value="${live(model)}" />`
 */
export type LiveSignal<T> = ReadonlySignal<T> & { readonly __live: true };

/**
 * Marks a signal binding as "live" so stale app-state writes never clobber
 * in-progress user input.
 *
 * For form controls: if the current DOM value diverges from the last write made
 * by this binding, subsequent app-state writes are silently dropped until the
 * DOM value matches the incoming value or no prior write has been recorded.
 */
export const live = <T>(source: ReadonlySignal<T>): LiveSignal<T> =>
  ({
    __live: true as const,
    get value(): T {
      return source.value;
    },
  }) as LiveSignal<T>;

export const isLiveSignal = (value: unknown): value is LiveSignal<unknown> =>
  typeof value === 'object' && value !== null && (value as Record<string, unknown>).__live === true;
