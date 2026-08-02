import type { Readable } from '@vielzeug/ripple';

import { makeBrand } from '../utils/brand';

/**
 * A per-binding marker produced by `live()`. Wraps the source signal — the
 * "live" flag belongs to this one binding site, never to the signal itself,
 * so other bindings of the same signal are unaffected.
 *
 * @example
 * html`<input value="${live(model)}" />`
 */
export type LiveBinding<T> = { readonly source: Readable<T> };

const liveBrand = makeBrand<LiveBinding<unknown>>('ore:live');

/**
 * Marks one attribute binding as "live" so stale app-state writes never clobber
 * in-progress user input at that binding site.
 *
 * For form controls: if the current DOM value diverges from the last write made
 * by this binding, subsequent app-state writes are silently dropped until the
 * DOM value matches the incoming value or no prior write has been recorded.
 */
export const live = <T>(source: Readable<T>): LiveBinding<T> => liveBrand.stamp({ source }) as LiveBinding<T>;

export const isLiveBinding = liveBrand.is;
