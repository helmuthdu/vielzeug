import { uniqueElements } from './_elements';
import { animateEach } from './animate-each';
import { NecromancerConfigError } from './errors';
import type { LayoutAnimationOptions, LayoutCaptureOptions, LayoutTransition } from './types';

type LayoutRect = Readonly<Pick<DOMRectReadOnly, 'height' | 'width' | 'x' | 'y'>>;
type LayoutEntry = Readonly<{ element: Element; rect: LayoutRect }>;
type LayoutChange = Readonly<{ element: Element; scaleX: number; scaleY: number; x: number; y: number }>;

// Rounds before templating into a keyframe string purely for DevTools readability — a `getBoundingClientRect()`
// subtraction routinely produces values like `12.340000000000002`, which is noise once rendered as CSS.
// Pixels only need whole-number precision; scale factors (close to 1) need finer precision to stay visually exact.
function round(value: number, precision: number): number {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

// `getBoundingClientRect()`'s width/height is the rotated, axis-aligned bounding box — using it
// for size would distort the scale ratio under any rotation. `offsetWidth`/`offsetHeight` report
// the box's own untransformed layout size instead. Elements without an offset box (e.g. SVG)
// fall back to the bounding rect, accepting that same distortion as the only option available.
function measureSize(element: Element): Readonly<{ height: number; width: number }> {
  if ('offsetWidth' in element && 'offsetHeight' in element) {
    return { height: (element as HTMLElement).offsetHeight, width: (element as HTMLElement).offsetWidth };
  }

  const rect = element.getBoundingClientRect();

  return { height: rect.height, width: rect.width };
}

function measureLayout(element: Element): LayoutRect {
  const rect = element.getBoundingClientRect();
  const size = measureSize(element);

  return { height: size.height, width: size.width, x: rect.x, y: rect.y };
}

// `next` is 0 exactly when the element has collapsed (e.g. `display: none` mid-transition);
// there's no meaningful ratio to compute then, so treat it as unscaled rather than producing Infinity/NaN.
function computeScale(captured: number, next: number): number {
  return next === 0 ? 1 : captured / next;
}

function readKey(element: Element, getKey: (element: Element) => string, phase: string): string {
  const key = getKey(element);

  if (typeof key !== 'string' || key.length === 0) {
    throw new NecromancerConfigError(`getKey must return a non-empty string for every ${phase} element.`);
  }

  return key;
}

function createKeyMap(entries: readonly LayoutEntry[], getKey: (element: Element) => string, phase: string) {
  const keys = new Map<string, LayoutEntry>();

  for (const entry of entries) {
    const key = readKey(entry.element, getKey, phase);

    if (keys.has(key)) {
      throw new NecromancerConfigError(`getKey returned duplicate keys for the ${phase} elements.`);
    }

    keys.set(key, entry);
  }

  return keys;
}

function changedElement(element: Element, rect: LayoutRect): LayoutChange | undefined {
  if (!element.isConnected) return undefined;

  const next = measureLayout(element);
  const x = rect.x - next.x;
  const y = rect.y - next.y;
  const scaleX = computeScale(rect.width, next.width);
  const scaleY = computeScale(rect.height, next.height);

  return x === 0 && y === 0 && scaleX === 1 && scaleY === 1 ? undefined : { element, scaleX, scaleY, x, y };
}

function matchByIdentity(entries: readonly LayoutEntry[], elements: readonly Element[]): LayoutChange[] {
  const captured = new Map(entries.map((entry) => [entry.element, entry]));

  return elements.flatMap((element) => {
    const entry = captured.get(element);

    return entry
      ? [changedElement(element, entry.rect)].filter((change): change is LayoutChange => Boolean(change))
      : [];
  });
}

function matchByKey(
  captured: ReadonlyMap<string, LayoutEntry>,
  elements: readonly Element[],
  getKey: (element: Element) => string,
): LayoutChange[] {
  const committed = new Set<string>();

  return elements.flatMap((element) => {
    const key = readKey(element, getKey, 'committed');
    const entry = captured.get(key);

    if (committed.has(key)) {
      throw new NecromancerConfigError('getKey returned duplicate keys for the committed elements.');
    }

    committed.add(key);

    return entry
      ? [changedElement(element, entry.rect)].filter((change): change is LayoutChange => Boolean(change))
      : [];
  });
}

/**
 * Captures the current position and size of unique elements for a later FLIP animation.
 *
 * Each element's `x`/`y` position and `width`/`height` are captured. Rotation and other
 * transforms are not captured or compensated. Capture before mutating the DOM, then call
 * the returned transition's `animate()` method after the browser has applied the resulting
 * layout — position changes animate via translate, and size changes via scale, both
 * additively composed on top of any authored transform.
 */
export function captureLayout(elements: Iterable<Element>, options: LayoutCaptureOptions = {}): LayoutTransition {
  const entries: LayoutEntry[] = uniqueElements(elements).map((element) => ({
    element,
    rect: measureLayout(element),
  }));
  const getKey = options.getKey;
  const captured = getKey ? createKeyMap(entries, getKey, 'captured') : undefined;

  let consumed = false;

  return {
    animate(options: LayoutAnimationOptions = {}) {
      if (consumed) throw new NecromancerConfigError('This layout transition has already been animated.');

      const { elements: committedElements, ...animationOptions } = options;
      const elements = uniqueElements(committedElements ?? entries.map(({ element }) => element));
      const changed = getKey && captured ? matchByKey(captured, elements, getKey) : matchByIdentity(entries, elements);

      consumed = true;

      return animateEach(
        changed.map(({ element }) => element),
        (_, index) => {
          // `changed` was mapped directly into the elements array above, so this index is always in range.
          const change = changed[index]!;
          const translate = `${round(change.x, 2)}px ${round(change.y, 2)}px`;
          const scale = `${round(change.scaleX, 4)} ${round(change.scaleY, 4)}`;

          return [
            { composite: 'add', scale, translate },
            { composite: 'add', scale: '1 1', translate: '0px 0px' },
          ];
        },
        animationOptions,
      );
    },
  };
}
