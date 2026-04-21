import { computed, type ReadonlySignal } from '@vielzeug/stateit';

import {
  EACH_SIGNAL,
  createMarkerIdFactory,
  escapeHtml,
  extractResult,
  htmlResult,
  isHtmlResult,
  rekeyHtmlResult,
  type Binding,
  type HTMLResult,
} from '../internal';

const toResultEntry = (value: string | HTMLResult, getNextId: () => string): { bindings: Binding[]; html: string } =>
  isHtmlResult(value) ? rekeyHtmlResult(value, getNextId) : { bindings: [], html: escapeHtml(value) };

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(value));

/** Render loop used by the reactive path (keys + rendered metadata required for reconciliation). */
function renderKeyed<T>(
  items: T[],
  template: (item: T, index: number) => string | HTMLResult,
  keyFn: (item: T, index: number) => string | number,
): {
  bindings: Binding[];
  html: string;
  keys: (string | number)[];
  rendered: Array<{ bindings: Binding[]; html: string }>;
} {
  let html = '';
  const allBindings: Binding[] = [];
  const keys: (string | number)[] = [];
  const seenKeys = new Set<string | number>();
  const rendered: Array<{ bindings: Binding[]; html: string }> = [];
  const getNextId = createMarkerIdFactory();

  for (let i = 0; i < items.length; i++) {
    const nextKey = keyFn(items[i], i);

    if (seenKeys.has(nextKey)) {
      throw new Error(`[craftit:each] Duplicate key "${String(nextKey)}" at index ${i}.`);
    }

    seenKeys.add(nextKey);
    keys.push(nextKey);

    const entry = toResultEntry(template(items[i], i), getNextId);

    html += entry.html;
    allBindings.push(...entry.bindings);
    rendered.push(entry);
  }

  return { bindings: allBindings, html, keys, rendered };
}

type EachSignalResult = {
  [EACH_SIGNAL]: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
};

export interface EachOptions<T> {
  fallback?: () => string | HTMLResult;
  key: (item: T, index: number) => string | number;
  render: (item: T, index: number) => string | HTMLResult;
}

export function each<T>(
  source: ReadonlySignal<T[]>,
  key: (item: T, index: number) => string | number,
  render: (item: T, index: number) => string | HTMLResult,
): EachSignalResult;

/**
 * Renders a list with keyed DOM reconciliation for reactive sources.
 * Use inside `html` tagged templates.
 *
 * `each()` expects a reactive signal source and a stable `key` function.
 *
 * For dynamic lists with click handlers, prefer event delegation on a parent node
 * (`@click` + `closest(...)`) over per-item handlers inside `each()`.
 *
 * @example
 * import { each } from '@vielzeug/craftit';
 *
 * // Reactive source (key required):
 * html`${each(items, { key: item => item.id, render: (item) => html`<li>${item.name}</li>` })}`
 *
 * // Full example:
 * html`${each(items, {
 *   fallback: () => html`<p>No items</p>`,
 *   key: item => item.id,
 *   render: (item) => html`<li>${item.name}</li>`,
 * })}`
 */
export function each<T>(source: ReadonlySignal<T[]>, options: EachOptions<T>): EachSignalResult;
export function each<T>(
  source: ReadonlySignal<T[]>,
  keyOrOptions: EachOptions<T> | ((item: T, index: number) => string | number),
  render?: (item: T, index: number) => string | HTMLResult,
): EachSignalResult {
  const options: EachOptions<T> =
    typeof keyOrOptions === 'function'
      ? {
          key: keyOrOptions,
          render: render!,
        }
      : keyOrOptions;
  const { fallback, key, render: renderItem } = options;

  return {
    [EACH_SIGNAL]: computed(() => {
      const raw = source.value;

      if (!raw.length) {
        const er = fallback ? toHtmlResult(fallback()) : undefined;

        return er ? { ...extractResult(er), items: [], keys: [] } : { bindings: [], html: '', items: [], keys: [] };
      }

      const { bindings, html, keys, rendered } = renderKeyed(raw, renderItem, key);

      return { bindings, html, items: rendered, keys };
    }),
  };
}
