import { computed, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from '../errors';
import { htmlResult, isHtmlResult, type Binding, type HTMLResult } from '../types/bindings';
import { escapeHtml } from '../utils/dom';
import { createMarkerIdFactory, rekeyHtmlResult } from '../utils/id';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Signal, getter function, or plain array. */
type MaybeReactiveArray<T> = ReadonlySignal<T[]> | (() => T[]) | T[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(String(value)));

function renderItems<T>(
  items: T[],
  key: (item: T, index: number) => string | number,
  render: (item: T, index: number) => string | HTMLResult,
): HTMLResult {
  const seenKeys = new Set<string | number>();
  const getNextId = createMarkerIdFactory();
  let combinedHtml = '';
  const allBindings: Binding[] = [];

  for (let i = 0; i < items.length; i++) {
    const k = key(items[i], i);

    if (seenKeys.has(k)) {
      throw new Error(CRAFTIT_ERRORS.eachDuplicateKey(String(k), i));
    }

    seenKeys.add(k);

    const raw = render(items[i], i);
    const result = isHtmlResult(raw)
      ? rekeyHtmlResult(raw, getNextId)
      : { bindings: [] as Binding[], html: escapeHtml(String(raw)) };

    combinedHtml += result.html;
    allBindings.push(...result.bindings);
  }

  return htmlResult(combinedHtml, allBindings);
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Renders a reactive list as a `ReadonlySignal<HTMLResult>`.
 *
 * Re-renders the full list whenever the source changes. Use inside `html` tagged templates.
 *
 * Accepts a signal, getter function, or plain array as the source.
 *
 * @param source   - Signal, getter function, or plain array of items.
 * @param key      - Returns a stable unique key for each item (used for duplicate detection).
 * @param render   - Returns the HTML template for each item.
 * @param fallback - Optional: rendered when the list is empty.
 *
 * @example
 * html`${each(items, (item) => item.id, (item) => html`<li>${item.name}</li>`)}`
 */
export function each<T>(
  source: MaybeReactiveArray<T>,
  key: (item: T, index: number) => string | number,
  render: (item: T, index: number) => string | HTMLResult,
  fallback?: () => string | HTMLResult,
): ReadonlySignal<HTMLResult> {
  const normalized: ReadonlySignal<T[]> = Array.isArray(source)
    ? ({ get value() { return source as T[]; } } as ReadonlySignal<T[]>)
    : isSignal(source)
      ? source
      : computed(source as () => T[]);

  return computed((): HTMLResult => {
    const items = normalized.value;

    if (items.length === 0) {
      if (!fallback) return htmlResult('');
      return toHtmlResult(fallback());
    }

    return renderItems(items, key, render);
  });
}
