import { computed, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  EACH_SIGNAL,
  escapeHtml,
  extractResult,
  htmlResult,
  isHtmlResult,
  type Binding,
  type Directive,
  type HTMLResult,
} from '../internal';

const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="(\\d+)"`, 'g');

/* immutable — shared singleton for empty static lists */
const EMPTY = htmlResult('');
const NO_BINDINGS: Binding[] = [];

const toResultEntry = (value: string | HTMLResult, c: { n: number }): { bindings: Binding[]; html: string } =>
  isHtmlResult(value) ? renumber(value, c) : { bindings: NO_BINDINGS, html: escapeHtml(value) };

const toHtmlResult = (value: string | HTMLResult): HTMLResult =>
  isHtmlResult(value) ? value : htmlResult(escapeHtml(value));

function renumber(res: HTMLResult, c: { n: number }): { bindings: Binding[]; html: string } {
  const map = new Map<string, string>();
  const nb: Binding[] = [];

  for (const b of res.__bindings) {
    const oldId = b.uid;
    const newId = map.get(oldId) ?? String(c.n++);

    if (!map.has(oldId)) map.set(oldId, newId);

    nb.push({ ...b, uid: newId });
  }

  return {
    bindings: nb,
    html: res.__html
      // Re-map element binding ids.
      .replace(ATTR_ID_RE, (_, id) => `${CF_ID_ATTR}="${map.get(id) ?? id}"`)
      // Re-map numeric comment markers used by text/html placeholders.
      .replace(/<!--(\d+)-->/g, (_, id) => `<!--${map.get(id) ?? id}-->`),
  };
}

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
  const c = { n: 0 };

  for (let i = 0; i < items.length; i++) {
    const nextKey = keyFn(items[i], i);

    if (seenKeys.has(nextKey)) {
      throw new Error(`[craftit:each] Duplicate key "${String(nextKey)}" at index ${i}.`);
    }

    seenKeys.add(nextKey);
    keys.push(nextKey);

    const entry = toResultEntry(template(items[i], i), c);

    html += entry.html;
    allBindings.push(...entry.bindings);
    rendered.push(entry);
  }

  return { bindings: allBindings, html, keys, rendered };
}

/** Render loop used by the static path — no key/reconciliation metadata needed. */
function renderStatic<T>(
  items: T[],
  template: (item: T, index: number) => string | HTMLResult,
): { bindings: Binding[]; html: string } {
  let html = '';
  const allBindings: Binding[] = [];
  const c = { n: 0 };

  for (let i = 0; i < items.length; i++) {
    const entry = toResultEntry(template(items[i], i), c);

    html += entry.html;
    allBindings.push(...entry.bindings);
  }

  return { bindings: allBindings, html };
}

type ReactiveSource<T> = ReadonlySignal<T[]> | (() => T[]);
type EachSignalResult = Directive & {
  [EACH_SIGNAL]: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
};

export interface EachOptions<T> {
  fallback?: () => string | HTMLResult;
  key?: (item: T, index: number) => string | number;
  render: (item: T, index: number) => string | HTMLResult;
  /**
   * Filter predicate. Receives the item and its original array index.
   * Only items for which `select` returns `true` are rendered.
   */
  select?: (item: T, index: number) => boolean;
}

const isFunction = (value: unknown): value is (...args: any[]) => any => typeof value === 'function';

const validateEachOptions = <T>(options: EachOptions<T>): void => {
  if (!isFunction(options.render)) {
    throw new Error('[craftit:each] options.render must be a function.');
  }

  if (options.key !== undefined && !isFunction(options.key)) {
    throw new Error('[craftit:each] options.key must be a function when provided.');
  }

  if (options.select !== undefined && !isFunction(options.select)) {
    throw new Error('[craftit:each] options.select must be a function when provided.');
  }

  if (options.fallback !== undefined && !isFunction(options.fallback)) {
    throw new Error('[craftit:each] options.fallback must be a function when provided.');
  }
};

const assertArrayResult = <T>(value: T[] | unknown): T[] => {
  if (Array.isArray(value)) return value as T[];

  throw new Error('[craftit:each] source must resolve to an array.');
};

/**
 * Renders a list with keyed DOM reconciliation for reactive sources.
 * Use inside `html` tagged templates.
 *
 * For reactive sources (Signal/getter), you must provide a stable `key` function.
 *
 * For dynamic lists with click handlers, prefer event delegation on a parent node
 * (`@click` + `closest(...)`) over per-item handlers inside `each()`.
 *
 * @example
 * import { each } from '@vielzeug/craftit/directives';
 *
 * // Static array (key optional):
 * html`${each([1, 2, 3], { render: (item) => html`<li>${item}</li>` })}`
 *
 * // Reactive source (key required):
 * html`${each(items, { key: item => item.id, render: (item) => html`<li>${item.name}</li>` })}`
 *
 * // Full example:
 * html`${each(items, {
 *   fallback: () => html`<p>No items</p>`,
 *   key: item => item.id,
 *   render: (item) => html`<li>${item.name}</li>`,
 *   select: item => item.active,
 * })}`
 */
export function each<T>(source: T[], options: EachOptions<T>): HTMLResult;
export function each<T>(
  source: ReactiveSource<T>,
  options: EachOptions<T> & { key: (item: T, index: number) => string | number },
): EachSignalResult;
export function each<T>(source: T[] | ReactiveSource<T>, options: EachOptions<T>): HTMLResult | EachSignalResult {
  validateEachOptions(options);

  const { fallback, key, render, select } = options;

  if (Array.isArray(source)) {
    const filtered = select ? source.filter(select) : source;

    if (!filtered.length) {
      if (fallback) {
        const er = extractResult(toHtmlResult(fallback()));

        return htmlResult(er.html, er.bindings);
      }

      return EMPTY;
    }

    const { bindings, html } = renderStatic(filtered, render);

    return htmlResult(html, bindings);
  }

  if (!key) {
    throw new Error('[craftit:each] Reactive each() requires options.key for stable reconciliation.');
  }

  const getItems = isSignal(source) ? () => (source as ReadonlySignal<T[]>).value : (source as () => T[]);

  return {
    [EACH_SIGNAL]: computed(() => {
      const raw = assertArrayResult<T>(getItems());
      const filtered = select ? raw.filter(select) : raw;

      if (!filtered.length) {
        const er = fallback ? toHtmlResult(fallback()) : undefined;

        return er ? { ...extractResult(er), items: [], keys: [] } : { bindings: [], html: '', items: [], keys: [] };
      }

      const { bindings, html, keys, rendered } = renderKeyed(filtered, render, key);

      return { bindings, html, items: rendered, keys };
    }),
  };
}
