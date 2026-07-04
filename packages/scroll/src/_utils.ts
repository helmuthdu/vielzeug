import { warn } from './_dev';

export type ScrollTarget = HTMLElement | Window;

export type VirtualKey = number | string;

/** Shared measurement cache. Pass the same instance to multiple virtualizers
 *  for scroll restoration or SSR pre-measurement. */
export type MeasurementCache = Map<VirtualKey, number>;

/** Create a new, empty measurement cache. */
export function createMeasurementCache(): MeasurementCache {
  return new Map();
}

export type Overscan = number | { end?: number; start?: number };

export const DEFAULT_ESTIMATE_SIZE = 36;
export const DEFAULT_OVERSCAN = 3;

// ─── Numeric helpers ───────────────────────────────────────────────────────────

export function toNonNegativeInt(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;

  return Math.max(0, Math.floor(value));
}

export function toPositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 1e7) return fallback;

  return value;
}

export function isWindowTarget(target: ScrollTarget): target is Window {
  return (
    (typeof Window !== 'undefined' && target instanceof Window) ||
    (typeof (target as Window).innerHeight === 'number' && typeof (target as Window).document === 'object')
  );
}

export function normalizeOverscan(overscan: Overscan | undefined, defaultVal: number): { end: number; start: number } {
  if (typeof overscan === 'number') {
    const n = toNonNegativeInt(overscan, defaultVal);

    return { end: n, start: n };
  }

  return {
    end: toNonNegativeInt(overscan?.end ?? defaultVal),
    start: toNonNegativeInt(overscan?.start ?? defaultVal),
  };
}

/**
 * Create a `ResizeObserver` that reports size changes on `el` via `onSize`, tied to
 * `signal` so it is disconnected automatically when the owning factory disposes —
 * even if the caller never calls the returned disconnect function.
 */
export function observeResize(
  signal: AbortSignal,
  el: HTMLElement,
  onSize: (entry: ResizeObserverEntry) => void,
): () => void {
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) onSize(entry);
  });

  ro.observe(el);
  signal.addEventListener('abort', () => ro.disconnect(), { once: true });

  return () => ro.disconnect();
}

export function resolveEstimateFn(
  estimate: number | ((index: number) => number) | undefined,
  defaultSize: number,
): (index: number) => number {
  if (typeof estimate === 'function') {
    return (index: number) => {
      try {
        return toPositiveNumber(estimate(index), defaultSize);
      } catch (err) {
        warn(`estimateSize threw for index ${index}: ${err}`);

        return defaultSize;
      }
    };
  }

  const size = typeof estimate === 'number' ? toPositiveNumber(estimate, defaultSize) : defaultSize;

  return () => size;
}
