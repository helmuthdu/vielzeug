import type { BandScale, Scale } from '../types';

export type AnyScale = BandScale | Scale<Date> | Scale<number>;

function isBandScale(scale: AnyScale): scale is BandScale {
  return typeof (scale as BandScale).bandwidth === 'function';
}

/**
 * Maps a tick value through any of prism's three scale kinds, centering band-scale
 * ticks on their band (bandScale.map() returns a band's left edge by design).
 *
 * Overloaded so a caller's `tick` type must match the scale kind it's paired with —
 * `AxisConfig`/`GridConfig` accept any scale kind, so the runtime discrimination
 * inside the implementation is unavoidable, but the overload set keeps that a single
 * isolated cast here instead of an unchecked `Date | number | string` accepted at
 * every call site.
 */
export function mapTick(scale: BandScale, tick: string): number;
export function mapTick(scale: Scale<Date>, tick: Date): number;
export function mapTick(scale: Scale<number>, tick: number): number;
// Fallback overload for callers (axis.ts/grid.ts) holding an already-erased `AnyScale`
// union — the type-correlated overloads above are what protect a caller with a
// narrower, known scale type from mismatching it with the wrong tick type.
export function mapTick(scale: AnyScale, tick: Date | number | string): number;
export function mapTick(scale: AnyScale, tick: Date | number | string): number {
  if (isBandScale(scale)) return scale.map(tick as string) + scale.bandwidth() / 2;

  return (scale as Scale<Date | number>).map(tick as Date | number);
}
