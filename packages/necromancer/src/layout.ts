import type { LayoutAnimationOptions, LayoutCaptureOptions, LayoutTransition } from './types';

import { animateEach } from './animate-each';
import { NecromancerConfigError } from './errors';

type LayoutRect = Readonly<Pick<DOMRectReadOnly, 'x' | 'y'>>;
type LayoutEntry = Readonly<{ element: Element; rect: LayoutRect }>;
type LayoutChange = Readonly<{ element: Element; x: number; y: number }>;

function copyRect(rect: DOMRectReadOnly): LayoutRect {
  return { x: rect.x, y: rect.y };
}

function uniqueElements(elements: Iterable<Element>): Element[] {
  return [...new Set(elements)];
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

  const next = element.getBoundingClientRect();
  const x = rect.x - next.x;
  const y = rect.y - next.y;

  return x === 0 && y === 0 ? undefined : { element, x, y };
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
 * Captures the current positions of unique elements for a later FLIP animation.
 *
 * Capture before mutating the DOM, then call the returned transition's
 * `animate()` method after the browser has applied the resulting layout.
 */
export function captureLayout(elements: Iterable<Element>, options: LayoutCaptureOptions = {}): LayoutTransition {
  const entries: LayoutEntry[] = uniqueElements(elements).map((element) => ({
    element,
    rect: copyRect(element.getBoundingClientRect()),
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
          const change = changed[index];

          if (!change) {
            throw new NecromancerConfigError('The captured layout could not be matched to an animation target.');
          }

          return [
            { composite: 'add', translate: `${change.x}px ${change.y}px` },
            { composite: 'add', translate: '0px 0px' },
          ];
        },
        animationOptions,
      );
    },
  };
}
