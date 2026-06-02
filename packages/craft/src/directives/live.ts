import type { ReadonlySignal } from '@vielzeug/ripple';

const LIVE_BRAND: unique symbol = Symbol.for('craft:live');

/**
 * A branded signal that tells the attribute binding engine to skip writing when
 * the DOM value has diverged from the last programmatically-written value.
 * Created via live(signal) — pass a signal directly rather than wrapping a value.
 *
 * @example
 * html`<input :value="${live(model)}" />`
 */
export type LiveSignal<T> = ReadonlySignal<T> & { readonly [LIVE_BRAND]: true };

// WeakSet tracks which signal objects have been marked live — zero allocation on call.
let liveSignals = new WeakSet<object>();

/**
 * Marks a signal binding as "live" so stale app-state writes never clobber
 * in-progress user input.
 *
 * For form controls: if the current DOM value diverges from the last write made
 * by this binding, subsequent app-state writes are silently dropped until the
 * DOM value matches the incoming value or no prior write has been recorded.
 */
export const live = <T>(source: ReadonlySignal<T>): LiveSignal<T> => {
  liveSignals.add(source as object);

  return source as LiveSignal<T>;
};

export const isLiveSignal = (value: unknown): value is LiveSignal<unknown> =>
  typeof value === 'object' && value !== null && liveSignals.has(value as object);

/** @internal Reset live signal registry. Called by cleanup() for test isolation. */
export const _resetLiveSignals = (): void => {
  liveSignals = new WeakSet();
};
