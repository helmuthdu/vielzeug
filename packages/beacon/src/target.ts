import type { BeaconRect, BeaconTarget, BeaconTargetResolver } from './types';

const isElement = (value: unknown): value is Element => typeof Element !== 'undefined' && value instanceof Element;

const isRect = (value: unknown): value is BeaconRect =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as BeaconRect).x === 'number' &&
  typeof (value as BeaconRect).y === 'number' &&
  typeof (value as BeaconRect).width === 'number' &&
  typeof (value as BeaconRect).height === 'number';

/** Copies into a plain rect: a DOMRect carries methods and a prototype the contract does not promise. */
const normalize = (value: Element | BeaconRect | null): BeaconRect | null => {
  if (value === null) return null;
  if (!isElement(value)) return value;
  const box = value.getBoundingClientRect();

  return { height: box.height, width: box.width, x: box.x, y: box.y };
};

/**
 * Resolves a target to a viewport-space rect, or `null` when it is not available
 * yet. The shape matches `getBoundingClientRect()` and `@vielzeug/orbit`'s
 * `Rect`, so a presentation layer can anchor an orbit positioner with:
 *
 * ```ts
 * const reference = { getBoundingClientRect: () => resolveTarget(step.target) ?? ZERO_RECT };
 * ```
 *
 * Call it on every position update rather than caching the result: a target
 * moves when the page scrolls, and the panel has to follow.
 */
export function resolveTarget(target: BeaconTarget): BeaconRect | null {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') return null;

    return normalize(document.querySelector(target));
  }

  if (typeof target === 'function') {
    const resolved = (target as BeaconTargetResolver)();

    return normalize(resolved === null || resolved === undefined ? null : resolved);
  }

  return normalize(target);
}

/** @internal Whether a target currently resolves; decides whether observation is needed. */
export function targetAvailable(target: BeaconTarget): boolean {
  return resolveTarget(target) !== null;
}

/**
 * @internal The live element a target points at, or `null` when it resolves to a
 * bare rect or is not in the document. Layout observation needs the element:
 * a rect has no box to watch, so those targets stay scroll/resize-only.
 */
export function targetElement(target: BeaconTarget): Element | null {
  if (typeof target === 'string') {
    return typeof document === 'undefined' ? null : document.querySelector(target);
  }

  if (typeof target === 'function') {
    const resolved = (target as BeaconTargetResolver)();

    return resolved === null || resolved === undefined || !isElement(resolved) ? null : resolved;
  }

  return isElement(target) ? target : null;
}

/** @internal Static targets never change availability, so there is nothing to observe. */
export function isStaticTarget(target: BeaconTarget): boolean {
  return isElement(target) || isRect(target);
}

/** @internal Value equality for rects, so a layout refresh that changed nothing republishes nothing. */
export function sameRect(a: BeaconRect | null, b: BeaconRect | null): boolean {
  if (a === null || b === null) return a === b;

  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
